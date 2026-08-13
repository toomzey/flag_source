import { RENDER_DEFAULTS } from './flagPresets.ts';

// DialKit contextually types slider arrays when they are inline. Keeping the
// config in its own module is easier to maintain, so use a narrow boundary
// cast here and keep the application values strongly shaped at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FLAG_CONTROLS: any = {
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
    flatness: [0.66, 0, 1, 0.01],
    gravity: [0.34, 0, 1.5, 0.01],
    windStrength: [0.78, 0, 2, 0.01],
    windWaveStrength: [0.9, 0, 2, 0.01],
    windWaveFrequency: [3, 1, 8, 0.25],
    windTurbulence: [0.52, 0, 2, 0.01],
    viscosity: [0.08, 0, 0.6, 0.005],
    stiffness: [0.78, 0.2, 1, 0.01],
    iterations: [10, 1, 14, 1],
    smoothing: [0.012, 0, 0.3, 0.002],
    grabRadius: [0.27, 0.05, 1.2, 0.01],
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
};
