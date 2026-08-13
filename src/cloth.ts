import * as THREE from 'three';
import { BAKED_POSE } from './bakedPose.ts';

export interface ClothPhysicsParams {
  /** 0..0.6 — how quickly motion dies away. */
  viscosity: number;
  /** Global constraint solve strength. */
  stiffness: number;
  /** Relaxation iterations per physics substep. */
  iterations: number;
  /** Laplacian smoothing that relaxes very small wrinkles. */
  smoothing: number;
  /** Optional flag-specific controls supplied by the UI preset layer. */
  pinLeft?: boolean;
  gravity?: number;
  windStrength?: number;
  windTurbulence?: number;
  structuralStrength?: number;
  shearStrength?: number;
  bendStrength?: number;
}

interface GrabState {
  indices: number[];
  weights: number[];
  /** Offset of each grabbed vertex from the grab origin, 3 floats per entry. */
  offsets: Float32Array;
  target: THREE.Vector3;
}

const SUBSTEP = 1 / 120;
const MAX_SUBSTEPS = 4;
const STRUCTURAL = 0;
const SHEAR = 1;
const BEND = 2;

/**
 * Verlet cloth simulation adapted for a flag: the left edge can be pinned,
 * gravity pulls the fabric down and a continuously varying wind field pushes
 * it out of plane. The original direct-manipulation grab behaviour remains.
 */
export class ClothSim {
  readonly cols: number;
  readonly rows: number;
  readonly count: number;
  readonly positions: Float32Array;
  private prev: Float32Array;
  private rest: Float32Array;

  // Constraints as flat arrays: [ia, ib] pairs + rest length + base/type data.
  private cA: Int32Array;
  private cB: Int32Array;
  private cRest: Float32Array;
  private cMul: Float32Array;
  private cType: Uint8Array;

  /** 4-neighborhood for laplacian smoothing: -1 padded. */
  private neighbors: Int32Array;

