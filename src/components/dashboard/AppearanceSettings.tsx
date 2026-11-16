import { useEffect, useRef, useState } from 'react';
import { AppearanceLab } from '../ui/st-appearance-lab';
import { useDashboardAppearance } from '../../contexts/DashboardAppearanceContext';
import { DASHBOARD_ACCENTS, DEFAULT_APPEARANCE } from '../../lib/dashboardAppearance';

export default function AppearanceSettings() {
  const { appearance, saved, loading, saving, error, setAppearance, save, reset } = useDashboardAppearance();
  const [message, setMessage] = useState('');
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => () => resetRef.current(), []);
  const dirty = JSON.stringify(appearance) !== JSON.stringify(saved);

  return <section aria-label="Dashboard appearance" className="rounded-2xl border border-border bg-card p-5 text-foreground sm:p-6">
    <p className="mb-4 text-sm text-muted-foreground">Make Boltcall feel like yours. Saved appearance follows your account across devices.</p>
    {error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
    {loading ? <p className="text-sm text-muted-foreground">{error ? 'Appearance is unavailable.' : 'Loading appearance…'}</p> : <>
      <fieldset disabled={saving}>
        <AppearanceLab value={appearance} accents={DASHBOARD_ACCENTS} theme={appearance.previewMode}
          title="Dashboard appearance" className="min-h-0 !p-0" onChange={a => { setAppearance(a); setMessage(''); }} />
      </fieldset>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!dirty || saving} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          onClick={async () => { if (await save()) setMessage('Appearance saved'); }}>
          {saving ? 'Saving…' : 'Save appearance'}
        </button>
        <button type="button" disabled={!dirty || saving} className="min-h-11 rounded-lg border border-border px-3 text-sm disabled:opacity-50"
          onClick={() => { reset(); setMessage(''); }}>Discard changes</button>
        <button type="button" disabled={saving} className="min-h-11 px-2 text-sm text-muted-foreground underline underline-offset-4"
          onClick={() => { setAppearance(DEFAULT_APPEARANCE); setMessage(''); }}>Reset to default</button>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </>}
  </section>;
}
