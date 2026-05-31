// Vertical keyword map — mirrors matchCategories in generate-agent-prompt.ts
export const VERTICAL_KEYWORDS: Array<{ vertical: string; keywords: string[] }> = [
  { vertical: 'plumber',      keywords: ['plumber', 'plumbing', 'drain', 'pipe', 'sewer', 'water heater', 'faucet', 'clog', 'leak', 'repiping'] },
  { vertical: 'dental',       keywords: ['dental', 'dentist', 'orthodont', 'tooth', 'teeth'] },
  { vertical: 'hvac',         keywords: ['hvac', 'heating', 'cooling', 'air condition', 'furnace', 'boiler', 'heat pump'] },
  { vertical: 'legal',        keywords: ['law', 'legal', 'attorney', 'lawyer', 'solicitor', 'personal injury', 'criminal', 'family law'] },
  { vertical: 'medspa',       keywords: ['med spa', 'medspa', 'aesthetic', 'botox', 'filler', 'laser', 'skin care', 'cosmetic', 'wellness', 'salon', 'spa', 'massage'] },
  { vertical: 'restaurant',   keywords: ['restaurant', 'cafe', 'bistro', 'diner', 'catering', 'food'] },
  { vertical: 'real_estate',  keywords: ['real estate', 'property', 'realtor', 'mortgage'] },
  { vertical: 'medical',      keywords: ['medical', 'doctor', 'clinic', 'physician', 'therapy', 'chiropract', 'vet'] },
  { vertical: 'auto',         keywords: ['auto', 'car', 'mechanic', 'garage', 'body shop', 'tyre', 'tire'] },
  { vertical: 'fitness',      keywords: ['fitness', 'gym', 'personal train', 'yoga', 'pilates', 'crossfit'] },
  { vertical: 'solar',        keywords: ['solar', 'renewable', 'solar energy', 'solar panel', 'clean energy'] },
  { vertical: 'roofing',      keywords: ['roof', 'roofing', 'roofer', 'gutter', 'siding', 'shingle'] },
  { vertical: 'pest_control', keywords: ['pest', 'exterminator', 'termite', 'rodent', 'fumigation'] },
  { vertical: 'electrical',   keywords: ['electric', 'electrician', 'electrical', 'wiring', 'circuit', 'generator'] },
];

export function inferVertical(text: string): string {
  const lower = text.toLowerCase();
  for (const { vertical, keywords } of VERTICAL_KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) return vertical;
  }
  return 'general';
}
