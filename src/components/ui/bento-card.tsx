import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, PhoneCall } from "lucide-react";
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
      <div
        className="relative m-0 w-full max-w-5xl transition-all duration-500 hover:-translate-y-1"
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

          <div className="relative z-30 h-[360px] w-full overflow-hidden rounded-2xl sm:h-[540px] sm:rounded-[2rem]">
            <div className="absolute left-16 top-16 h-full w-full rounded-3xl border border-white/[0.08] bg-gray-800/40 opacity-80" />

            <div
              className="absolute left-24 top-8 flex h-full w-full flex-col overflow-hidden rounded-tl-3xl bg-white"
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
                <div className="flex w-[46%] flex-col items-center justify-center border-r border-[#d8dce7] bg-[#f8f8f8] px-6 py-8">
                  <div className="flex flex-1 items-center justify-center">
                    <SiriOrb
                      size="286px"
                      animationDuration={18}
                      className="drop-shadow-[0_24px_64px_rgba(61,108,229,0.24)]"
                      colors={{
                        c1: "oklch(79% 0.12 343)",
                        c2: "oklch(81% 0.11 236)",
                        c3: "oklch(73% 0.15 274)",
                      }}
                    />
                  </div>

                  <div className="mx-auto mt-6 flex max-w-[360px] flex-wrap justify-center gap-2">
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

                  <p className="mt-3 text-center text-[12px] text-[#51607b]">
                    {activeIndustry.blurb}
                  </p>
                </div>

                <div className="flex flex-1 flex-col px-7 py-8 sm:px-9 sm:py-9">
                  <div className="max-w-[420px]">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#d7dbeb] bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-[#4369eb]">
                      <PhoneCall className="h-3.5 w-3.5" />
                      LIVE AGENT DEMO
                    </div>
                    <h3 className="mt-4 max-w-[420px] text-[27px] font-medium leading-[1.02] tracking-[-0.055em] text-[#13233f] sm:text-[34px]">
                      Receive a live call from our agent and hear how Boltcall handles real customer conversations.
                    </h3>
                  </div>

                  <form className="mt-8 flex flex-1 flex-col" onSubmit={handleSubmit}>
                    <div className="space-y-5">
                      <DemoField label="Industry">
                        <select
                          value={industry}
                          onChange={(event) =>
                            setIndustry(event.target.value as DemoIndustryId)
                          }
                          className="w-full bg-transparent text-[20px] font-medium tracking-[-0.04em] text-[#13233f] outline-none sm:text-[22px]"
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
                          inputClassName="border-[#13233f] pb-1 pt-2 text-[20px] font-normal tracking-[-0.04em] text-[#13233f] sm:text-[22px]"
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
                          inputClassName="border-[#13233f] pb-1 pt-2 text-[20px] font-normal tracking-[-0.04em] text-[#13233f] sm:text-[22px]"
                        />
                      </DemoField>
                    </div>

                    <div className="mt-auto pt-8">
                      <button
                        type="submit"
                        disabled={requestState === "loading"}
                        className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#091c46] px-5 text-[14px] font-semibold tracking-[-0.03em] text-white transition-colors hover:bg-[#112758] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {requestState === "loading" ? "Calling..." : "Get a call"}
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      <p
                        className={cn(
                          "mt-4 max-w-[400px] text-[12px] leading-5",
                          requestState === "error"
                            ? "text-[#b42318]"
                            : "text-[#51607b]",
                        )}
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
