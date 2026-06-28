import { useEffect, useState } from 'react';

// ponytail: throwaway prototype route that mirrors the provided live-call reference image.
const useCases = [
  'Receptionist',
  'Appointment Setter',
  'Lead Qualification',
  'Customer Service',
  'Debt Collection',
  'Survey',
] as const;

function WaveIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2 8V6.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M4.4 10.2V4.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M6.8 11.75V4.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M9.2 9.6V6.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M11.6 12V4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M14 8.75V7.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.5 7.75L10 12.25L14.5 7.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function LiveCallPrototypePage() {
  const [selectedUseCase, setSelectedUseCase] = useState<(typeof useCases)[number]>('Receptionist');

  useEffect(() => {
    document.title = 'Live Call Prototype - Boltcall';
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f4f5] px-5 py-6 text-[#13233f] md:px-8 md:py-8">
      <div className="mx-auto grid max-w-[1360px] gap-3 xl:grid-cols-[1.02fr_1fr]">
        <section className="flex min-h-[720px] flex-col rounded-[14px] border border-[#cfd5e6] bg-[#f8f8f8] px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-1 items-center justify-center">
            <div className="relative h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_32%_68%,rgba(180,161,232,0.58)_0%,rgba(180,161,232,0)_31%),radial-gradient(circle_at_44%_36%,rgba(130,177,225,0.82)_0%,rgba(130,177,225,0.16)_45%,rgba(130,177,225,0)_72%),radial-gradient(circle_at_73%_72%,rgba(47,95,232,0.92)_0%,rgba(47,95,232,0.28)_30%,rgba(47,95,232,0)_56%),radial-gradient(circle_at_84%_28%,rgba(246,215,225,0.9)_0%,rgba(246,215,225,0.1)_30%,rgba(246,215,225,0)_58%),linear-gradient(145deg,#f6dfe7_4%,#eef0f8_32%,#9cc9de_61%,#f3dbe1_100%)] shadow-[inset_0_0_65px_rgba(255,255,255,0.45)]">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_38%,rgba(140,186,234,0.24),transparent_42%),radial-gradient(circle_at_68%_78%,rgba(32,77,223,0.46),transparent_28%),radial-gradient(circle_at_14%_74%,rgba(255,255,255,0.34),transparent_28%)] blur-[26px] [transform:scale(1.02)]" />
            </div>
          </div>

          <div className="mx-auto flex max-w-[480px] flex-wrap justify-center gap-[4px]">
            {useCases.map((useCase) => {
              const isActive = useCase === selectedUseCase;

              return (
                <button
                  key={useCase}
                  type="button"
                  onClick={() => setSelectedUseCase(useCase)}
                  className={[
                    'inline-flex h-10 items-center justify-center gap-2 rounded-[6px] px-5 text-[14px] font-semibold tracking-[-0.02em] transition-colors',
                    isActive
                      ? 'bg-[#4369eb] text-white shadow-[0_8px_18px_rgba(67,105,235,0.2)]'
                      : 'bg-[#efeff2] text-[#13233f]',
                  ].join(' ')}
                >
                  {isActive ? <WaveIcon /> : null}
                  <span>{useCase}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex min-h-[720px] flex-col rounded-[14px] bg-[#f3f3f7] px-7 py-8 md:px-9 md:py-10">
          <div className="max-w-[560px]">
            <h1 className="max-w-[520px] text-[34px] font-medium leading-[1.03] tracking-[-0.055em] text-[#13233f] md:text-[36px]">
              Receive a live call from our agent and discover how our AI caller transforms customer conversations.
            </h1>
          </div>

          <div className="mt-[72px]">
            <label className="block text-center text-[13px] font-semibold tracking-[-0.02em] text-[#4369eb]">
              Use Case
            </label>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-between border-b border-[#cfd3df] pb-4 text-left text-[23px] font-medium tracking-[-0.04em] text-[#13233f]"
            >
              <span>{selectedUseCase}</span>
              <span className="text-[#13233f]">
                <ChevronDownIcon />
              </span>
            </button>
          </div>

          <div className="mt-5">
            <label className="block text-center text-[13px] font-semibold tracking-[-0.02em] text-[#4369eb]">
              Name
            </label>
            <div className="mt-4 border-b border-[#cfd3df] pb-4 text-[22px] tracking-[-0.045em] text-[#13233f]">
              Your Name
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-center text-[13px] font-semibold tracking-[-0.02em] text-[#4369eb]">
              Phone Number
            </label>
            <div className="mt-4 border-b border-[#cfd3df] pb-4 text-[22px] tracking-[-0.045em] text-[#13233f]">
              +15551234567
            </div>
          </div>

          <div className="mt-auto pt-12">
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-[8px] bg-[#091c46] px-5 text-[15px] font-semibold tracking-[-0.03em] text-white transition-colors hover:bg-[#112758]"
            >
              Get a call
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
