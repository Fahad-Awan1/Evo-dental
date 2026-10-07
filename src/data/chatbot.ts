// Knowledge base for the on-site assistant. No AI service is called: answers
// are matched by keywords in scripts/chat/engine.ts and built from site.ts, so
// hours, phone and address always match the rest of the website.
import { site, fullAddress, hoursText, mapsUrl, formatTime } from './site';

export interface Treatment {
  id: string;
  name: string;
  keys: string[];
  blurb: string;
  price: string;
  time: string;
}

// Placeholder price ranges: update alongside src/content/services/*.md.
export const treatments: Treatment[] = [
  {
    id: 'preventive-dentistry',
    name: 'Check-up & Cleaning',
    keys: ['checkup', 'check-up', 'check up', 'cleaning', 'clean', 'hygiene', 'hygienist', 'scale', 'polish', 'preventive', 'exam', 'xray', 'x-ray'],
    blurb: 'A full examination, professional clean and polish, plus screening for gum disease and oral cancer.',
    price: 'from $90',
    time: '30–45 minutes',
  },
  {
    id: 'cosmetic-dentistry',
    name: 'Cosmetic Dentistry',
    keys: ['cosmetic', 'veneer', 'veneers', 'bonding', 'makeover', 'smile design', 'chipped'],
    blurb: 'Veneers, bonding and smile makeovers, previewed digitally before any treatment starts.',
    price: 'from $350 per tooth',
    time: '1–3 visits',
  },
  {
    id: 'pediatric-dentistry',
    name: 'Pediatric Dentistry',
    keys: ['pediatric', 'paediatric', 'child', 'children', 'kid', 'kids', 'baby', 'toddler', 'son', 'daughter', 'teen', 'teenager'],
    blurb: 'Gentle, fun visits for infants, children and teens, from the very first tooth.',
    price: 'from $70',
    time: '20–40 minutes',
  },
  {
    id: 'braces',
    name: 'Braces',
    keys: ['braces', 'brace', 'bracket', 'brackets', 'ceramic', 'orthodontic', 'orthodontist', 'crooked', 'crowded', 'overbite', 'underbite', 'straighten'],
    blurb: 'Metal or tooth-coloured ceramic braces to correct crowding and bite problems at any age.',
    price: 'from $3,200',
    time: '12–24 months',
  },
  {
    id: 'invisalign',
    name: 'Invisalign Clear Aligners',
    keys: ['invisalign', 'aligner', 'aligners', 'clear braces', 'invisible braces', 'trays'],
    blurb: 'Nearly invisible, removable aligners that straighten teeth discreetly.',
    price: 'from $2,800',
    time: '6–18 months',
  },
  {
    id: 'dental-implants',
    name: 'Dental Implants',
    keys: ['implant', 'implants', 'missing tooth', 'missing teeth', 'replace tooth', 'lost tooth', 'titanium'],
    blurb: 'A permanent titanium root and porcelain crown that looks and works like a natural tooth.',
    price: 'from $1,900 per implant',
    time: '2–3 visits over 3–6 months',
  },
  {
    id: 'teeth-whitening',
    name: 'Teeth Whitening',
    keys: ['whitening', 'whiten', 'whiter', 'bleach', 'bleaching', 'stain', 'stains', 'yellow', 'brighter'],
    blurb: 'Dentist-supervised whitening that lifts stains by up to eight shades in about an hour.',
    price: 'from $290',
    time: '60 minutes',
  },
];

export interface Intent {
  id: string;
  phrases?: string[];
  keys: string[];
  answer: () => string;
  chips?: string[];
}

const link = (href: string, label: string) => `<a href="${href}">${label}</a>`;
const BOOK = link('/contact/', 'Book an appointment');

export const DEFAULT_CHIPS = ['Opening hours', 'Book appointment', 'Prices', 'Services', 'Emergency', 'Location'];

export function hoursAnswer(now = new Date()): string {
  const day = now.getDay();
  const today = site.hours.find((h) => h.days.includes(day));
  const rows = site.hours.map((h) => `<li>${h.label}: <strong>${hoursText(h)}</strong></li>`).join('');
  let status = 'We are closed today.';
  if (today?.open && today.close) {
    const mins = now.getHours() * 60 + now.getMinutes();
    const toMins = (t: string) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
    if (mins < toMins(today.open)) status = `We open today at ${formatTime(today.open)}.`;
    else if (mins < toMins(today.close)) status = `We are open now until ${formatTime(today.close)}.`;
    else status = 'We have closed for today.';
  }
  return `<p>${status}</p><ul>${rows}</ul><p>Emergencies are seen the same day whenever possible.</p>`;
}

