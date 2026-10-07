import gsap from 'gsap';
import { Group, type Object3D } from 'three';
import { createStage } from './stage';
import { createArch, createImplant, createTooth, createWhitening } from './models';

/**
 * Single floating model. Spins slowly, leans towards the pointer and can be
 * dragged to rotate. Model is chosen with `data-model` on the host element.
 */
export function mountViewer(host: HTMLElement) {
  const stage = createStage(host, 8);
  const kind = host.dataset.model ?? 'tooth';

  let model: Object3D;
  let autoSpin = 0.35;
  let tick: ((time: number) => void) | null = null;
  if (kind === 'implant') {
    model = createImplant().group;
  } else if (kind === 'aligner' || kind === 'braces') {
    model = createArch({ shell: kind === 'aligner', brackets: kind === 'braces' }).group;
    autoSpin = 0.22;
  } else if (kind === 'sparkle') {
    const w = createWhitening();
    w.setWhite(1);
    tick = w.update;
    model = w.group;
  } else {
    model = createTooth().group;
  }

  const pivot = new Group();
  pivot.add(model);
  stage.scene.add(pivot);
  gsap.from(pivot.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 1.6, ease: 'elastic.out(1, 0.6)' });

  let spin = -0.5;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  let leanX = 0;
  let leanY = 0;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      leanY = (e.clientX / window.innerWidth - 0.5) * 0.7;
      leanX = (e.clientY / window.innerHeight - 0.5) * 0.4;
    },
    { passive: true },
  );

  const canvas = stage.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    velocity = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    velocity = (e.clientX - lastX) * 0.012;
    spin += velocity;
    lastX = e.clientX;
  });
  const release = () => (dragging = false);
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  let curX = 0;
  let curY = 0;
  stage.onFrame((time, delta) => {
    if (!dragging) {
      spin += velocity + delta * autoSpin;
      velocity *= 0.94;
    }
    curX += (leanX - curX) * 0.06;
    curY += (leanY - curY) * 0.06;
    pivot.rotation.set(0.12 + curX, spin + curY, 0);
    pivot.position.y = Math.sin(time * 1.1) * 0.09;
    tick?.(time);
  });
}
