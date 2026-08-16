import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import SiriOrb from "@/components/ui/siri-orb";

// ponytail: single-industry demo now that Boltcall targets law firms only.
// Was a 6-industry picker (roofers/hvac/plumbers/dental/med-spa); dropped the
// selector UI since a picker with one option is dead weight. Add back an
// industry list + pill/select UI if a second vertical demo is ever needed.
const DEMO_INDUSTRY = "law-firm";

type RequestState = "idle" | "loading" | "success" | "error";

function getRequestErrorMessage(status: number | undefined) {
  if (status === 400) {
    return "Please check your details and use a phone number with its country code.";
  }

  if (status === 429) {
    return "You've requested a few calls recently. Please try again in an hour.";
  }

  return "We're unable to place your call right now. Please try again in a few minutes.";
}

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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestState("loading");
    setMessage("");

    try {
      const response = await fetch("/.netlify/functions/homepage-demo-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: DEMO_INDUSTRY, name, phone }),
      });

      if (!response.ok) {
        throw new Error(getRequestErrorMessage(response.status));
      }

      const payload = await response.json().catch(() => ({}));

      setRequestState("success");
      setMessage(`Calling ${payload.phone || phone} now. Law firm intake demo selected.`);
    } catch (error) {
      setRequestState("error");
      setMessage(
        error instanceof Error ? error.message : getRequestErrorMessage(undefined),
      );
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="overflow-hidden rounded-[32px] border border-[#d8dce7] bg-white shadow-[0_28px_90px_rgba(10,24,54,0.18)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(250px,320px)_1fr]">
          <div className="border-b border-[#d8dce7] px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r">
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
                Hear how Boltcall answers a new-matter call for a law firm, live.
              </p>
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

                {message ? requestState === "error" ? (
                  <div
                    role="alert"
                    className="mt-4 max-w-[460px] rounded-xl border border-[#f1d0cb] bg-[#fff8f7] px-4 py-3 text-sm leading-6 text-[#6b2720]"
                  >
                    {message}
                  </div>
                ) : (
                  <p className="mt-3 max-w-[420px] text-sm leading-6 text-[#51607b]">
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
