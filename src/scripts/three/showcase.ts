import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Group, type Object3D } from 'three';
import { createStage } from './stage';
import { createArch, createImplant, createWhitening } from './models';

const OFFSCREEN = 4.8; // world units above/below the camera's view

/**
 * Scroll-driven treatment showcase. The section is tall and its inner panel is
 * `position: sticky`, so scrolling scrubs one timeline that swaps the 3D models
 * and the matching copy: implant assembles, aligner tray seats, a stained tooth
 * whitens, and braces are fitted.
 */
export function mountShowcase(section: HTMLElement, host: HTMLElement) {
  const stage = createStage(host, 8.6);
  const panels = Array.from(section.querySelectorAll<HTMLElement>('[data-step]'));
  const countEl = section.querySelector<HTMLElement>('[data-showcase-count]');
  const barEl = section.querySelector<HTMLElement>('[data-showcase-bar]');

  const implant = createImplant();
  const aligner = createArch({ shell: true });
  const whitening = createWhitening();
  const braces = createArch({ brackets: true });
  const builders: Record<string, Object3D> = {
    implant: implant.group,
    aligner: aligner.group,
    whitening: whitening.group,
    braces: braces.group,
  };

  // pivot = scroll-driven travel, sway = idle motion, model = the geometry
  const sways: Group[] = [];
  const pivots = panels.map((panel, i) => {
    const pivot = new Group();
    const sway = new Group();
    sway.add(builders[panel.dataset.step ?? 'implant'] ?? new Group());
    pivot.add(sway);
    sways.push(sway);
    if (i > 0) {
      pivot.position.y = -OFFSCREEN;
      pivot.rotation.y = -2.2;
    }
    stage.scene.add(pivot);
    return pivot;
  });

  implant.explode(1);
  aligner.setShell(1);
  braces.setBraces(0);
  gsap.set(panels.slice(1), { autoAlpha: 0, y: 30 });

  const state = { implant: 1, shell: 1, white: 0, braces: 0 };
  const last = panels.length - 1;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: (self) => {
        // Derived from scroll progress, not tl.time(), which lags behind while scrub eases.
        const index = Math.min(last, Math.max(0, Math.round(self.progress * tl.duration())));
        if (countEl) countEl.textContent = `0${index + 1}`;
        if (barEl) barEl.style.transform = `scaleX(${self.progress})`;
      },
    },
  });

  // Entrance: the implant assembles while the section scrolls into place.
  gsap.to(state, {
    implant: 0,
    ease: 'power2.inOut',
    onUpdate: () => implant.explode(state.implant),
    scrollTrigger: { trigger: section, start: 'top 75%', end: 'top top', scrub: 0.6 },
  });

  panels.forEach((_, i) => {
    if (i === 0) return;
    const at = i - 0.5;
    tl.to(pivots[i - 1].position, { y: OFFSCREEN, duration: 0.5, ease: 'power2.in' }, at)
      .to(pivots[i - 1].rotation, { y: 2.2, duration: 0.5, ease: 'power1.in' }, at)
      .to(pivots[i].position, { y: 0, duration: 0.5, ease: 'power2.out' }, at)
      .to(pivots[i].rotation, { y: 0, duration: 0.5, ease: 'power2.out' }, at)
      .to(panels[i - 1], { autoAlpha: 0, y: -30, duration: 0.2 }, at)
      .to(panels[i], { autoAlpha: 1, y: 0, duration: 0.25 }, at + 0.25);
  });

  const stepAt = (name: string) => panels.findIndex((p) => p.dataset.step === name);
  const extra = (name: string, vars: gsap.TweenVars) => {
    const i = stepAt(name);
    if (i >= 0) tl.to(state, { duration: 0.4, ease: 'power2.inOut', ...vars }, i - 0.05);
  };
  extra('aligner', { shell: 0, onUpdate: () => aligner.setShell(state.shell) });
  extra('whitening', { white: 1, onUpdate: () => whitening.setWhite(state.white) });
  extra('braces', { braces: 1, onUpdate: () => braces.setBraces(state.braces) });
  tl.to({}, { duration: 0.5 }, last); // dwell on the final step before the section releases

  let leanX = 0;
  let leanY = 0;
  let curX = 0;
  let curY = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      leanY = (e.clientX / window.innerWidth - 0.5) * 0.6;
      leanX = (e.clientY / window.innerHeight - 0.5) * 0.3;
    },
    { passive: true },
  );

  stage.onFrame((time) => {
    curX += (leanX - curX) * 0.06;
    curY += (leanY - curY) * 0.06;
    pivots.forEach((pivot, i) => {
      pivot.visible = Math.abs(pivot.position.y) < OFFSCREEN - 0.05;
      if (!pivot.visible) return;
      sways[i].rotation.set(curX + Math.sin(time * 0.7 + i) * 0.05, curY + Math.sin(time * 0.5 + i * 2) * 0.42, 0);
      sways[i].position.y = Math.sin(time * 1.1 + i) * 0.07;
    });
    whitening.update(time);
  });

  ScrollTrigger.refresh();
}
