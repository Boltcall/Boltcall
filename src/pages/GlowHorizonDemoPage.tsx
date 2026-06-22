import { useEffect, useState } from 'react';

import GlowHorizonFM, { type GlowHorizonVariant } from '@/components/ui/glow-horizon';
import { AnimatedTitleFM } from '@/components/ui/glow-horizon-utils/animated-title-fm';

const variants: GlowHorizonVariant[] = ['top', 'bottom', 'left', 'right'];

export default function GlowHorizonDemoPage() {
  const [variant, setVariant] = useState<GlowHorizonVariant>('top');

  useEffect(() => {
    document.title = 'Glow Horizon Demo - Boltcall';
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.16) 0%, rgba(73,34,229,0.22) 26%, rgba(8,8,14,0.96) 62%, #050507 100%)',
        }}
      />

      <GlowHorizonFM variant={variant} />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <AnimatedTitleFM open />

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {variants.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setVariant(item)}
              aria-pressed={variant === item}
              className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                variant === item
                  ? 'border-white bg-white text-black'
                  : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
