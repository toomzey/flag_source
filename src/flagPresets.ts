export const RENDER_DEFAULTS = {
  environmentPreset: 'Studio',
  background: '#0B0C12',
  exposure: 0.82,
  environment: 0.45,
  bloom: 0,
  bloomThreshold: 0,
  noise: 0,
  toneMapping: 'Neutral',
  occlusion: true,
  occlusionStrength: 0.34,
  dof: false,
  dofAperture: 73,
  dofBlur: 0.051,
  dofRange: 0.96,
};

export const FINISH_VALUES: Record<string, Record<string, number>> = {
  Glossy: { roughness: 0.16, clearcoat: 0.72, coatRoughness: 0.12 },
  Satin: { roughness: 0.38, clearcoat: 0.2, coatRoughness: 0.34 },
  Matte: { roughness: 0.7, clearcoat: 0.02, coatRoughness: 0.72 },
};

export const MATERIAL_VISIBLE_VALUES: Record<string, Record<string, unknown>> = {
  Polyester: { finish: 'Matte', baseColor: '#F4F4F2', specTint: 0, bump: 0.48, bumpTiling: 5 },
  Cotton: { finish: 'Matte', baseColor: '#e9e4da', specTint: 0.04, bump: 1.2, bumpTiling: 4 },
  Satin: { finish: 'Glossy', baseColor: '#ece8e2', specTint: 0.12, bump: 0.34, bumpTiling: 7 },
  Nylon: { finish: 'Satin', baseColor: '#f0f1f3', specTint: 0.1, bump: 0.52, bumpTiling: 7 },
  Silk: { finish: 'Glossy', baseColor: '#f5f1ec', specTint: 0.16, bump: 0.28, bumpTiling: 8 },
  Vinyl: { finish: 'Glossy', baseColor: '#f2f2f2', specTint: 0.06, bump: 0.08, bumpTiling: 3 },
  Canvas: { finish: 'Matte', baseColor: '#ded8cb', specTint: 0.03, bump: 1.7, bumpTiling: 3 },
};

export const MATERIAL_ENGINE_VALUES: Record<string, Record<string, number>> = {
  Polyester: { holoIntensity: 0, holoScale: 80, bandFreq: 1, saturation: 0, hueShift: 0, sparkle: 0, iridescence: 0, metalness: 0.02, sheen: 0.16 },
  Cotton: { holoIntensity: 0, holoScale: 80, bandFreq: 1, saturation: 0, hueShift: 0, sparkle: 0, iridescence: 0, metalness: 0, sheen: 0.22 },
  Satin: { holoIntensity: 0, holoScale: 80, bandFreq: 1, saturation: 0, hueShift: 0, sparkle: 0, iridescence: 0.04, metalness: 0.01, sheen: 0.46 },
  Nylon: { holoIntensity: 0, holoScale: 80, bandFreq: 1, saturation: 0, hueShift: 0, sparkle: 0, iridescence: 0, metalness: 0.01, sheen: 0.12 },
  Silk: { holoIntensity: 0, holoScale: 80, bandFreq: 1, saturation: 0, hueShift: 0, sparkle: 0, iridescence: 0.05, metalness: 0, sheen: 0.62 },
  Vinyl: { holoIntensity: 0, holoScale: 80, bandFreq: 1, saturation: 0, hueShift: 0, sparkle: 0, iridescence: 0, metalness: 0, sheen: 0 },
  Canvas: { holoIntensity: 0, holoScale: 80, bandFreq: 1, saturation: 0, hueShift: 0, sparkle: 0, iridescence: 0, metalness: 0, sheen: 0.12 },
};

export const PHYSICS_VISIBLE_VALUES: Record<string, Record<string, unknown>> = {
  'Silk flag': { viscosity: 0.12, stiffness: 0.68, iterations: 9, smoothing: 0.018, flatness: 0.58, gravity: 0.42, windStrength: 0.62, windWaveStrength: 0.95, windWaveFrequency: 3.5, windTurbulence: 0.38 },
  'Heavy cotton banner': { viscosity: 0.42, stiffness: 0.95, iterations: 14, smoothing: 0.06, flatness: 0.78, gravity: 0.72, windStrength: 0.38, windWaveStrength: 0.55, windWaveFrequency: 2.25, windTurbulence: 0.18 },
  Vinyl: { viscosity: 0.28, stiffness: 1, iterations: 14, smoothing: 0.035, flatness: 0.9, gravity: 0.58, windStrength: 0.34, windWaveStrength: 0.42, windWaveFrequency: 1.75, windTurbulence: 0.1 },
  'Thin football flag': { viscosity: 0, stiffness: 0.2, iterations: 4, smoothing: 0.012, flatness: 0, gravity: 0, windStrength: 0.21, windWaveStrength: 0.67, windWaveFrequency: 7.5, windTurbulence: 2 },
};

export const PHYSICS_ENGINE_VALUES: Record<string, Record<string, number>> = {
  'Silk flag': { structuralStrength: 0.74, shearStrength: 0.68, bendStrength: 0.2 },
  'Heavy cotton banner': { structuralStrength: 1.05, shearStrength: 1, bendStrength: 0.78 },
  Vinyl: { structuralStrength: 1.14, shearStrength: 1.1, bendStrength: 0.98 },
  'Thin football flag': { structuralStrength: 0.84, shearStrength: 0.76, bendStrength: 0.14 },
};

export const ENVIRONMENT_VALUES: Record<string, Record<string, unknown>> = {
  Studio: {
    background: '#0B0C12', exposure: 0.82, environment: 0.45, bloom: 0,
    bloomThreshold: 0, noise: 0, toneMapping: 'Neutral', occlusion: true,
    occlusionStrength: 0.34, dof: false, dofAperture: 73, dofBlur: 0.051,
    dofRange: 0.96,
  },
  Outdoor: { background: '#b9c8d7', exposure: 0.88, environment: 1.28, bloom: 0.02, noise: 0.08 },
  Dark: { background: '#050608', exposure: 0.46, environment: 0.48, bloom: 0.06, noise: 0.24 },
  Transparent: { background: '#0b0c12', exposure: 0.68, environment: 0.9, bloom: 0.02, noise: 0.06 },
};