  private grab: GrabState | null = null;
  private accumulator = 0;
  private simTime = 0;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly segX: number,
    readonly segY: number,
  ) {
    this.cols = segX + 1;
    this.rows = segY + 1;
    this.count = this.cols * this.rows;
    this.positions = new Float32Array(this.count * 3);
    this.prev = new Float32Array(this.count * 3);
    this.rest = new Float32Array(this.count * 3);

    this.initPositions();

    // Structural, shear and bend constraints are separated so flag presets
    // can tune each response independently while keeping the original solver.
    const a: number[] = [];
    const b: number[] = [];
    const mul: number[] = [];
    const type: number[] = [];
    const idx = (x: number, y: number) => y * this.cols + x;
    const push = (ia: number, ib: number, base: number, kind: number) => {
      a.push(ia); b.push(ib); mul.push(base); type.push(kind);
    };

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (x + 1 < this.cols) push(idx(x, y), idx(x + 1, y), 1.0, STRUCTURAL);
        if (y + 1 < this.rows) push(idx(x, y), idx(x, y + 1), 1.0, STRUCTURAL);
        if (x + 1 < this.cols && y + 1 < this.rows) {
          push(idx(x, y), idx(x + 1, y + 1), 0.85, SHEAR);
          push(idx(x + 1, y), idx(x, y + 1), 0.85, SHEAR);
        }
        if (x + 2 < this.cols) push(idx(x, y), idx(x + 2, y), 0.35, BEND);
        if (y + 2 < this.rows) push(idx(x, y), idx(x, y + 2), 0.35, BEND);
      }
    }

    this.cA = new Int32Array(a);
    this.cB = new Int32Array(b);
    this.cMul = new Float32Array(mul);
    this.cType = new Uint8Array(type);
    this.cRest = new Float32Array(a.length);
    this.computeRestLengths();

    this.neighbors = new Int32Array(this.count * 4).fill(-1);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = idx(x, y) * 4;
        this.neighbors[i + 0] = x > 0 ? idx(x - 1, y) : -1;
        this.neighbors[i + 1] = x + 1 < this.cols ? idx(x + 1, y) : -1;
        this.neighbors[i + 2] = y > 0 ? idx(x, y - 1) : -1;
        this.neighbors[i + 3] = y + 1 < this.rows ? idx(x, y + 1) : -1;
      }
    }
  }

  /** Resample the original hand-arranged starting pose onto the active grid. */
  private initPositions() {
    const bp = BAKED_POSE;
    const bc = bp.cols;
    const br = bp.rows;
    const sx = this.width / bp.width;
    const sy = this.height / bp.height;
    const sz = (sx + sy) / 2;
    let k = 0;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const gu = (x / this.segX) * (bc - 1);
        const gv = (y / this.segY) * (br - 1);
        const x0 = Math.min(bc - 2, Math.floor(gu));
        const y0 = Math.min(br - 2, Math.floor(gv));
        const fx = gu - x0;
        const fy = gv - y0;

        for (let c = 0; c < 3; c++) {
          const i00 = (y0 * bc + x0) * 3 + c;
          const i10 = (y0 * bc + x0 + 1) * 3 + c;
          const i01 = ((y0 + 1) * bc + x0) * 3 + c;
          const i11 = ((y0 + 1) * bc + x0 + 1) * 3 + c;
          const v0 = bp.data[i00] * (1 - fx) + bp.data[i10] * fx;
          const v1 = bp.data[i01] * (1 - fx) + bp.data[i11] * fx;
          const s = c === 0 ? sx : c === 1 ? sy : sz;
          this.positions[k + c] = (v0 * (1 - fy) + v1 * fy) * s;
        }
        k += 3;
      }
    }

    this.prev.set(this.positions);
    this.rest.set(this.positions);
  }

  private computeRestLengths() {
    const stepX = this.width / this.segX;
    const stepY = this.height / this.segY;
    for (let c = 0; c < this.cA.length; c++) {
      const ia = this.cA[c], ib = this.cB[c];
      const ax = ia % this.cols, ay = Math.floor(ia / this.cols);
      const bx = ib % this.cols, by = Math.floor(ib / this.cols);
      const dx = (ax - bx) * stepX;
      const dy = (ay - by) * stepY;
      this.cRest[c] = Math.hypot(dx, dy);
    }
  }

  reset() {
    this.initPositions();
    this.grab = null;
    this.accumulator = 0;
    this.simTime = 0;
  }

  /** Give a random gentle impulse. */
  poke(strength = 0.5) {
    const p = this.positions;
    const ci = Math.floor(Math.random() * this.count);
    const cx = p[ci * 3], cy = p[ci * 3 + 1], cz = p[ci * 3 + 2];
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize().multiplyScalar(strength * 0.09);
    const radius = Math.max(this.width, this.height) * 0.28;

    for (let i = 0; i < this.count; i++) {
      const dx = p[i * 3] - cx, dy = p[i * 3 + 1] - cy, dz = p[i * 3 + 2] - cz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius) continue;
      const w = 1 - d / radius;
      const s = w * w * (3 - 2 * w);
      this.prev[i * 3] -= dir.x * s;
      this.prev[i * 3 + 1] -= dir.y * s;
      this.prev[i * 3 + 2] -= dir.z * s;
    }
  }

  /** Begin a grab around a world-space point. Returns false if nothing is near. */
  startGrab(point: THREE.Vector3, radius: number): boolean {
    const p = this.positions;
    const indices: number[] = [];
    const weights: number[] = [];
    const offsets: number[] = [];
    let best = Infinity;

    for (let i = 0; i < this.count; i++) {
      const dx = p[i * 3] - point.x;
      const dy = p[i * 3 + 1] - point.y;
      const dz = p[i * 3 + 2] - point.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      best = Math.min(best, d);
      if (d > radius) continue;
      const t = 1 - d / radius;
      const w = t * t * (3 - 2 * t);
      indices.push(i);
      weights.push(w);
      offsets.push(dx, dy, dz);
    }

    if (indices.length === 0 || best > radius) return false;
    this.grab = {
      indices,
      weights,
      offsets: new Float32Array(offsets),
      target: point.clone(),
    };
    return true;
  }

  moveGrab(target: THREE.Vector3) {
    if (this.grab) this.grab.target.copy(target);
  }

  endGrab() {
    this.grab = null;
  }

  get isGrabbing() {
    return this.grab !== null;
  }

  private cavityScratch: Float32Array | null = null;

  /** Compute a per-vertex concavity term used for fold shading. */
  computeCavity(normals: ArrayLike<number>, out: Float32Array, gain = 6) {
    const p = this.positions;
    const nb = this.neighbors;
    const n = this.count;
    const invStep = 1 / Math.min(this.width / this.segX, this.height / this.segY);
    if (!this.cavityScratch || this.cavityScratch.length < n) {
      this.cavityScratch = new Float32Array(n);
    }
    const tmp = this.cavityScratch;

    for (let i = 0; i < n; i++) {
      let ax = 0, ay = 0, az = 0, cnt = 0;
      for (let j = 0; j < 4; j++) {
        const ni = nb[i * 4 + j];
        if (ni < 0) continue;
        ax += p[ni * 3]; ay += p[ni * 3 + 1]; az += p[ni * 3 + 2];
        cnt++;
      }
      if (cnt === 0) { tmp[i] = 0; continue; }
      const inv = 1 / cnt;
      const lx = ax * inv - p[i * 3];
      const ly = ay * inv - p[i * 3 + 1];
      const lz = az * inv - p[i * 3 + 2];
      const c = (lx * normals[i * 3] + ly * normals[i * 3 + 1] + lz * normals[i * 3 + 2]) * invStep;
      tmp[i] = Math.min(1, Math.max(0, c * gain));
    }

    for (let i = 0; i < n; i++) {
      let sum = 0, cnt = 0;
      for (let j = 0; j < 4; j++) {
        const ni = nb[i * 4 + j];
        if (ni < 0) continue;
        sum += tmp[ni];
        cnt++;
      }
      out[i] = cnt > 0 ? tmp[i] * 0.5 + (sum / cnt) * 0.5 : tmp[i];
    }
  }

  step(dt: number, params: ClothPhysicsParams) {
    this.accumulator += Math.min(dt, 0.05);
    let steps = 0;
    while (this.accumulator >= SUBSTEP && steps < MAX_SUBSTEPS) {
      this.substep(params);
      this.accumulator -= SUBSTEP;
      steps++;
    }
    if (steps === MAX_SUBSTEPS) this.accumulator = 0;
  }

  private substep(params: ClothPhysicsParams) {
    const p = this.positions;
    const prev = this.prev;
    const n = this.count;
    this.simTime += SUBSTEP;

    const damp = Math.pow(1 - Math.min(params.viscosity, 0.99), SUBSTEP * 60);
    const gravity = params.gravity ?? 0;
    const windStrength = params.windStrength ?? 0;
    const turbulence = params.windTurbulence ?? 0;
    const dt2 = SUBSTEP * SUBSTEP;

    // Verlet integration plus external flag forces. Wind acts primarily out of
    // plane and grows gently toward the free edge, producing a readable wave.
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      const curX = p[k], curY = p[k + 1], curZ = p[k + 2];
      const velX = (curX - prev[k]) * damp;
      const velY = (curY - prev[k + 1]) * damp;
      const velZ = (curZ - prev[k + 2]) * damp;
      prev[k] = curX; prev[k + 1] = curY; prev[k + 2] = curZ;

      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      const u = col / Math.max(1, this.cols - 1);
      const v = row / Math.max(1, this.rows - 1);
      const wave = Math.sin(this.simTime * (3.5 + turbulence * 2.2) + v * 8.0 + u * 3.0);
      const cross = Math.sin(this.simTime * 5.1 + v * 13.0 - u * 4.0);
      const flutter = turbulence * (wave * 0.7 + cross * 0.3);
      const edgeGain = 0.35 + u * 0.65;
      const windZ = windStrength * edgeGain * (1.25 + flutter * 0.65);
      const windY = windStrength * turbulence * wave * 0.12;

      p[k] = curX + velX;
      p[k + 1] = curY + velY + (-gravity * 2.2 + windY) * dt2;
      p[k + 2] = curZ + velZ + windZ * 3.0 * dt2;
    }

    this.applyPins(params.pinLeft ?? false);

    if (params.smoothing > 0) {
      const k = params.smoothing * 0.5;
      const nb = this.neighbors;
      for (let i = 0; i < n; i++) {
        if ((params.pinLeft ?? false) && i % this.cols === 0) continue;
        let ax = 0, ay = 0, az = 0, cnt = 0;
        for (let j = 0; j < 4; j++) {
          const ni = nb[i * 4 + j];
          if (ni < 0) continue;
          ax += p[ni * 3]; ay += p[ni * 3 + 1]; az += p[ni * 3 + 2];
          cnt++;
        }
        if (cnt === 0) continue;
        const inv = 1 / cnt;
        p[i * 3] += (ax * inv - p[i * 3]) * k;
        p[i * 3 + 1] += (ay * inv - p[i * 3 + 1]) * k;
        p[i * 3 + 2] += (az * inv - p[i * 3 + 2]) * k;
      }
      this.applyPins(params.pinLeft ?? false);
    }

    const iters = Math.max(1, Math.round(params.iterations));
    const stiff = params.stiffness;
    const structural = params.structuralStrength ?? 1;
    const shear = params.shearStrength ?? 1;
    const bend = params.bendStrength ?? 1;
    const nc = this.cA.length;

    for (let it = 0; it < iters; it++) {
      for (let c = 0; c < nc; c++) {
        const ia = this.cA[c] * 3, ib = this.cB[c] * 3;
        const dx = p[ib] - p[ia];
        const dy = p[ib + 1] - p[ia + 1];
        const dz = p[ib + 2] - p[ia + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 1e-9) continue;

        const typeStrength = this.cType[c] === STRUCTURAL
          ? structural
          : this.cType[c] === SHEAR
            ? shear
            : bend;
        const solveStrength = Math.min(1.2, stiff * this.cMul[c] * typeStrength);
        const diff = ((d - this.cRest[c]) / d) * 0.5 * solveStrength;
        const ox = dx * diff, oy = dy * diff, oz = dz * diff;
        p[ia] += ox; p[ia + 1] += oy; p[ia + 2] += oz;
        p[ib] -= ox; p[ib + 1] -= oy; p[ib + 2] -= oz;
      }
      this.applyGrab();
      this.applyPins(params.pinLeft ?? false);
    }
  }

  private applyPins(pinLeft: boolean) {
    if (!pinLeft) return;
    const p = this.positions;
    const prev = this.prev;
    const rest = this.rest;
    for (let y = 0; y < this.rows; y++) {
      const i = y * this.cols * 3;
      p[i] = rest[i];
      p[i + 1] = rest[i + 1];
      p[i + 2] = rest[i + 2];
      prev[i] = rest[i];
      prev[i + 1] = rest[i + 1];
      prev[i + 2] = rest[i + 2];
    }
  }

  private applyGrab() {
    const g = this.grab;
    if (!g) return;
    const p = this.positions;
    for (let k = 0; k < g.indices.length; k++) {
      const i = g.indices[k] * 3;
      const w = g.weights[k];
      const tx = g.target.x + g.offsets[k * 3];
      const ty = g.target.y + g.offsets[k * 3 + 1];
      const tz = g.target.z + g.offsets[k * 3 + 2];
      p[i] += (tx - p[i]) * w;
      p[i + 1] += (ty - p[i + 1]) * w;
      p[i + 2] += (tz - p[i + 2]) * w;
    }
  }
}
