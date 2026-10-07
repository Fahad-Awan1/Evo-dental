import { respond, type ChatState } from './engine';
import { DEFAULT_CHIPS, greeting } from '../../data/chatbot';

interface Message {
  from: 'bot' | 'user';
  body: string; // bot: trusted HTML generated from our own data; user: plain text
}
interface Saved {
  messages: Message[];
  chips: string[];
  state: ChatState;
}

const STORE = 'evo-chat-v1';
const OPEN = 'evo-chat-open';
const MAX_MESSAGES = 50;

function read(): Saved {
  try {
    const raw = sessionStorage.getItem(STORE);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {
    /* storage unavailable or corrupted: start fresh */
  }
  return { messages: [], chips: [], state: { misses: 0 } };
}

export function mountChat(el: HTMLElement, lockScroll: (lock: boolean) => void) {
  const panel = el.querySelector<HTMLElement>('.chat__panel')!;
  const toggle = el.querySelector<HTMLButtonElement>('[data-chat-toggle]')!;
  const log = el.querySelector<HTMLElement>('[data-chat-log]')!;
  const chipsEl = el.querySelector<HTMLElement>('[data-chat-chips]')!;
  const form = el.querySelector<HTMLFormElement>('[data-chat-form]')!;
  const input = form.querySelector<HTMLInputElement>('input')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSheet = () => matchMedia('(max-width: 520px)').matches;

  const saved = read();
  const persist = () => {
    saved.messages = saved.messages.slice(-MAX_MESSAGES);
    try {
      sessionStorage.setItem(STORE, JSON.stringify(saved));
    } catch {
      /* ignore */
    }
  };
  const remember = (open: boolean) => {
    try {
      sessionStorage.setItem(OPEN, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const bubble = (message: Message) => {
    const div = document.createElement('div');
    div.className = `chat__msg chat__msg--${message.from}`;
    if (message.from === 'bot') div.innerHTML = message.body;
    else div.textContent = message.body;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  };
  const add = (message: Message) => {
    saved.messages.push(message);
    bubble(message);
  };
  const setChips = (chips: string[]) => {
    saved.chips = chips;
    chipsEl.replaceChildren(
      ...chips.map((label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chat__chip';
        b.textContent = label;
        return b;
      }),
    );
  };

  if (saved.messages.length) {
    saved.messages.forEach(bubble);
    setChips(saved.chips);
  } else {
    add({ from: 'bot', body: greeting() });
    setChips(DEFAULT_CHIPS);
    persist();
  }

  let busy = false;
  const send = (raw: string) => {
    const text = raw.trim().slice(0, 200);
    if (!text || busy) return;
    busy = true;
    add({ from: 'user', body: text });
    setChips([]);
    const typing = bubble({ from: 'bot', body: '<span class="chat__typing" aria-label="Typing"><i></i><i></i><i></i></span>' });
    window.setTimeout(
      () => {
        typing.remove();
        const reply = respond(text, saved.state);
        add({ from: 'bot', body: reply.html });
        setChips(reply.chips);
        persist();
        busy = false;
      },
      reduced ? 0 : 450 + Math.random() * 350,
    );
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    send(input.value);
    input.value = '';
  });
  chipsEl.addEventListener('click', (e) => {
    const chip = (e.target as Element).closest('.chat__chip');
    if (chip?.textContent) send(chip.textContent);
  });

  const open = (focus = true) => {
    panel.hidden = false;
    el.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    remember(true);
    if (isSheet()) lockScroll(true);
    log.scrollTop = log.scrollHeight;
    if (focus) input.focus({ preventScroll: true });
  };
  const close = () => {
    panel.hidden = true;
    el.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    remember(false);
    lockScroll(false);
    toggle.focus({ preventScroll: true });
  };

  toggle.addEventListener('click', () => (panel.hidden ? open() : close()));
  el.querySelector('[data-chat-close]')?.addEventListener('click', close);
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    // Full-screen sheet on phones: keep keyboard focus inside the panel.
    if (e.key !== 'Tab' || !isSheet()) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button, a[href], input')).filter(
      (n) => n.offsetParent !== null,
    );
    const first = focusable[0];
    const lastEl = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      first.focus();
    }
  });

  return { open, close };
}
