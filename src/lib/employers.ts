/**
 * The employers taking part in the fair. Ordering here drives the visitor
 * checklist and the staff progress bars, so add new booths at the end.
 */
export interface Employer {
  slug: string;
  name: string;
  short: string;
  focus: string;
  monogram: string;
  /** Hex accent used for the booth monogram and checklist ticks. */
  accent: string;
}

export const employers: Employer[] = [
  {
    slug: 'bedesign',
    name: 'BeDesign',
    short: 'BeDesign',
    focus: 'Architecture & design',
    monogram: 'BD',
    accent: '#17694E',
  },
  {
    slug: 'enactus',
    name: 'Enactus',
    short: 'Enactus',
    focus: 'Social enterprise',
    monogram: 'EN',
    accent: '#B4642B',
  },
  {
    slug: 'laing',
    name: 'Laing O’Rourke',
    short: 'Laing',
    focus: 'Construction',
    monogram: 'LO',
    accent: '#2C5A8A',
  },
  {
    slug: 'mm',
    name: 'Mott MacDonald',
    short: 'Mott MacDonald',
    focus: 'Engineering consultancy',
    monogram: 'MM',
    accent: '#7A4B8E',
  },
  {
    slug: 'placement',
    name: 'Placement Team',
    short: 'Placements',
    focus: 'Careers & placements',
    monogram: 'PT',
    accent: '#A9761C',
  },
  {
    slug: 'res',
    name: 'RES',
    short: 'RES',
    focus: 'Renewable energy',
    monogram: 'RES',
    accent: '#1B7F86',
  },
  {
    slug: 'rps',
    name: 'RPS',
    short: 'RPS',
    focus: 'Consulting & engineering',
    monogram: 'RPS',
    accent: '#8A3B4C',
  },
];

export const employerSlugs = employers.map((employer) => employer.slug);

export const totalEmployers = employers.length;

export function getEmployer(slug: string | undefined): Employer | undefined {
  if (!slug) return undefined;
  return employers.find((employer) => employer.slug === slug.toLowerCase());
}

export function employerName(slug: string): string {
  return getEmployer(slug)?.name ?? slug;
}
