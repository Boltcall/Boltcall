import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import SiriOrb from "@/components/ui/siri-orb";

type DemoIndustryId =
  | "law-firm"
  | "roofers"
  | "hvac"
  | "plumbers"
  | "dental"
  | "med-spa";

type RequestState = "idle" | "loading" | "success" | "error";

type DemoIndustry = {
  id: DemoIndustryId;
  label: string;
  blurb: string;
};

const DEMO_INDUSTRIES: DemoIndustry[] = [
  { id: "law-firm", label: "Law Firm", blurb: "Consult intake and fast callback." },
  { id: "roofers", label: "Roofers", blurb: "Storm leads and estimate booking." },
  { id: "hvac", label: "HVAC", blurb: "Emergency service and dispatch triage." },
  { id: "plumbers", label: "Plumbers", blurb: "After-hours overflow and booking." },
  { id: "dental", label: "Dental", blurb: "New patient intake and scheduling." },
  { id: "med-spa", label: "Med Spa", blurb: "Consult follow-up and availability." },
];

function DemoField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-center text-[11px] font-semibold tracking-[0.04em] text-[#4369eb] sm:text-[12px]">
        {label}
      </span>
      <div className="mt-3 border-b border-[#cfd3df] pb-3">{children}</div>
    </label>
  );
}

