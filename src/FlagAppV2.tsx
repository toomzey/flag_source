import { useEffect, useRef } from 'react';
import { useDialKitController, DialRoot } from 'dialkit';
import { HoloApp, type HoloParams } from './scene.ts';
import { FLAG_CONTROLS } from './flagControls.ts';
import {
  ENVIRONMENT_VALUES,
  FINISH_VALUES,
  MATERIAL_ENGINE_VALUES,
  MATERIAL_VISIBLE_VALUES,
  PHYSICS_ENGINE_VALUES,
  PHYSICS_VISIBLE_VALUES,
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

export default function FlagAppV2() {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HoloApp | null>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const bumpInputRef = useRef<HTMLInputElement>(null);

  const dial = useDialKitController('FLAG', FLAG_CONTROLS, {
    id: 'flag',
    onAction: (path: string) => {
      const app = appRef.current;
      if (!app) return;
      const action = path.split('.').pop();
      if (action === 'resetCloth') app.resetCloth();
      else if (action === 'poke') app.poke();
      else if (action === 'exportPNG') app.exportPNG(dial.values.render.environmentPreset === 'Transparent');
      else if (action === 'exportPNGClear') app.exportPNG(true);
      else if (action === 'uploadArtwork') artworkInputRef.current?.click();
      else if (action === 'addOverlay') overlayInputRef.current?.click();
      else if (action === 'uploadBump') bumpInputRef.current?.click();
      else if (action === 'clearImages') {
        app.clearImages();
        dial.setValues({ images: { useImage: false } } as never);
      } else if (action === 'pickFocus') app.startPickFocus();
      else if (action === 'autoFocus') app.clearPickFocus();
    },
  });

  const params = dial.values;

  useEffect(() => {
    if (!hostRef.current) return;
    const app = new HoloApp(hostRef.current);
    appRef.current = app;
    app.onDecalSelect = (scale, rotation) => {
      dial.setValues({ images: { scale, rotation } } as never);
    };

    const starter = loadImage('/default-flag.svg').catch(() => loadImage('/holo-bg-2.jpg'));
    Promise.all([starter, loadImage('/bump-scratches.jpg')])
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

  const initialMaterial = useRef(true);
  useEffect(() => {
    if (initialMaterial.current) {
      initialMaterial.current = false;
      return;
    }
    const values = MATERIAL_VISIBLE_VALUES[params.material.preset];
    if (values) dial.setValues({ material: values } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.material.preset]);

  const initialPhysics = useRef(true);
  useEffect(() => {
    if (initialPhysics.current) {
      initialPhysics.current = false;
      return;
    }
    const values = PHYSICS_VISIBLE_VALUES[params.physics.preset];
    if (values) dial.setValues({ physics: values } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.physics.preset]);

  const initialEnvironment = useRef(true);
  useEffect(() => {
    if (initialEnvironment.current) {
      initialEnvironment.current = false;
      return;
    }
    const values = ENVIRONMENT_VALUES[params.render.environmentPreset];
    if (values) dial.setValues({ render: values } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.render.environmentPreset]);

  useEffect(() => {
    const finish = FINISH_VALUES[params.material.finish] ?? FINISH_VALUES.Satin;
    const materialEngine = MATERIAL_ENGINE_VALUES[params.material.preset] ?? MATERIAL_ENGINE_VALUES.Polyester;
    const physicsEngine = PHYSICS_ENGINE_VALUES[params.physics.preset] ?? PHYSICS_ENGINE_VALUES['Thin football flag'];
    appRef.current?.applyParams({
      ...params,
      material: { ...params.material, ...materialEngine, ...finish },
      physics: { ...params.physics, ...physicsEngine, pinLeft: true },
    } as unknown as HoloParams);
  });

  return (
    <>
      <div id="canvas-host" ref={hostRef} />
      <input ref={artworkInputRef} type="file" accept="image/*,.svg" style={{ display: 'none' }} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) loadFile(file, (img) => {
          appRef.current?.setClothImage(img);
          dial.setValues({ images: { useImage: true } } as never);
        });
        e.target.value = '';
      }} />
      <input ref={overlayInputRef} type="file" accept="image/*,.svg" style={{ display: 'none' }} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) loadFile(file, (img) => appRef.current?.addDecal(img));
        e.target.value = '';
      }} />
      <input ref={bumpInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) loadFile(file, (img) => appRef.current?.setBumpMap(img));
        e.target.value = '';
      }} />
      <DialRoot position="top-right" defaultOpen productionEnabled />
    </>
  );
}
