import type { ImageMetadata } from 'astro';
import patient1 from '../assets/images/patient-1.jpg';
import patient2 from '../assets/images/patient-2.jpg';
import patient3 from '../assets/images/patient-3.jpg';

// Placeholder testimonials: replace with real, consented patient reviews.
export interface Testimonial {
  name: string;
  treatment: string;
  quote: string;
  photo: ImageMetadata;
}

export const testimonials: Testimonial[] = [
  {
    name: 'Hannah W.',
    treatment: 'Invisalign',
    quote:
      'I put off straightening my teeth for years. The team made it effortless, and nobody at work even noticed my aligners. I smile in photos now.',
    photo: patient1,
  },
  {
    name: 'James O.',
    treatment: 'Dental Implant',
    quote:
      'I was nervous about getting an implant, but everything was explained step by step and I felt nothing during the procedure. It looks like my own tooth.',
    photo: patient2,
  },
  {
    name: 'Priya S.',
    treatment: 'Teeth Whitening',
    quote:
      'One visit and my teeth were several shades brighter with zero sensitivity. The clinic feels more like a spa than a dentist.',
    photo: patient3,
  },
];

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: 'How often should I visit the dentist?',
    a: 'For most people, a check-up and hygiene visit every six months keeps teeth and gums healthy. If you have gum disease, braces or a higher risk of decay, we may suggest every three to four months.',
  },
  {
    q: 'Do you accept new patients and walk-ins?',
    a: 'Yes. New patients are always welcome and we hold same-day slots for emergencies. Booking ahead guarantees your preferred time.',
  },
  {
    q: 'Will my treatment hurt?',
    a: 'Comfort comes first. We use numbing gel before every injection, gentle techniques and sedation options for anxious patients. Most people are surprised by how little they feel.',
  },
  {
    q: 'Which insurance and payment options do you offer?',
    a: 'We work with most major dental insurers and offer interest-free payment plans on larger treatments such as implants and aligners. We always give you a written estimate first.',
  },
  {
    q: 'How long do dental implants last?',
    a: 'With good home care and regular check-ups, implants commonly last 20 years or more. The crown on top may need replacing after 10 to 15 years of normal wear.',
  },
  {
    q: 'At what age should my child first see a dentist?',
    a: 'We recommend a first visit by their first birthday, or within six months of the first tooth appearing. Early, friendly visits prevent fear later on.',
  },
];

// Steps of the scroll-driven 3D treatment showcase. `model` must match a key in scripts/three/showcase.ts.
export const showcaseSteps = [
  {
    model: 'implant',
    icon: 'implant',
    title: 'Dental Implants',
    text: 'A titanium root, a precision abutment and a hand-finished crown. Three parts that come together as a tooth that looks, feels and bites like your own.',
    meta: 'From $1,900 · 2–3 visits',
    href: '/services/dental-implants/',
  },
  {
    model: 'aligner',
    icon: 'aligner',
    title: 'Clear Aligners',
    text: 'Custom trays, 3D-printed from a digital scan, slip over your teeth and guide them into line. Removable, comfortable and almost invisible.',
    meta: 'From $2,800 · 6–18 months',
    href: '/services/invisalign/',
  },
  {
    model: 'whitening',
    icon: 'sparkle',
    title: 'Teeth Whitening',
    text: 'Professional gel lifts years of coffee, tea and wine stains in about an hour, brightening enamel by up to eight shades without damaging it.',
    meta: 'From $290 · 60 minutes',
    href: '/services/teeth-whitening/',
  },
  {
    model: 'braces',
    icon: 'braces',
    title: 'Braces',
    text: 'Slim brackets and a shape-memory wire apply steady, gentle pressure. The time-tested way to correct crowding and bite problems at any age.',
    meta: 'From $3,200 · 12–24 months',
    href: '/services/braces/',
  },
];