const BentoCard = () => {
  const { t } = useTranslation("marketing");
  const [industry, setIndustry] = useState<DemoIndustryId>("law-firm");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");

  const activeIndustry = useMemo(
    () => DEMO_INDUSTRIES.find((item) => item.id === industry) ?? DEMO_INDUSTRIES[0],
    [industry],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestState("loading");
    setMessage("");

    try {
      const response = await fetch("/.netlify/functions/homepage-demo-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          name,
          phone,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Could not start the demo call.",
        );
      }

      setRequestState("success");
      setMessage(
        `Calling ${payload.phone || phone} now. ${activeIndustry.label} demo selected.`,
      );
    } catch (error) {
      setRequestState("error");
      setMessage(
        error instanceof Error ? error.message : "Could not start the demo call.",
      );
    }
  }

  return (
    <div className="flex w-full items-center justify-center antialiased">
      <div className="w-full sm:hidden">
        <div className="overflow-hidden rounded-[28px] border border-[#d8dce7] bg-[#f3f3f7] px-5 py-6 shadow-[0_20px_60px_rgba(19,35,63,0.08)]">
          <div className="flex justify-center">
            <SiriOrb
              size="190px"
              animationDuration={18}
              className="drop-shadow-[0_18px_44px_rgba(61,108,229,0.18)]"
              colors={{
                c1: "oklch(79% 0.12 343)",
                c2: "oklch(81% 0.11 236)",
                c3: "oklch(73% 0.15 274)",
              }}
            />
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {DEMO_INDUSTRIES.map((item) => {
              const isActive = item.id === industry;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndustry(item.id)}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold tracking-[-0.02em] transition-colors",
                    isActive
                      ? "bg-[#4369eb] text-white shadow-[0_8px_18px_rgba(67,105,235,0.2)]"
                      : "bg-white text-[#13233f] hover:bg-[#eef1f7]",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <h3 className="text-[24px] font-medium leading-[1.04] tracking-[-0.05em] text-[#13233f]">
              Receive a live call from our agent and hear how Boltcall handles real customer conversations.
            </h3>
            <p className="mt-2 text-[12px] text-[#51607b]">{activeIndustry.blurb}</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <DemoField label="Industry">
              <select
                value={industry}
                onChange={(event) => setIndustry(event.target.value as DemoIndustryId)}
                className="w-full bg-transparent text-[18px] font-medium tracking-[-0.04em] text-[#13233f] outline-none"
              >
                {DEMO_INDUSTRIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </DemoField>

            <DemoField label="Name">
              <Input
                type="text"
                label="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
                className="w-full"
                inputClassName="border-[#13233f] pb-1 pt-2 text-[18px] font-normal tracking-[-0.04em] text-[#13233f]"
              />
            </DemoField>

            <DemoField label="Phone Number">
              <Input
                type="tel"
                label="+15551234567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                required
                className="w-full"
                inputClassName="border-[#13233f] pb-1 pt-2 text-[18px] font-normal tracking-[-0.04em] text-[#13233f]"
              />
            </DemoField>

            <div className="pt-1">
              <button
                type="submit"
                disabled={requestState === "loading"}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#091c46] px-4 text-[13px] font-semibold tracking-[-0.03em] text-white transition-colors hover:bg-[#112758] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {requestState === "loading" ? "Calling..." : "Get a call"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className={cn("mt-3 text-[11px] leading-5", requestState === "error" ? "text-[#b42318]" : "text-[#51607b]")}>
                {message || "One number. Multiple demo agents. We route the call by industry."}
              </p>
            </div>
          </form>
        </div>
      </div>

      <div
        className="relative m-0 hidden w-full max-w-5xl transition-all duration-500 hover:-translate-y-1 sm:block"
        style={{ transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)" }}
      >
        <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-gray-900 shadow-2xl">
          <div className="relative space-y-1.5 p-4 sm:p-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/90">
              {t("bentoCard.preview")}
            </h2>
            <p className="max-w-[520px] text-lg font-semibold leading-snug text-white sm:text-2xl">
              {t("bentoCard.tagline")}
            </p>
          </div>

          <div className="relative z-30 h-[360px] w-full overflow-hidden rounded-2xl sm:h-[500px] sm:rounded-[2rem]">
            <div className="absolute inset-x-6 bottom-0 top-12 rounded-3xl border border-white/[0.08] bg-gray-800/40 opacity-80 sm:left-14" />

            <div
              className="absolute inset-y-6 left-8 right-0 flex flex-col overflow-hidden rounded-tl-3xl bg-white sm:left-20"
              style={{ boxShadow: "0 0 0 6px rgba(255,255,255,0.07)" }}
            >
              <div className="relative flex items-center rounded-tl-3xl border-b border-slate-200 bg-white px-5 py-4">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-400/80" />
                  <div className="h-2 w-2 rounded-full bg-amber-400/80" />
                  <div className="h-2 w-2 rounded-full bg-emerald-400/80" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                    Boltcall
                  </span>
                </div>
              </div>

              <div className="flex h-full bg-[#f3f3f7]">
                <div className="flex w-[43%] flex-col items-center justify-center border-r border-[#d8dce7] bg-[#f8f8f8] px-5 py-6">
                  <div className="flex flex-1 items-center justify-center">
                    <SiriOrb
                      size="240px"
                      animationDuration={18}
                      className="drop-shadow-[0_24px_64px_rgba(61,108,229,0.24)]"
                      colors={{
                        c1: "oklch(79% 0.12 343)",
                        c2: "oklch(81% 0.11 236)",
                        c3: "oklch(73% 0.15 274)",
                      }}
                    />
                  </div>

                  <div className="mx-auto mt-5 flex max-w-[300px] flex-wrap justify-center gap-2">
                    {DEMO_INDUSTRIES.map((item) => {
                      const isActive = item.id === industry;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setIndustry(item.id)}
                          className={cn(
                            "inline-flex h-9 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold tracking-[-0.02em] transition-colors",
                            isActive
                              ? "bg-[#4369eb] text-white shadow-[0_8px_18px_rgba(67,105,235,0.2)]"
                              : "bg-[#efeff2] text-[#13233f] hover:bg-[#e6e7ec]",
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-center text-[11px] text-[#51607b]">
                    {activeIndustry.blurb}
                  </p>
                </div>

                <div className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                  <div className="max-w-[340px]">
                    <h3 className="max-w-[340px] text-[21px] font-medium leading-[1.08] tracking-[-0.045em] text-[#13233f] sm:text-[26px]">
                      Receive a live call from our agent and hear how Boltcall handles real customer conversations.
                    </h3>
                  </div>

                  <form className="mt-5 flex flex-1 flex-col" onSubmit={handleSubmit}>
                    <div className="space-y-3">
                      <DemoField label="Industry">
                        <select
                          value={industry}
                          onChange={(event) =>
                            setIndustry(event.target.value as DemoIndustryId)
                          }
                          className="w-full bg-transparent text-[16px] font-medium tracking-[-0.04em] text-[#13233f] outline-none sm:text-[18px]"
                        >
                          {DEMO_INDUSTRIES.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </DemoField>

                      <DemoField label="Name">
                        <Input
                          type="text"
                          label="Your name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          autoComplete="name"
                          required
                          className="w-full"
                          inputClassName="border-[#13233f] pb-1 pt-2 text-[16px] font-normal tracking-[-0.04em] text-[#13233f] sm:text-[18px]"
                        />
                      </DemoField>

                      <DemoField label="Phone Number">
                        <Input
                          type="tel"
                          label="+15551234567"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          autoComplete="tel"
                          required
                          className="w-full"
                          inputClassName="border-[#13233f] pb-1 pt-2 text-[16px] font-normal tracking-[-0.04em] text-[#13233f] sm:text-[18px]"
                        />
                      </DemoField>
                    </div>

                    <div className="mt-auto pt-4">
                      <button
                        type="submit"
                        disabled={requestState === "loading"}
                        className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#091c46] px-4 text-[13px] font-semibold tracking-[-0.03em] text-white transition-colors hover:bg-[#112758] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {requestState === "loading" ? "Calling..." : "Get a call"}
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      <p
                        className={cn("mt-3 max-w-[360px] text-[11px] leading-5", requestState === "error" ? "text-[#b42318]" : "text-[#51607b]")}
                      >
                        {message || "One number. Multiple demo agents. We route the call by industry."}
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BentoCard;
