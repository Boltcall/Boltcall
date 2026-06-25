export function SetupGradientBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.16) 0%, rgba(73,34,229,0.22) 26%, rgba(8,8,14,0.96) 62%, #050507 100%)',
        }}
      />
      <div className="absolute inset-x-0 top-20 h-full -translate-y-1/2 blur-[15px] md:top-28">
        <div className="absolute inset-0 scale-[1.32] rounded-[100%] bg-white shadow-[0px_-4px_23px_0px_#ffffffb5]" />
        <div className="absolute inset-0 scale-[1.2] rounded-[100%] bg-[#a558fb] blur-[31px]" />
        <div className="absolute inset-0 scale-[1.24] rounded-[100%] bg-[#4922e5] blur-[21px]" />
        <div className="absolute inset-0 scale-[1.2] rounded-[100%] bg-black blur-[51px]" />
      </div>
      <div className="absolute inset-x-0 top-6 flex justify-center px-6 sm:top-8">
        <picture>
          <source srcSet="/boltcall_full_logo.webp" type="image/webp" />
          <img
            src="/boltcall_full_logo.png"
            alt="Boltcall"
            className="h-11 w-auto opacity-100 sm:h-12"
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
