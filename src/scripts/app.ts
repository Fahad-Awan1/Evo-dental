import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = <T extends HTMLElement>(sel: string, ctx: ParentNode = document) => ctx.querySelector<T>(sel);
const $$ = <T extends HTMLElement>(sel: string, ctx: ParentNode = document) =>
  Array.from(ctx.querySelectorAll<T>(sel));

let lenis: Lenis | null = null;

/* ---------- Smooth scroll (desktop pointers only; touch keeps native momentum) ---------- */
function initScroll() {
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (reduced || !finePointer) return;
  lenis = new Lenis({ lerp: 0.11, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function lockScroll(lock: boolean) {
  if (lock) lenis?.stop();
  else lenis?.start();
  root.classList.toggle('is-locked', lock);
}

/* ---------- Header + scroll progress ---------- */
function initHeader() {
  const header = $('[data-header]');
  const bar = $('[data-scroll-progress]');
  if (!header) return;
  let last = 0;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    header.classList.toggle('is-hidden', y > 480 && y > last && !root.classList.contains('nav-open'));
    last = y;
    if (bar) {
      const max = root.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Desktop links: a small tooth glides under the hovered link and rests on the current page.
  const nav = $('[data-nav]');
  const marker = $('[data-nav-marker]');
  if (!nav || !marker) return;
  const links = $$<HTMLAnchorElement>('.header__link', nav);
  const active = links.find((l) => l.classList.contains('is-active')) ?? null;
  const desktop = matchMedia('(min-width: 1024px)');
  const place = (link: HTMLElement | null) => {
    if (!desktop.matches) return;
    if (!link) {
      marker.style.opacity = '0';
      return;
    }
    const r = link.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    marker.style.setProperty('--x', `${r.left - n.left + r.width / 2 - 8}px`);
    marker.style.opacity = '';
  };
  const settle = () => {
    place(active);
    nav.classList.add('has-marker');
  };
  links.forEach((link) => {
    link.addEventListener('mouseenter', () => place(link));
    link.addEventListener('focus', () => place(link));
  });
  nav.addEventListener('mouseleave', () => place(active));
  nav.addEventListener('focusout', () => place(active));
  document.fonts.ready.then(settle);
  window.addEventListener('resize', () => place(active), { passive: true });
  desktop.addEventListener('change', () => place(active));
}

/* ---------- Full-screen mobile navigation ---------- */
function initNav() {
  const toggle = $<HTMLButtonElement>('[data-nav-toggle]');
  const overlay = $('[data-nav-overlay]');
  if (!toggle || !overlay) return;
  const main = document.getElementById('main');
  let timer = 0;

  const set = (open: boolean) => {
    window.clearTimeout(timer);
    toggle.setAttribute('aria-expanded', String(open));
    root.classList.toggle('nav-open', open);
    lockScroll(open);
    main?.toggleAttribute('inert', open);
    if (open) {
      overlay.hidden = false;
      void overlay.offsetWidth; // commit the closed state so the clip-path transition runs
      overlay.classList.add('is-open');
    } else {
      overlay.classList.remove('is-open');
      timer = window.setTimeout(() => (overlay.hidden = true), 700);
    }
  };

  toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('nav-open')) {
      set(false);
      toggle.focus();
    }
  });

  // Dental chart menu: the row of teeth whitens up to the item being hovered or focused.
  const links = $$('[data-nav-index]', overlay);
  const activeIndex = links.findIndex((l) => l.classList.contains('is-active'));
  const light = (i: number) => overlay.style.setProperty('--lit', String(i + 1));
  links.forEach((link) => {
    const i = Number(link.dataset.navIndex);
    link.addEventListener('mouseenter', () => light(i));
    link.addEventListener('focus', () => light(i));
  });
  overlay.addEventListener('mouseleave', () => light(activeIndex));
  light(activeIndex);
}

/* ---------- Curtain: preloader on first visit, wipe on every page change ---------- */
function initCurtain(): Promise<void> {
  const curtain = $('[data-curtain]');
  const preloading = root.classList.contains('is-preloading');
  const entering = root.classList.contains('is-entering');
  if (!curtain || (!preloading && !entering)) return Promise.resolve();

  return new Promise((resolve) => {
    gsap.set(curtain, { yPercent: 0, visibility: 'visible' });
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(curtain, { yPercent: 100, visibility: 'hidden' });
        root.classList.remove('is-preloading', 'is-entering');
      },
    });
    if (preloading) {
      const count = $('[data-curtain-count]', curtain);
      const n = { v: 0 };
      tl.to(n, {
        v: 100,
        duration: 0.8,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (count) count.textContent = String(Math.round(n.v));
        },
      });
      tl.to($('.curtain__inner', curtain), { autoAlpha: 0, y: -24, duration: 0.25, ease: 'power2.in' });
      try {
        sessionStorage.setItem('evo-seen', '1');
      } catch {
        /* storage unavailable */
      }
    }
    tl.add(() => resolve());
    tl.to(curtain, { yPercent: -100, duration: 0.7, ease: 'power3.inOut' });
  });
}

