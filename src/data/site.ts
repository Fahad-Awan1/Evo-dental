// Single source of truth for clinic details. Pages, structured data and the
// chatbot all read from here, so edit values in this file only.
// NOTE: everything below is placeholder content until real details are supplied.

export interface HoursRow {
  label: string;
  days: number[]; // 0 = Sunday … 6 = Saturday
  open: string | null; // 24h "HH:MM", null = closed
  close: string | null;
}

export const site = {
  name: 'Evo Dental',
  tagline: 'Modern dentistry with a gentle touch, delivered by experienced dental professionals.',
  description:
    'Evo Dental is a modern dental clinic offering preventive, cosmetic, pediatric and emergency dentistry, implants, braces and clear aligners in a calm, comfortable setting.',
  phone: '+1 713 364-5155',
  phoneHref: 'tel:+17133645155',
  whatsapp: '17133645155',
  email: 'safersolutionllc@gmail.com',
  address: {
    street: '24 Crescent Avenue, Suite 200',
    city: 'Riverside',
    region: 'CA',
    postal: '92501',
    country: 'US',
  },
  geo: { lat: 33.9806, lng: -117.3755 },
  hours: [
    { label: 'Monday – Friday', days: [1, 2, 3, 4, 5], open: '09:00', close: '19:00' },
    { label: 'Saturday', days: [6], open: '10:00', close: '16:00' },
    { label: 'Sunday', days: [0], open: null, close: null },
  ] as HoursRow[],
  socials: [
    { label: 'Facebook', icon: 'facebook', href: 'https://www.facebook.com/' },
    { label: 'WhatsApp', icon: 'whatsapp', href: 'https://wa.me/17133645155' },
    { label: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/' },
  ],
  stats: [
    { value: 2400, suffix: '+', label: 'Happy Patients' },
    { value: 15, suffix: '+', label: 'Years Of Care' },
    { value: 12, suffix: '', label: 'Dental Specialists' },
    { value: 98, suffix: '%', label: 'Would Recommend Us' },
  ],
  rating: { value: 4.9, count: 380 }, // placeholder: replace with your real review score
  insurance: ['Delta Dental', 'Cigna', 'MetLife', 'Aetna', 'Guardian'],
  // Optional: paste a Web3Forms / Formspree endpoint to receive booking requests by email.
  formEndpoint: '',
};

export const fullAddress = `${site.address.street}, ${site.address.city}, ${site.address.region} ${site.address.postal}`;
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about/' },
  { label: 'Services', href: '/services/' },
  { label: 'Team', href: '/team/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Contact', href: '/contact/' },
];

export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function hoursText(row: HoursRow): string {
  return row.open && row.close ? `${formatTime(row.open)} – ${formatTime(row.close)}` : 'Closed';
}
