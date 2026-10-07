// Rule-based matcher for the on-site assistant. Pure functions, no DOM.
import {
  DEFAULT_CHIPS,
  emergencyAnswer,
  fallbackAnswer,
  handoffAnswer,
  intents,
  priceList,
  treatmentAnswer,
  treatmentPrice,
  treatments,
} from '../../data/chatbot';

export interface ChatState {
  last?: string; // id of the treatment discussed most recently
  misses: number; // consecutive questions we could not answer
}

export interface Reply {
  html: string;
  chips: string[];
}

const PRICE_WORDS = ['price', 'prices', 'cost', 'costs', 'fee', 'fees', 'charge', 'charges', 'pricing', 'rate', 'rates', 'expensive', 'cheap', 'affordable', 'how much', 'quote', 'estimate'];
const EMERGENCY_WORDS = ['emergency', 'urgent', 'urgently', 'bleeding', 'swelling', 'swollen', 'abscess', 'knocked out', 'broken tooth', 'cracked tooth', 'toothache', 'tooth ache', 'tooth pain', 'severe pain', 'in pain', 'unbearable', 'asap', 'tooth hurts', 'tooth hurt', 'teeth hurt', 'it hurts', 'hurts a lot', 'is hurting', 'tooth hurting'];
const SMALL_TALK = new Set(['greeting', 'thanks', 'bye']);

export function normalise(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Light stemmer so "prices", "booking" and "whitening" match their base words. */
function stem(word: string): string {
  let w = word;
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  return w;
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** 2 = exact word or phrase, 1 = one-letter typo on a longer word, 0 = no match. */
function matchKey(key: string, text: string, tokens: string[]): number {
  const k = normalise(key);
  if (k.includes(' ')) return ` ${text} `.includes(` ${k} `) ? 2 : 0;
  const ks = stem(k);
  if (tokens.includes(ks)) return 2;
  if (ks.length >= 5 && tokens.some((t) => t.length >= 5 && editDistance(t, ks) <= 1)) return 1;
  return 0;
}

const any = (keys: string[], text: string, tokens: string[]) => keys.some((k) => matchKey(k, text, tokens) > 0);

export function respond(input: string, state: ChatState): Reply {
  const text = normalise(input);
  const tokens = text.split(' ').map(stem);
  const answered = (html: string, chips: string[] = DEFAULT_CHIPS): Reply => {
    state.misses = 0;
    return { html, chips };
  };

  if (text && any(EMERGENCY_WORDS, text, tokens)) {
    return answered(emergencyAnswer(), ['Location', 'Opening hours']);
  }

  const wantsPrice = any(PRICE_WORDS, text, tokens);
  const treatment = treatments.find((t) => t.keys.some((k) => matchKey(k, text, tokens) === 2))
    ?? treatments.find((t) => any(t.keys, text, tokens));

  // "Does whitening hurt?" is a comfort question, not a request for treatment details.
  const pain = intents.find((i) => i.id === 'pain');
  if (pain && (any(pain.keys, text, tokens) || (pain.phrases ?? []).some((p) => ` ${text} `.includes(` ${p} `)))) {
    if (treatment) state.last = treatment.id;
    return answered(pain.answer(), pain.chips);
  }

  if (treatment) {
    state.last = treatment.id;
    return wantsPrice
      ? answered(treatmentPrice(treatment), ['Book appointment', 'Insurance', 'Services'])
      : answered(treatmentAnswer(treatment), ['How much is it?', 'Does it hurt?', 'Book appointment']);
  }

  if (wantsPrice) {
    const previous = treatments.find((t) => t.id === state.last);
    const followUp = /\b(it|that|this|one)\b/.test(text) || /^how much$/.test(text);
    return previous && followUp
      ? answered(treatmentPrice(previous), ['Book appointment', 'Insurance', 'Services'])
      : answered(priceList(), ['Insurance', 'Book appointment']);
  }

  let best: { score: number; small: boolean; index: number } | null = null;
  intents.forEach((intent, index) => {
    let score = 0;
    for (const phrase of intent.phrases ?? []) if (` ${text} `.includes(` ${phrase} `)) score += 5;
    for (const key of intent.keys) score += matchKey(key, text, tokens);
    if (score < 2) return;
    const small = SMALL_TALK.has(intent.id);
    // Real questions beat small talk ("hi, what are your hours?" is about hours).
    if (!best || (best.small && !small) || (best.small === small && score > best.score)) {
      best = { score, small, index };
    }
  });

  if (best) {
    const intent = intents[(best as { index: number }).index];
    return answered(intent.answer(), intent.chips ?? DEFAULT_CHIPS);
  }

  state.misses += 1;
  if (state.misses >= 2) {
    state.misses = 0;
    return { html: handoffAnswer(), chips: DEFAULT_CHIPS };
  }
  return { html: fallbackAnswer(), chips: DEFAULT_CHIPS };
}
