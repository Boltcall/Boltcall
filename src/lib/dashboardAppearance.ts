import type { CSSProperties } from 'react';
import type { Accent, Appearance } from '../components/ui/st-appearance-lab';

export const DASHBOARD_ACCENTS: Accent[] = [
  { id: 'boltcall', label: 'Boltcall blue', color: '#3B82F6' },
  { id: 'iris', label: 'Iris', color: '#8B5CF6' },
  { id: 'emerald', label: 'Emerald', color: '#10B981' },
  { id: 'gold', label: 'Gold', color: '#F59E0B' },
  { id: 'red', label: 'Red', color: '#EF4444' },
  { id: 'rose', label: 'Rose', color: '#EC4899' },
  { id: 'teal', label: 'Teal', color: '#14B8A6' },
  { id: 'ember', label: 'Ember', color: '#F97316' },
  { id: 'sky', label: 'Sky', color: '#1c7ed6' },
];

export const DEFAULT_APPEARANCE: Appearance = {
  accent: 'boltcall', density: 'cozy', radius: 12, previewMode: 'light',
};

export function normalizeAppearance(value: unknown): Appearance {
  const a = value && typeof value === 'object' ? value as Partial<Appearance> : {};
  return {
    accent: DASHBOARD_ACCENTS.some(x => x.id === a.accent) ? a.accent! : DEFAULT_APPEARANCE.accent,
    density: a.density === 'compact' || a.density === 'roomy' ? a.density : 'cozy',
    radius: typeof a.radius === 'number' && Number.isFinite(a.radius) ? Math.round(Math.max(0, Math.min(28, a.radius))) : 12,
    previewMode: a.previewMode === 'dark' ? 'dark' : 'light',
  };
}

export function appearanceStyle(a: Appearance): CSSProperties {
  const color = DASHBOARD_ACCENTS.find(x => x.id === a.accent)?.color ?? DASHBOARD_ACCENTS[0].color;
  const channels = [1, 3, 5].map(offset => {
    const c = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  // ponytail: scope variables to the dashboard so public pages keep their brand styling.
  return {
    '--dashboard-accent': color,
    '--dashboard-accent-soft': `${color}18`,
    '--dashboard-accent-foreground': luminance > 0.179 ? '#000000' : '#ffffff',
    '--dashboard-radius': `${a.radius}px`,
    '--dashboard-space': `${{ compact: 6, cozy: 12, roomy: 18 }[a.density]}px`,
    colorScheme: a.previewMode,
  } as CSSProperties;
}
