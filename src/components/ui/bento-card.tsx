import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
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
};

const DEMO_INDUSTRIES: DemoIndustry[] = [
  { id: "law-firm", label: "Law Firm" },
  { id: "roofers", label: "Roofers" },
  { id: "hvac", label: "HVAC" },
  { id: "plumbers", label: "Plumbers" },
  { id: "dental", label: "Dental" },
  { id: "med-spa", label: "Med Spa" },
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
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4369eb]">
        {label}
      </span>
      <div className="mt-2 border-b border-[#cfd3df] pb-3">{children}</div>
    </label>
  );
}

const BentoCard = () => {
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
        body: JSON.stringify({ industry, name, phone }),
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
      setMessage(`Calling ${payload.phone || phone} now. ${activeIndustry.label} demo selected.`);
    } catch (error) {
      setRequestState("error");
      setMessage(
        error instanceof Error ? error.message : "Could not start the demo call.",
      );
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="overflow-hidden rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,252,0.94))] shadow-[0_28px_90px_rgba(10,24,54,0.18)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(250px,320px)_1fr]">
          <div className="border-b border-[#d8dce7] bg-[#f6f8fc] px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r">
            <div className="mx-auto flex max-w-[240px] flex-col items-center text-center sm:max-w-[280px]">
              <SiriOrb
                size="min(220px, 56vw)"
                animationDuration={18}
                className="drop-shadow-[0_14px_32px_rgba(61,108,229,0.18)] sm:drop-shadow-[0_22px_52px_rgba(61,108,229,0.22)]"
                colors={{
                  c1: "oklch(79% 0.12 343)",
                  c2: "oklch(81% 0.11 236)",
                  c3: "oklch(73% 0.15 274)",
                }}
              />

              <p className="mt-4 text-[13px] leading-5 text-[#51607b] sm:mt-5 sm:text-sm sm:leading-6">
                Pick an industry and Boltcall will route the demo to the right voice flow.
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:mt-5 sm:gap-2">
                {DEMO_INDUSTRIES.map((item) => {
                  const isActive = item.id === industry;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIndustry(item.id)}
                      className={cn(
                        "inline-flex h-8 items-center justify-center rounded-full px-2.5 text-[11px] font-semibold tracking-[-0.02em] transition-colors sm:h-9 sm:px-3 sm:text-[12px]",
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
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-9 lg:px-10">
            <div className="max-w-[560px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4369eb]">
                Live Demo Call
              </p>
              <h3 className="mt-3 text-[28px] font-medium leading-[1.05] tracking-[-0.055em] text-[#13233f] sm:text-[38px]">
                Receive a live call from our agent and hear how Boltcall handles real customer conversations.
              </h3>
            </div>

            <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
              <DemoField label="Industry">
                <select
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value as DemoIndustryId)}
                  className="w-full bg-transparent text-[17px] font-medium tracking-[-0.04em] text-[#13233f] outline-none"
                >
                  {DEMO_INDUSTRIES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </DemoField>

              <div className="hidden sm:block" />

              <DemoField label="Name">
                <Input
                  type="text"
                  label="Your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                  className="w-full"
                  inputClassName="border-[#13233f] pb-1 pt-2 text-[17px] font-normal tracking-[-0.04em] text-[#13233f]"
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
                  inputClassName="border-[#13233f] pb-1 pt-2 text-[17px] font-normal tracking-[-0.04em] text-[#13233f]"
                />
              </DemoField>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={requestState === "loading"}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#091c46] px-5 text-[14px] font-semibold tracking-[-0.03em] text-white transition-colors hover:bg-[#112758] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {requestState === "loading" ? "Calling..." : "Get a call"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {message ? (
                  <p
                    className={cn(
                      "mt-3 max-w-[420px] text-sm leading-6",
                      requestState === "error" ? "text-[#b42318]" : "text-[#51607b]",
                    )}
                  >
                    {message}
                  </p>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BentoCard;
