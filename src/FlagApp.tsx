import { useEffect, useRef } from 'react';
import { useDialKitController, DialRoot } from 'dialkit';
import { HoloApp, type HoloParams } from './scene.ts';
import {
  ENVIRONMENT_VALUES,
  FINISH_VALUES,
  MATERIAL_ENGINE_VALUES,
  MATERIAL_VISIBLE_VALUES,
  PHYSICS_ENGINE_VALUES,
  PHYSICS_VISIBLE_VALUES,
  RENDER_DEFAULTS,
} from './flagPresets.ts';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Unable to load ${url}`));
    img.src = url;
  });
}

function loadFile(file: File, onLoad: (img: HTMLImageElement) => void) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    onLoad(img);
  };
  img.src = url;
}

export default function FlagApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HoloApp | null>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const bumpInputRef = useRef<HTMLInputElement>(null);

  const dial = useDialKitController(
    'FLAG',
    {
      performance: {
        type: 'select' as const,
        options: ['High', 'Medium', 'Low'],
        default: 'High',
      },
      material: {
        preset: {
          type: 'select' as const,
          options: ['Polyester', 'Cotton', 'Satin', 'Nylon', 'Silk', 'Vinyl', 'Canvas'],
          default: 'Polyester',
        },
        finish: {
          type: 'select' as const,
          options: ['Glossy', 'Satin', 'Matte'],
          default: 'Satin',
        },
        baseColor: '#f4f4f2',
        specTint: [0.08, 0, 1, 0.01],
        bump: [0.72, 0, 3, 0.01],
        bumpTiling: [5, 1, 12, 0.5],
        uploadBump: { type: 'action' as const, label: 'Upload bump map' },
      },
      physics: {
        _collapsed: false,
        preset: {
          type: 'select' as const,
          options: ['Silk flag', 'Heavy cotton banner', 'Vinyl', 'Thin football flag'],
          default: 'Thin football flag',
        },
        pinLeft: true,
        gravity: [0.34, 0, 1.5, 0.01],
        windStrength: [0.78, 0, 2, 0.01],
        windTurbulence: [0.88, 0, 2, 0.01],
        viscosity: [0.08, 0, 0.6, 0.005],
        stiffness: [0.78, 0.2, 1, 0.01],
        iterations: [10, 1, 14, 1],
        smoothing: [0.012, 0, 0.3, 0.002],
        grabRadius: [0.27, 0.05, 1.2, 0.01],
        releaseFlag: { type: 'action' as const, label: 'Release flag' },
      },
      images: {
        _collapsed: true,
        useImage: false,
        edit: false,
        scale: [0.35, 0.02, 2.5, 0.01],
        rotation: [0, -180, 180, 1],
        opacity: [1, 0, 1, 0.01],
        cornerRadius: [0, 0, 1, 0.01],
        uploadArtwork: { type: 'action' as const, label: 'Upload artwork' },
        addOverlay: { type: 'action' as const, label: 'Add overlay / SVG' },
        clearImages: { type: 'action' as const, label: 'Clear artwork' },
      },
      render: {
        _collapsed: true,
        environmentPreset: {
          type: 'select' as const,
          options: ['Studio', 'Outdoor', 'Dark', 'Transparent'],
          default: RENDER_DEFAULTS.environmentPreset,
        },
        background: { type: 'color' as const, default: RENDER_DEFAULTS.background },
        exposure: [RENDER_DEFAULTS.exposure, 0.2, 2.5, 0.01],
        environment: [RENDER_DEFAULTS.environment, 0, 3, 0.01],
        bloom: [RENDER_DEFAULTS.bloom, 0, 1.2, 0.01],
        bloomThreshold: [RENDER_DEFAULTS.bloomThreshold, 0, 2, 0.01],
        noise: [RENDER_DEFAULTS.noise, 0, 0.6, 0.005],
        toneMapping: {
          type: 'select' as const,
          options: ['AgX', 'ACES', 'Neutral'],
          default: RENDER_DEFAULTS.toneMapping,
        },
        occlusion: RENDER_DEFAULTS.occlusion,
        occlusionStrength: [RENDER_DEFAULTS.occlusionStrength, 0, 1, 0.01],
        dof: RENDER_DEFAULTS.dof,
        dofAperture: [RENDER_DEFAULTS.dofAperture, 1, 150, 1],
        dofBlur: [RENDER_DEFAULTS.dofBlur, 0, 0.15, 0.001],
        dofRange: [RENDER_DEFAULTS.dofRange, 0, 3, 0.01],
        pickFocus: { type: 'action' as const, label: 'Pick focus point' },
        autoFocus: { type: 'action' as const, label: 'Auto focus' },
      },
      exportPNG: { type: 'action' as const, label: 'Export PNG' },
      exportPNGClear: { type: 'action' as const, label: 'Export PNG (no background)' },
      resetCloth: { type: 'action' as const, label: 'Reset flag' },
      poke: { type: 'action' as const, label: 'Gust' },
    },
    {
      id: 'flag',
      onAction: (path: string) => {
        const app = appRef.current;
        if (!app) return;
        const action = path.split('.').pop();
        if (action === 'resetCloth') {
          dial.setValues({ physics: { pinLeft: true } } as never);
          app.resetCloth();
        } else if (action === 'releaseFlag') {
          dial.setValues({ physics: { pinLeft: false } } as never);
        } else if (action === 'poke') {
          app.poke();
        } else if (action === 'exportPNG') {
          app.exportPNG(dial.values.render.environmentPreset === 'Transparent');
        } else if (action === 'exportPNGClear') {
          app.exportPNG(true);
        } else if (action === 'uploadArtwork') {
          artworkInputRef.current?.click();
        } else if (action === 'addOverlay') {
          overlayInputRef.current?.click();
        } else if (action === 'uploadBump') {
          bumpInputRef.current?.click();
        } else if (action === 'clearImages') {
          app.clearImages();
          dial.setValues({ images: { useImage: false } } as never);
        } else if (action === 'pickFocus') {
          app.startPickFocus();
        } else if (action === 'autoFocus') {
          app.clearPickFocus();
        }
      },
    },
  );

  const params = dial.values;

  useEffect(() => {
    if (!hostRef.current) return;
    const app = new HoloApp(hostRef.current);
    appRef.current = app;
    app.onDecalSelect = (scale, rotation) => {
      dial.setValues({ images: { scale, rotation } } as never);
    };

    // Keep the original starter artwork/bump so the branch has a useful
    // visual immediately, but render it with the new non-holographic presets.
    Promise.all([loadImage('/holo-bg-2.jpg'), loadImage('/bump-scratches.jpg')])
      .then(([artwork, bump]) => {
        if (appRef.current !== app) return;
        app.setBumpMap(bump);
        app.setClothImage(artwork);
        dial.setValues({ images: { useImage: true } } as never);
        app.reveal();
      })
      .catch(() => app.reveal());

    return () => {
      app.dispose();
      appRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const materialPreset = params.material.preset;
  const initialMaterial = useRef(true);
  useEffect(() => {
    if (initialMaterial.current) {
      initialMaterial.current = false;
      return;
    }
    const values = MATERIAL_VISIBLE_VALUES[materialPreset];
    if (values) dial.setValues({ material: values } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialPreset]);

  const physicsPreset = params.physics.preset;
  const initialPhysics = useRef(true);
  useEffect(() => {
    if (initialPhysics.current) {
      initialPhysics.current = false;
      return;
    }
    const values = PHYSICS_VISIBLE_VALUES[physicsPreset];
    if (values) dial.setValues({ physics: values } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physicsPreset]);

  const environmentPreset = params.render.environmentPreset;
  const initialEnvironment = useRef(true);
  useEffect(() => {
    if (initialEnvironment.current) {
      initialEnvironment.current = false;
      return;
    }
    const values = ENVIRONMENT_VALUES[environmentPreset];
    if (values) dial.setValues({ render: values } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentPreset]);

  // Compose the renderer payload. The controls removed from the UI are now
  // populated by the real-world material presets instead of exposed sliders.
  useEffect(() => {
    const finish = FINISH_VALUES[params.material.finish] ?? FINISH_VALUES.Satin;
    const materialEngine = MATERIAL_ENGINE_VALUES[params.material.preset] ?? MATERIAL_ENGINE_VALUES.Polyester;
    const physicsEngine = PHYSICS_ENGINE_VALUES[params.physics.preset] ?? PHYSICS_ENGINE_VALUES['Thin football flag'];
    appRef.current?.applyParams({
      ...params,
      material: { ...params.material, ...materialEngine, ...finish },
      physics: { ...params.physics, ...physicsEngine },
    } as unknown as HoloParams);
  });

  return (
    <>
      <div id="canvas-host" ref={hostRef} />
      <input
        ref={artworkInputRef}
        type="file"
        accept="image/*,.svg"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            loadFile(file, (img) => {
              appRef.current?.setClothImage(img);
              dial.setValues({ images: { useImage: true } } as never);
            });
          }
          e.target.value = '';
        }}
      />
      <input
        ref={overlayInputRef}
        type="file"
        accept="image/*,.svg"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file, (img) => appRef.current?.addDecal(img));
          e.target.value = '';
        }}
      />
      <input
        ref={bumpInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file, (img) => appRef.current?.setBumpMap(img));
          e.target.value = '';
        }}
      />
      <DialRoot position="top-right" defaultOpen productionEnabled />
    </>
  );
}