export function priceList(): string {
  const rows = treatments.map((t) => `<li>${t.name}: <strong>${t.price}</strong></li>`).join('');
  return `<p>Here are our typical starting prices:</p><ul>${rows}</ul><p>You always get a written quote after your consultation, before any treatment.</p>`;
}

export function treatmentAnswer(t: Treatment): string {
  return `<p><strong>${t.name}</strong>: ${t.blurb}</p><p>Typically ${t.price} · ${t.time}.</p><p>${link(`/services/${t.id}/`, 'Read more')} or ${link(`/contact/?service=${t.id}`, 'book a consultation')}.</p>`;
}

export function treatmentPrice(t: Treatment): string {
  return `<p><strong>${t.name}</strong> is ${t.price} (${t.time}).</p><p>The exact fee depends on your case, and we confirm it in writing after a consultation. ${link(`/contact/?service=${t.id}`, 'Book a consultation')}.</p>`;
}

export const emergencyAnswer = () =>
  `<p><strong>Dental emergency?</strong> Call us now on ${link(site.phoneHref, site.phone)}. We keep same-day slots for severe pain, swelling, bleeding and broken or knocked-out teeth.</p><p>Knocked-out tooth: hold it by the crown, keep it in milk and reach us within the hour.</p><p>If swelling affects your breathing or swallowing, go straight to a hospital emergency department.</p>`;

export const fallbackAnswer = () =>
  `<p>Sorry, I didn't quite catch that. I can help with opening hours, prices, treatments, booking, insurance and emergencies. Try one of the options below.</p>`;

export const handoffAnswer = () =>
  `<p>I may not have the answer to that one. Our team will be happy to help:</p><ul><li>Call ${link(site.phoneHref, site.phone)}</li><li>${link(`https://wa.me/${site.whatsapp}`, 'Message us on WhatsApp')}</li><li>${BOOK}</li></ul>`;

export const greeting = () =>
  `<p>Hi! I'm the Evo Dental assistant. Ask me about opening hours, treatments, prices or booking a visit.</p>`;