function initPageTransitions() {
  const curtain = $('[data-curtain]');
  if (!curtain || reduced) return;

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== location.origin) return;
    if (a.pathname === location.pathname) return; // in-page anchors and same-page links behave normally
    e.preventDefault();
    gsap.killTweensOf(curtain);
    gsap.set(curtain, { yPercent: 100, visibility: 'visible' });
    gsap.to(curtain, {
      yPercent: 0,
      duration: 0.5,
      ease: 'power3.inOut',
      onComplete: () => {
        location.href = a.href;
      },
    });
  });

  // Restored from the back/forward cache: make sure the curtain is not left covering the page.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) gsap.set(curtain, { yPercent: 100, visibility: 'hidden' });
  });
}

/* ---------- Scroll reveals ----------
   One IntersectionObserver drives everything, and the motion itself is CSS
   (see "Scroll reveals" in global.css). Nothing is measured up front, so page
   start-up stays cheap; headings are split into lines only as they appear. */
function revealHeading(el: HTMLElement) {
  el.classList.add('is-in');
  let played = false;
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'split-line',
    aria: 'none',
    autoSplit: true,
    onSplit: (self) => {
      if (played) return; // re-splits after a resize should not replay the entrance
      played = true;
      return gsap.from(self.lines, {
        yPercent: 115,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.09,
        delay: Number(el.dataset.delay || 0),
      });
    },
  });
}

function countUp(el: HTMLElement) {
  const end = Number(el.dataset.count || 0);
  const decimals = Number(el.dataset.decimals || 0);
  const o = { v: 0 };
  gsap.to(o, {
    v: end,
    duration: 1.8,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = o.v.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    },
  });
}

function initReveals() {
  if (reduced) return;
  root.classList.add('fx'); // hidden starting states only apply from here on

  const io = new IntersectionObserver(
    (entries) => {
      let order = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        if (el.hasAttribute('data-inview')) return el.classList.add('is-in');
        if (el.hasAttribute('data-split')) return revealHeading(el);
        if (el.hasAttribute('data-count')) return countUp(el);
        const delay = order++ * 0.11;
        el.style.setProperty('--d', `${delay}s`);
        el.classList.add('is-in');
        if (el.hasAttribute('data-draw')) return;
        // Once revealed, hand the element back to its own styles (hover transitions etc.).
        window.setTimeout(
          () => {
            el.removeAttribute('data-reveal');
            el.removeAttribute('data-img-reveal');
            el.classList.remove('is-in');
            el.style.removeProperty('--d');
          },
          (delay + 1.9) * 1000,
        );
      });
    },
    { rootMargin: '0px 0px -7% 0px' },
  );
  $$('[data-reveal], [data-split], [data-img-reveal], [data-count], [data-draw], [data-inview]').forEach((el) =>
    io.observe(el),
  );
  initScrollFill();

  if (window.innerWidth >= 900) {
    $$('[data-parallax]').forEach((el) => {
      const speed = Number(el.dataset.parallax || 0.1);
      gsap.fromTo(
        el,
        { yPercent: speed * 60 },
        {
          yPercent: speed * -60,
          ease: 'none',
          scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });
  }
}

/* ---------- Scroll fill: [data-fill] gets --p from 0 to 1 as it travels up the viewport ---------- */
function initScrollFill() {
  const els = $$('[data-fill]');
  if (!els.length) return;
  const active = new Set<HTMLElement>();
  let queued = false;
  const update = () => {
    queued = false;
    const vh = window.innerHeight;
    active.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (vh * 0.92 - top) / (vh * 0.5)));
      el.style.setProperty('--p', p.toFixed(3));
    });
  };
  const request = () => {
    if (queued || !active.size) return;
    queued = true;
    requestAnimationFrame(update);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) active.add(entry.target as HTMLElement);
      else active.delete(entry.target as HTMLElement);
    });
    request();
  });
  els.forEach((el) => {
    el.style.setProperty('--p', '0');
    io.observe(el);
  });
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
}

