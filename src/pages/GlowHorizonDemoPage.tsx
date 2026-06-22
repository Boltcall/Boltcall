import { useEffect } from 'react';

import GlowHorizonFM from '@/components/ui/glow-horizon';
import { AnimatedTitleFM } from '@/components/ui/glow-horizon-utils/animated-title-fm';

export default function GlowHorizonDemoPage() {
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

      <GlowHorizonFM className="top-20 md:top-28" variant="top" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <AnimatedTitleFM open title="WELCOME TO BOLTCALL" />
      </div>
    </main>
  );
}