export const intents: Intent[] = [
  {
    id: 'greeting',
    phrases: ['good morning', 'good afternoon', 'good evening'],
    keys: ['hi', 'hello', 'hey', 'salam', 'hola', 'greetings'],
    answer: () => `<p>Hello! How can I help you today?</p>`,
    chips: DEFAULT_CHIPS,
  },
  {
    id: 'thanks',
    phrases: ['thank you', 'thanks a lot'],
    keys: ['thanks', 'thank', 'thx', 'appreciate', 'great', 'perfect', 'awesome'],
    answer: () => `<p>You're welcome! Is there anything else I can help with?</p>`,
    chips: ['Book appointment', 'Opening hours'],
  },
  {
    id: 'bye',
    phrases: ['see you', 'good bye'],
    keys: ['bye', 'goodbye', 'later'],
    answer: () => `<p>Take care, and keep smiling! We hope to see you at Evo Dental soon.</p>`,
  },
  {
    id: 'hours',
    phrases: ['opening hours', 'open today', 'are you open', 'what time', 'opening times', 'working hours', 'open on'],
    keys: ['hours', 'open', 'close', 'closed', 'timing', 'timings', 'saturday', 'sunday', 'weekend'],
    answer: () => hoursAnswer(),
    chips: ['Book appointment', 'Location'],
  },
  {
    id: 'location',
    phrases: ['where are you', 'how do i get', 'find you'],
    keys: ['location', 'address', 'where', 'located', 'directions', 'map', 'near', 'parking', 'park'],
    answer: () =>
      `<p>We are at <strong>${fullAddress}</strong>.</p><p>${link(mapsUrl, 'Open in Google Maps')}. Free patient parking is available behind the building.</p>`,
    chips: ['Opening hours', 'Book appointment'],
  },
  {
    id: 'booking',
    phrases: ['book appointment', 'make an appointment', 'see a dentist', 'new patient', 'book a visit', 'first visit'],
    keys: ['book', 'booking', 'appointment', 'schedule', 'reserve', 'consultation', 'visit', 'slot', 'availability', 'available'],
    answer: () =>
      `<p>Booking takes under a minute:</p><ul><li>${BOOK} online</li><li>Call ${link(site.phoneHref, site.phone)}</li><li>${link(`https://wa.me/${site.whatsapp}`, 'WhatsApp us')}</li></ul><p>New patients are welcome, and we will confirm your time by phone.</p>`,
    chips: ['Opening hours', 'Prices'],
  },
  {
    id: 'reschedule',
    phrases: ['change my appointment', 'cancel my appointment', 'move my appointment'],
    keys: ['cancel', 'reschedule', 'postpone', 'change', 'late'],
    answer: () =>
      `<p>No problem. Please call ${link(site.phoneHref, site.phone)} at least 24 hours before your appointment and we will find a new time that suits you.</p>`,
  },
  {
    id: 'services',
    phrases: ['what do you offer', 'what services', 'what treatments', 'do you do', 'do you offer'],
    keys: ['services', 'service', 'treatments', 'treatment', 'offer', 'procedures', 'options'],
    answer: () =>
      `<p>We offer complete dental care under one roof:</p><ul>${treatments.map((t) => `<li>${link(`/services/${t.id}/`, t.name)}</li>`).join('')}<li>${link('/services/emergency-dentistry/', 'Emergency Dentistry')}</li></ul><p>Ask me about any of them for details and prices.</p>`,
    chips: ['Implants', 'Invisalign', 'Whitening', 'Braces'],
  },
  {
    id: 'insurance',
    phrases: ['do you accept', 'do you take', 'payment plan', 'payment plans', 'pay monthly'],
    keys: ['insurance', 'insurer', 'insured', 'coverage', 'covered', 'payment', 'pay', 'installment', 'instalment', 'finance', 'financing', 'card', 'cash'],
    answer: () =>
      `<p>We work with most major dental insurers, including ${site.insurance.slice(0, 4).join(', ')} and others, and we handle the claim paperwork for you.</p><p>We accept cash and all major cards, and offer interest-free monthly plans on larger treatments such as implants and aligners.</p>`,
    chips: ['Prices', 'Book appointment'],
  },
  {
    id: 'pain',
    phrases: ['does it hurt', 'will it hurt', 'is it painful', 'scared of', 'afraid of'],
    keys: ['hurt', 'painful', 'scared', 'afraid', 'nervous', 'anxious', 'anxiety', 'fear', 'phobia', 'sedation', 'numb', 'needle'],
    answer: () =>
      `<p>Your comfort comes first. We use numbing gel before every injection, gentle techniques, and offer sedation for anxious patients. Most people are surprised by how little they feel.</p><p>Let us know you are nervous when you book and we will allow extra time.</p>`,
    chips: ['Book appointment'],
  },
  {
    id: 'team',
    phrases: ['who are the dentists', 'your dentists', 'your doctors'],
    keys: ['dentist', 'dentists', 'doctor', 'doctors', 'team', 'staff', 'specialist', 'specialists', 'qualified', 'experience'],
    answer: () =>
      `<p>Our team of 12 clinicians covers cosmetic dentistry, implants, orthodontics, endodontics and children's dentistry. ${link('/team/', 'Meet the team')}.</p>`,
    chips: ['Book appointment', 'Services'],
  },
  {
    id: 'contact',
    phrases: ['talk to someone', 'speak to someone', 'real person', 'call you', 'phone number', 'contact you'],
    keys: ['contact', 'phone', 'call', 'email', 'whatsapp', 'human', 'person', 'reception', 'receptionist', 'number'],
    answer: () =>
      `<p>You can reach our front desk here:</p><ul><li>Phone: ${link(site.phoneHref, site.phone)}</li><li>${link(`https://wa.me/${site.whatsapp}`, 'WhatsApp')}</li><li>Email: ${link(`mailto:${site.email}`, site.email)}</li></ul>`,
    chips: ['Opening hours', 'Location'],
  },
  {
    id: 'aftercare',
    phrases: ['after extraction', 'after treatment', 'after my'],
    keys: ['aftercare', 'recovery', 'healing', 'heal', 'extraction', 'sensitive', 'sensitivity'],
    answer: () =>
      `<p>General aftercare: avoid hot drinks and chewing on the area until numbness wears off, keep it clean with gentle brushing, and take over-the-counter pain relief if needed.</p><p>If pain or swelling gets worse after two days, please call ${link(site.phoneHref, site.phone)}. This is general guidance, not personal medical advice.</p>`,
  },
  {
    id: 'bot',
    phrases: ['who are you', 'are you a robot', 'are you human', 'are you real', 'are you ai'],
    keys: ['robot', 'bot', 'chatbot'],
    answer: () =>
      `<p>I'm Evo Dental's automated assistant. I can answer common questions instantly, and our front desk team can help with anything else on ${link(site.phoneHref, site.phone)}.</p>`,
    chips: DEFAULT_CHIPS,
  },
];