/* ---------- Pointer micro-interactions ---------- */
function initPointerFx() {
  if (reduced || !finePointer) return;

  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });

  // Spotlight: expose the pointer position to CSS as --mx / --my
  $$('[data-spot]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  $$('[data-tilt]').forEach((el) => {
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 14);
      rx(((e.clientY - r.top) / r.height - 0.5) * -12);
    });
    el.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  });
}

/* ---------- Sliders (testimonials) ---------- */
function initSliders() {
  $$('[data-slider]').forEach((slider) => {
    const groups = $$('[data-slides]', slider);
    const status = $('[data-slider-status]', slider);
    const count = groups[0]?.children.length ?? 0;
    if (count < 2) return;
    let index = 0;

    const go = (to: number) => {
      index = (to + count) % count;
      groups.forEach((g) =>
        Array.from(g.children).forEach((child, k) => {
          child.classList.toggle('is-active', k === index);
          child.setAttribute('aria-hidden', String(k !== index));
        }),
      );
      if (status) status.textContent = `${index + 1} / ${count}`;
    };

    $('[data-slider-prev]', slider)?.addEventListener('click', () => go(index - 1));
    $('[data-slider-next]', slider)?.addEventListener('click', () => go(index + 1));

    let startX = 0;
    slider.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
    slider.addEventListener(
      'touchend',
      (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
      },
      { passive: true },
    );
    go(0);
  });
}

/* ---------- Before / after comparison ---------- */
function initBeforeAfter() {
  $$('[data-compare]').forEach((el) => {
    const range = $<HTMLInputElement>('input[type="range"]', el);
    if (!range) return;
    const update = () => el.style.setProperty('--pos', `${range.value}%`);
    range.addEventListener('input', update);
    update();
    if (!reduced) {
      // Nudge the handle once when it scrolls into view so people notice it is draggable.
      const o = { v: 50 };
      const sync = () => {
        range.value = String(o.v);
        update();
      };
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          gsap
            .timeline({ delay: 0.4 })
            .to(o, { v: 68, duration: 0.7, ease: 'power2.inOut', onUpdate: sync })
            .to(o, { v: 38, duration: 0.9, ease: 'power2.inOut', onUpdate: sync })
            .to(o, { v: 50, duration: 0.7, ease: 'power2.inOut', onUpdate: sync });
        },
        { threshold: 0.5 },
      );
      io.observe(el);
    }
  });
}

