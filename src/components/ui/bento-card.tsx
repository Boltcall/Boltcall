import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ZapIcon,
  PhoneOff01Icon,
  BubbleChatNotificationIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface TabConfig {
  id: "leads" | "calls" | "messages";
  label: string;
  icon: any;
  badge?: string;
  header: string;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: "leads",
    label: "Leads",
    icon: ZapIcon,
    badge: "24",
    header: "Speed to lead",
    description: "New leads, source mix, and response status.",
  },
  {
    id: "calls",
    label: "Calls",
    icon: PhoneOff01Icon,
    badge: "7",
    header: "Call activity",
    description: "Missed calls recovered and live call outcomes.",
  },
  {
    id: "messages",
    label: "Messages",
    icon: BubbleChatNotificationIcon,
    badge: "3",
    header: "Inbox flow",
    description: "Conversations moving toward booked appointments.",
  },
];

const BentoCard = () => {
  const { t } = useTranslation("marketing");
  const [activeTab, setActiveTab] = useState<TabConfig>(TABS[0]);

  const content = useMemo(() => {
    switch (activeTab.id) {
      case "leads":
        return <LeadsPreview />;
      case "calls":
        return <CallsPreview />;
      case "messages":
        return <MessagesPreview />;
      default:
        return null;
    }
  }, [activeTab.id]);

  return (
    <div className="flex items-center justify-center w-full antialiased">
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

          <div className="relative z-30 h-[360px] w-full overflow-hidden rounded-2xl sm:h-[480px] sm:rounded-[2rem]">
            <div className="absolute left-16 top-16 h-full w-full rounded-3xl border border-white/[0.08] bg-gray-800/40 opacity-80" />

            <div
              className="absolute left-24 top-8 flex h-full w-full flex-col overflow-hidden rounded-tl-3xl bg-white"
              style={{ boxShadow: "0 0 0 6px rgba(255,255,255,0.07)" }}
            >
              <div className="relative flex items-center border-b border-slate-200 bg-white px-5 py-4 rounded-tl-3xl">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-400/80" />
                  <div className="h-2 w-2 rounded-full bg-amber-400/80" />
                  <div className="h-2 w-2 rounded-full bg-emerald-400/80" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                    Boltcall V1
                  </span>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden bg-slate-50">
                <div className="flex w-44 flex-col overflow-hidden border-r border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-3 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Workspace
                    </div>
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[10px] font-semibold text-slate-900">Boltcall HQ</div>
                      <div className="text-[9px] text-slate-500">Speed-to-lead dashboard</div>
                    </div>
                  </div>

                  <div className="sidebar-nav-scroll flex-1 overflow-y-auto p-2 pt-3">
                    <LayoutGroup>
                      <p className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Core Pages
                      </p>
                      {TABS.map((tab) => (
                        <SidebarButton
                          key={tab.id}
                          tab={tab}
                          activeTab={activeTab}
                          setActiveTab={setActiveTab}
                        />
                      ))}
                    </LayoutGroup>
                  </div>
                </div>

                <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-50">
                  <div className="border-b border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <HugeiconsIcon icon={Search01Icon} size={12} className="text-slate-400" />
                        <span className="truncate text-[10px] text-slate-400">
                          Search leads, calls, or conversations...
                        </span>
                      </div>
                      <div className="hidden items-center gap-2 sm:flex">
                        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                          Live
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                          BC
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex flex-1 flex-col gap-3 overflow-hidden p-4 pt-5">
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          {activeTab.header}
                        </h3>
                        <p className="mt-1 text-[11px] leading-tight text-slate-500">
                          {activeTab.description}
                        </p>
                      </div>
                      <div className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700">
                        V1 Preview
                      </div>
                    </header>

                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div
                        key={activeTab.id}
                        initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="flex-1 overflow-hidden"
                      >
                        {content}
                      </motion.div>
                    </AnimatePresence>

                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-50 to-transparent" />
                  </div>
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

const SidebarButton = ({
  tab,
  activeTab,
  setActiveTab,
}: {
  tab: TabConfig;
  activeTab: TabConfig;
  setActiveTab: (tab: TabConfig) => void;
}) => {
  const isActive = activeTab.id === tab.id;
  const Icon = tab.icon;

  return (
    <button
      onClick={() => setActiveTab(tab)}
      className={cn(
        "relative mb-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
        isActive ? "text-blue-700" : "text-slate-500 hover:text-slate-900",
      )}
    >
      <HugeiconsIcon icon={Icon} size={14} className="relative z-10 shrink-0" />
      <span className="relative z-10 truncate font-medium">{tab.label}</span>
      {tab.badge && (
        <span
          className={cn(
            "relative z-10 ml-auto rounded-md px-1.5 py-0.5 text-[8px] leading-none tabular-nums",
            isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500",
          )}
        >
          {tab.badge}
        </span>
      )}
      {isActive && (
        <motion.div
          layoutId="sidebar-pill"
          className="absolute left-0 z-20 h-5 w-[3px] rounded-full bg-blue-600"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      {isActive && (
        <motion.div
          layoutId="sidebar-background"
          className="absolute inset-0 rounded-xl border border-blue-100 bg-blue-50"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
};

const STATUS_TONES: Record<string, string> = {
  New: "bg-blue-50 text-blue-700 border-blue-200",
  Contacted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Booked: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Recovered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Missed: "bg-amber-50 text-amber-700 border-amber-200",
  Draft: "bg-amber-50 text-amber-700 border-amber-200",
};

const LeadsPreview = () => (
  <div className="flex h-full flex-col gap-3">
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "New Leads", value: "24", note: "+12% today" },
        { label: "Avg Reply", value: "27s", note: "First touch" },
        { label: "Booked", value: "11", note: "46% booked" },
      ].map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {item.label}
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <span className="text-lg font-semibold text-slate-900">{item.value}</span>
            <span className="text-[9px] font-medium text-emerald-600">{item.note}</span>
          </div>
        </div>
      ))}
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[1.1fr_0.9fr_0.8fr_0.6fr] border-b border-slate-200 bg-slate-50 px-3 py-2">
        {["Lead", "Source", "Status", "Time"].map((header) => (
          <span key={header} className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {header}
          </span>
        ))}
      </div>
      {[
        { name: "Sarah Kim", source: "Website Form", status: "New", time: "28s" },
        { name: "Mike Torres", source: "Google Ads", status: "Contacted", time: "2m" },
        { name: "Ana Ruiz", source: "Missed Call", status: "Booked", time: "8m" },
        { name: "Tom Bennett", source: "Facebook Ad", status: "Contacted", time: "14m" },
      ].map((lead) => (
        <div
          key={lead.name}
          className="grid grid-cols-[1.1fr_0.9fr_0.8fr_0.6fr] items-center border-b border-slate-100 px-3 py-2 last:border-0"
        >
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-slate-900">{lead.name}</div>
            <div className="text-[9px] text-slate-500">Speed-to-lead active</div>
          </div>
          <span className="text-[10px] text-slate-600">{lead.source}</span>
          <span className={cn("w-fit rounded-full border px-2 py-1 text-[9px] font-semibold", STATUS_TONES[lead.status])}>
            {lead.status}
          </span>
          <span className="text-[10px] font-medium text-slate-500">{lead.time}</span>
        </div>
      ))}
    </div>
  </div>
);

const CallsPreview = () => (
  <div className="flex h-full flex-col gap-3">
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "Calls Today", value: "18", tone: "text-slate-900" },
        { label: "Recovered", value: "7", tone: "text-emerald-600" },
        { label: "Missed", value: "2", tone: "text-amber-600" },
      ].map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {item.label}
          </div>
          <div className={cn("mt-2 text-lg font-semibold", item.tone)}>{item.value}</div>
        </div>
      ))}
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Live Call Feed
        </span>
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-semibold text-emerald-700">
          Agent online
        </span>
      </div>
      <div className="space-y-2 p-3">
        {[
          { name: "Unknown caller", detail: "Missed call text sent in 22 seconds", status: "Recovered", time: "2m ago" },
          { name: "Jenny Parker", detail: "Booked consultation for tomorrow at 3:00 PM", status: "Booked", time: "11m ago" },
          { name: "Carlos M.", detail: "Lead captured, follow-up still running", status: "Contacted", time: "18m ago" },
          { name: "Front desk overflow", detail: "2 missed calls during lunch rush", status: "Missed", time: "42m ago" },
        ].map((call) => (
          <div key={`${call.name}-${call.time}`} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[11px] font-semibold text-slate-900">{call.name}</span>
                <span className={cn("rounded-full border px-2 py-1 text-[9px] font-semibold", STATUS_TONES[call.status])}>
                  {call.status}
                </span>
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-slate-500">{call.detail}</div>
            </div>
            <span className="shrink-0 text-[9px] font-medium text-slate-400">{call.time}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MessagesPreview = () => {
  const threads = [
    { name: "Tom Bennett", preview: "Can I get in this afternoon?", tag: "Draft" },
    { name: "Sarah Kim", preview: "Yes, 3 PM works for me.", tag: "Booked" },
    { name: "Mike Torres", preview: "How soon can someone call me back?", tag: "New" },
  ];

  return (
    <div className="flex h-full gap-3">
      <div className="flex w-[160px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Inbox
        </div>
        <div className="flex-1 space-y-1 p-2">
          {threads.map((thread, index) => (
            <button
              key={thread.name}
              className={cn(
                "w-full rounded-xl border px-2.5 py-2 text-left transition-colors",
                index === 0
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-100 bg-white hover:bg-slate-50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-semibold text-slate-900">{thread.name}</span>
                <span className={cn("rounded-full border px-1.5 py-0.5 text-[8px] font-semibold", STATUS_TONES[thread.tag])}>
                  {thread.tag}
                </span>
              </div>
              <div className="mt-1 truncate text-[9px] text-slate-500">{thread.preview}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-[10px] font-semibold text-slate-900">Tom Bennett</span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-700">
            AI draft ready
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="max-w-[78%] rounded-2xl rounded-tl-md bg-slate-100 px-3 py-2">
            <p className="text-[10px] text-slate-700">Can I get in this afternoon for an estimate?</p>
          </div>
          <div className="self-end max-w-[82%] rounded-2xl rounded-tr-md bg-blue-600 px-3 py-2">
            <p className="text-[10px] text-white">
              We can do 3:00 PM today. Want me to book that now?
            </p>
          </div>
          <div className="mt-auto rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-700">
              Approval Queue
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
              Boltcall drafted the response and held it for review because the lead asked for same-day booking.
            </p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-[9px] font-semibold text-white">
                Approve
              </button>
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold text-slate-600">
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
