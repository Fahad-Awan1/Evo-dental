import {
  DirectionalLight,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Phones and low-memory devices get lighter geometry and a lower pixel ratio.
export const lowPower =
  matchMedia('(pointer: coarse)').matches ||
  ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;

export type FrameFn = (time: number, delta: number) => void;

export interface Stage {
  scene: Scene;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  onFrame(fn: FrameFn): void;
}

/**
 * One WebGL canvas inside `host`. Renders only while the host is on screen and
 * the tab is visible, and marks the host `.is-ready` after the first frame so
 * the static fallback can fade out.
 */
export function createStage(host: HTMLElement, distance = 8): Stage {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.toneMapping = NeutralToneMapping; // keeps white enamel white (ACES would grey it)
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();

  const camera = new PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, distance);

  const key = new DirectionalLight(0xffffff, 1.7);
  key.position.set(3, 5, 4);
  const warm = new DirectionalLight(0xd9825c, 1.3); // brand-coloured bounce from below
  warm.position.set(-4, -3, 2);
  const rim = new DirectionalLight(0xffffff, 0.9);
  rim.position.set(-2, 3, -5);
  scene.add(key, warm, rim);

  host.appendChild(canvas);

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = distance * Math.max(1, 0.92 / camera.aspect); // pull back on narrow, tall slots
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  const frames: FrameFn[] = [];
  let onScreen = false;
  let raf = 0;
  let last = 0;
  let first = true;

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const time = now / 1000;
    const delta = last ? Math.min(0.05, time - last) : 0.016;
    last = time;
    for (const fn of frames) fn(time, delta);
    renderer.render(scene, camera);
    if (first) {
      first = false;
      host.classList.add('is-ready');
    }
  };
  const sync = () => {
    const run = onScreen && !document.hidden;
    if (run && !raf) {
      last = 0;
      raf = requestAnimationFrame(loop);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    },
    { rootMargin: '120px' },
  ).observe(host);
  document.addEventListener('visibilitychange', sync);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    host.classList.remove('is-ready'); // fall back to the static illustration
  });

  return { scene, camera, canvas, onFrame: (fn) => frames.push(fn) };
}
