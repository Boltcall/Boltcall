interface SetupGradientBackgroundProps {
  /**
   * 'blue' (default) — original PNG. 'white' — inverted for /start onboarding
   * over the dark #050507 field (matches Contact.tsx pattern).
   */
  logoVariant?: 'blue' | 'white';
}

export function SetupGradientBackground({ logoVariant = 'blue' }: SetupGradientBackgroundProps = {}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes boltcallSetupBackgroundIn {
          0% {
            opacity: 0;
            transform: scale(1.08);
            filter: blur(18px);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        @keyframes boltcallSetupGlowIn {
          0% {
            opacity: 0;
            transform: translateY(calc(-50% - 26px)) scale(1.18);
          }
          100% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .setup-gradient-field,
          .setup-gradient-glow {
            animation: none !important;
          }
        }
      `}</style>
      <div
        className="setup-gradient-field absolute inset-0"
        style={{
          animation: 'boltcallSetupBackgroundIn 1100ms cubic-bezier(0.22, 1, 0.36, 1) both',
          background:
            'radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.16) 0%, rgba(73,34,229,0.22) 26%, rgba(8,8,14,0.96) 62%, #050507 100%)',
        }}
      />
      <div
        className="setup-gradient-glow absolute inset-x-0 top-20 h-full blur-[15px] md:top-28"
        style={{ animation: 'boltcallSetupGlowIn 1300ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both' }}
      >
        <div className="absolute inset-0 scale-[1.32] rounded-[100%] bg-white shadow-[0px_-4px_23px_0px_#ffffffb5]" />
        <div className="absolute inset-0 scale-[1.2] rounded-[100%] bg-[#a558fb] blur-[31px]" />
        <div className="absolute inset-0 scale-[1.24] rounded-[100%] bg-[#4922e5] blur-[21px]" />
        <div className="absolute inset-0 scale-[1.2] rounded-[100%] bg-black blur-[51px]" />
      </div>
      <div className="absolute inset-x-0 top-8 flex justify-center px-6 sm:top-10">
        <picture>
          <source srcSet="/boltcall_full_logo.webp" type="image/webp" />
          <img
            src="/boltcall_full_logo.png"
            alt="Boltcall"
            className={
              logoVariant === 'white'
                ? 'h-9 w-auto opacity-95 brightness-0 invert sm:h-10'
                : 'h-11 w-auto opacity-100 sm:h-12'
            }
            width={160}
            height={52}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </picture>
      </div>
    </div>
  );
}