/* ---------- Booking form ---------- */
function initBookingForm() {
  const form = $<HTMLFormElement>('[data-booking-form]');
  if (!form) return;
  const success = $('[data-booking-success]');
  const date = $<HTMLInputElement>('input[name="date"]', form);
  if (date) date.min = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

  const wanted = new URLSearchParams(location.search).get('service');
  const select = $<HTMLSelectElement>('select[name="service"]', form);
  if (wanted && select) {
    const opt = Array.from(select.options).find((o) => o.dataset.slug === wanted);
    if (opt) select.value = opt.value;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) ?? '').trim();
    const lines = [
      `Hello Evo Dental, I'd like to book an appointment.`,
      `Name: ${get('name')}`,
      `Phone: ${get('phone')}`,
      get('email') && `Email: ${get('email')}`,
      `Service: ${get('service')}`,
      `Preferred: ${get('date')} (${get('time')})`,
      get('message') && `Notes: ${get('message')}`,
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join('\n'));

    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      try {
        await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      } catch {
        /* the WhatsApp / email handoff below still works */
      }
    }

    const wa = $<HTMLAnchorElement>('[data-booking-wa]');
    const mail = $<HTMLAnchorElement>('[data-booking-mail]');
    if (wa) wa.href = `https://wa.me/${form.dataset.whatsapp}?text=${text}`;
    if (mail) mail.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent('Appointment request')}&body=${text}`;
    const nameEl = $('[data-booking-name]');
    if (nameEl) nameEl.textContent = get('name').split(' ')[0];

    form.hidden = true;
    if (success) {
      success.hidden = false;
      success.focus();
    }
  });

  $('[data-booking-reset]')?.addEventListener('click', () => {
    form.reset();
    form.hidden = false;
    if (success) success.hidden = true;
  });
}

/* ---------- 3D: loaded only when a slot approaches the viewport ---------- */
// Building the WebGL scene (shader compilation, geometry) is the heaviest work on
// the site, so it waits for the visitor's first interaction and never competes
// with page load. If nobody interacts, it starts on its own after a few seconds.
const whenEngaged = new Promise<void>((resolve) => {
  const events = ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'scroll', 'wheel'];
  const done = () => {
    events.forEach((name) => window.removeEventListener(name, done));
    resolve();
  };
  events.forEach((name) => window.addEventListener(name, done, { passive: true }));
  const fallback = () => window.setTimeout(done, 8000);
  if (document.readyState === 'complete') fallback();
  else window.addEventListener('load', fallback, { once: true });
});

function initThree() {
  const slots = $$('[data-three]');
  if (!slots.length || reduced || !('WebGL2RenderingContext' in window)) return;
  const showcase = $('[data-showcase]');
  showcase?.classList.add('is-live');

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(async (entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        await whenEngaged;
        try {
          if (el.dataset.three === 'showcase' && showcase) {
            (await import('./three/showcase')).mountShowcase(showcase, el);
          } else {
            (await import('./three/viewer')).mountViewer(el);
          }
        } catch (err) {
          console.warn('3D scene unavailable, showing static fallback.', err);
          if (el.dataset.three === 'showcase') {
            showcase?.classList.remove('is-live');
            ScrollTrigger.refresh();
          }
        }
      });
    },
    { rootMargin: '1400px 0px' },
  );
  slots.forEach((slot) => io.observe(slot));
}

/* ---------- Chatbot: code is fetched on first use ---------- */
function initChat() {
  const el = $('[data-chat]');
  const toggle = $('[data-chat-toggle]');
  if (!el || !toggle) return;
  let ui: Promise<{ open: (focus?: boolean) => void }> | null = null;
  const load = () => (ui ??= import('./chat/ui').then((m) => m.mountChat(el, lockScroll)));

  // After the first load the chat module attaches its own toggle handler.
  toggle.addEventListener('click', () => {
    if (!ui) load().then((c) => c.open());
  });
  $$('[data-chat-open]').forEach((b) => b.addEventListener('click', () => load().then((c) => c.open())));

  let wasOpen = false;
  try {
    wasOpen = sessionStorage.getItem('evo-chat-open') === '1';
  } catch {
    /* storage unavailable */
  }
  if (wasOpen && window.innerWidth > 520) load().then((c) => c.open(false));
}

/* ---------- Boot ---------- */
initScroll();
initHeader();
initNav();
initPageTransitions();
initThree();
initSliders();
initBeforeAfter();
initBookingForm();
initPointerFx();
initChat();
$$('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));
// Highlight today's row in opening-hours tables (done here because pages are prebuilt).
$$('[data-days]').forEach((el) =>
  el.classList.toggle('is-today', (el.dataset.days ?? '').split(',').includes(String(new Date().getDay()))),
);

// Start reveals as the curtain lifts, after fonts are ready so line splits are measured correctly.
Promise.all([initCurtain(), document.fonts.ready]).then(initReveals);
window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
