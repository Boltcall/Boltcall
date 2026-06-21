import { useEffect } from 'react';

import { OriginButton } from '../components/ui/origin-button';

const previewGroups = [
  {
    title: 'Setup flow buttons',
    description: 'The exact labels used around the setup steps.',
    buttons: ['Previous', 'Continue', 'Finish'],
  },
  {
    title: 'Marketing buttons',
    description: 'Longer labels so the hover fill and sheen are easy to judge.',
    buttons: ['Get started', 'Book my demo', 'Start instant lead response'],
  },
];

export default function OriginButtonDemoPage() {
  useEffect(() => {
    document.title = 'Origin Button Demo - Boltcall';
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eaf7ff] px-6 py-10 text-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 0%, #ffffff 0%, #d8f1ff 38%, #74c8ff 74%, #0f76d6 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-white/55 blur-3xl"
      />

      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-center">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-sky-800">
            Boltcall UI test
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-6xl">
            Origin Button Demo
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
            Hover each button to preview the new slide-fill animation before we keep tuning it on the setup page.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            {previewGroups.map((group) => (
              <article
                className="rounded-[2rem] border border-white/55 bg-white/35 p-6 shadow-[0_24px_70px_rgba(15,118,214,0.16)] backdrop-blur-xl"
                key={group.title}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold tracking-[-0.04em]">{group.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {group.buttons.map((label) => (
                    <OriginButton key={label}>{label}</OriginButton>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-[2rem] border border-white/55 bg-white/30 p-6 shadow-[0_24px_70px_rgba(15,118,214,0.14)] backdrop-blur-xl">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">Button states</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Quick checks for regular, loading, and disabled states.
            </p>
            <div className="mt-6 flex flex-col items-start gap-3">
              <OriginButton>Default</OriginButton>
              <OriginButton loading>Loading...</OriginButton>
              <OriginButton disabled>Disabled</OriginButton>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
