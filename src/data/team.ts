import type { ImageMetadata } from 'astro';
import team1 from '../assets/images/team-1.jpg';
import team2 from '../assets/images/team-2.jpg';
import team3 from '../assets/images/team-3.jpg';
import team4 from '../assets/images/team-4.jpg';
import team5 from '../assets/images/team-5.jpg';
import team6 from '../assets/images/team-6.jpg';

export interface Doctor {
  name: string;
  role: string;
  focus: string;
  bio: string;
  years: number;
  photo: ImageMetadata;
}

// Placeholder team: replace names, roles and photos with the real clinicians.
export const team: Doctor[] = [
  {
    name: 'Dr. Amelia Hart',
    role: 'Lead Cosmetic Dentist',
    focus: 'Veneers, smile design, whitening',
    bio: 'Amelia plans every smile makeover digitally first, so you can preview the result before treatment begins.',
    years: 14,
    photo: team1,
  },
  {
    name: 'Dr. Daniel Reyes',
    role: 'Implant Surgeon',
    focus: 'Dental implants, bone grafting',
    bio: 'Daniel has placed more than 2,000 implants and is known for calm, precise, minimally invasive surgery.',
    years: 16,
    photo: team2,
  },
  {
    name: 'Dr. Sofia Marin',
    role: 'Orthodontist',
    focus: 'Invisalign, ceramic and metal braces',
    bio: 'Sofia helps teens and adults straighten their teeth discreetly with aligners and low-profile braces.',
    years: 11,
    photo: team3,
  },
  {
    name: 'Dr. Noah Bennett',
    role: 'Pediatric Dentist',
    focus: 'Children and anxious patients',
    bio: 'Noah turns first visits into fun ones, building habits that keep young smiles healthy for life.',
    years: 9,
    photo: team4,
  },
  {
    name: 'Dr. Leila Haddad',
    role: 'Endodontist',
    focus: 'Root canal therapy, pain relief',
    bio: 'Leila uses microscope-guided techniques to save natural teeth, usually in a single comfortable visit.',
    years: 12,
    photo: team5,
  },
  {
    name: 'Dr. Marcus Cole',
    role: 'General & Emergency Dentist',
    focus: 'Preventive care, urgent treatment',
    bio: 'Marcus leads our same-day emergency service and believes prevention is the kindest dentistry there is.',
    years: 10,
    photo: team6,
  },
];
