import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ZapIcon,
  PhoneOff01Icon,
  BubbleChatNotificationIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

type TabId = "leads" | "calls" | "messages";

interface TabConfig {
  id: TabId;
  label: string;
  icon: any;
  badge?: string;
}

interface LeadRow {
  id: string;
  name: string;
  source: string;
  status: "New" | "Contacted" | "Booked";
  age: string;
}

interface CallRow {
  id: string;
  caller: string;
  outcome: "Recovered" | "Booked" | "Live" | "Missed";
  detail: string;
  time: string;
}

interface MessageThread {
  id: string;
  name: string;
  status: "Needs review" | "Booked" | "Waiting";
  preview: string;
  inbound: string;
  draft: string;
}

const TABS: TabConfig[] = [
  { id: "leads", label: "Leads", icon: ZapIcon, badge: "24" },
  { id: "calls", label: "Calls", icon: PhoneOff01Icon, badge: "18" },
  { id: "messages", label: "Messages", icon: BubbleChatNotificationIcon, badge: "47" },
];

const LEAD_ROWS: LeadRow[] = [
  { id: "lead-1", name: "Sarah Kim", source: "Website Form", status: "New", age: "27s" },
  { id: "lead-2", name: "Mike Torres", source: "Google Ads", status: "Contacted", age: "2m" },
  { id: "lead-3", name: "Ana Ruiz", source: "Missed Call", status: "Booked", age: "8m" },
  { id: "lead-4", name: "Carlos Mendez", source: "Facebook Ad", status: "Contacted", age: "14m" },
  { id: "lead-5", name: "Jenny Parker", source: "Referral", status: "Booked", age: "22m" },
];

const CALL_ROWS: CallRow[] = [
  {
    id: "call-1",
    caller: "Unknown caller",
    outcome: "Recovered",
    detail: "Missed call text sent in 22 seconds.",
    time: "2m ago",
  },
  {
    id: "call-2",
    caller: "Jenny Parker",
    outcome: "Booked",
    detail: "Same-day estimate booked for 3:00 PM.",
    time: "11m ago",
  },
  {
    id: "call-3",
    caller: "Tom Bennett",
    outcome: "Live",
    detail: "AI agent is qualifying the lead now.",
    time: "Live",
  },
  {
    id: "call-4",
    caller: "Lunch rush overflow",
    outcome: "Missed",
    detail: "Two calls missed, one recovery sequence still pending.",
    time: "42m ago",
  },
];

const MESSAGE_THREADS: MessageThread[] = [
  {
    id: "thread-1",
    name: "Tom Bennett",
    status: "Needs review",
    preview: "Can I get in this afternoon for an estimate?",
    inbound: "Can I get in this afternoon for an estimate?",
    draft: "We can do 3:00 PM today. Want me to lock that in now?",
  },
  {
    id: "thread-2",
    name: "Sarah Kim",
    status: "Booked",
    preview: "Yes, 3 PM works for me.",
    inbound: "Yes, 3 PM works for me.",
    draft: "Perfect, you're confirmed for 3:00 PM. We'll text you when we're on the way.",
  },
  {
    id: "thread-3",
    name: "Mike Torres",
    status: "Waiting",
    preview: "How soon can someone call me back?",
    inbound: "How soon can someone call me back?",
    draft: "A team member can call you in the next 5 minutes. What's the best number?",
  },
];

const FILTERS = ["All", "New", "Booked"] as const;
const CALL_VIEWS = ["All", "Recovered", "Live"] as const;

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

              <div className="flex flex-1 overflow-hidden bg-slate-50">
                <div className="flex w-44 flex-col overflow-hidden border-r border-slate-200 bg-white">
                  <div className="sidebar-nav-scroll flex-1 overflow-y-auto p-2 pt-3">
                    <LayoutGroup>
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
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Dashboard Preview
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-slate-600">
                          Interactive V1-inspired screens
                        </div>
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
  New: "border-blue-200 bg-blue-50 text-blue-700",
  Contacted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Booked: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Recovered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Live: "border-blue-200 bg-blue-50 text-blue-700",
  Missed: "border-amber-200 bg-amber-50 text-amber-700",
  "Needs review": "border-amber-200 bg-amber-50 text-amber-700",
  Waiting: "border-slate-200 bg-slate-100 text-slate-600",
};

const PreviewShell = ({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex h-full flex-col overflow-hidden p-4 pt-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</h3>
        <p className="mt-1 text-[11px] leading-tight text-slate-500">{description}</p>
      </div>
      {actions}
    </div>
    <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
  </div>
);

const FilterPill = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "rounded-full border px-2.5 py-1 text-[9px] font-semibold transition-colors",
      active
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700",
    )}
  >
    {children}
  </button>
);

const StatCard = ({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div>
    <div className="mt-2 flex items-end justify-between gap-2">
      <span className="text-lg font-semibold text-slate-900">{value}</span>
      <span className="text-[9px] font-medium text-emerald-600">{note}</span>
    </div>
  </div>
);

const LeadsPreview = () => {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All");
  const [selectedLeadId, setSelectedLeadId] = useState<string>(LEAD_ROWS[0].id);

  const filteredRows =
    activeFilter === "All"
      ? LEAD_ROWS
      : LEAD_ROWS.filter((lead) => lead.status === activeFilter);

  const selectedLead =
    filteredRows.find((lead) => lead.id === selectedLeadId) ?? filteredRows[0] ?? LEAD_ROWS[0];

  return (
    <PreviewShell
      title="Speed To Lead"
      description="Fast-moving lead queue with working filters and row selection."
      actions={
        <div className="flex items-center gap-2">
          {FILTERS.map((filter) => (
            <FilterPill
              key={filter}
              active={activeFilter === filter}
              onClick={() => {
                setActiveFilter(filter);
                const firstMatch =
                  filter === "All"
                    ? LEAD_ROWS[0]
                    : LEAD_ROWS.find((lead) => lead.status === filter);
                if (firstMatch) setSelectedLeadId(firstMatch.id);
              }}
            >
              {filter}
            </FilterPill>
          ))}
        </div>
      }
    >
      <div className="flex h-full flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="New Leads" value="24" note="+12% today" />
          <StatCard label="Avg Reply" value="27s" note="first touch" />
          <StatCard label="Booked" value="11" note="46% booked" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1.45fr_0.95fr] gap-3">
          <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1.1fr_0.9fr_0.8fr_0.55fr] border-b border-slate-200 bg-slate-50 px-3 py-2">
              {["Lead", "Source", "Status", "Age"].map((header) => (
                <span
                  key={header}
                  className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400"
                >
                  {header}
                </span>
              ))}
            </div>
            <div className="max-h-full overflow-y-auto">
              {filteredRows.map((lead) => {
                const selected = lead.id === selectedLead.id;
                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={cn(
                      "grid w-full grid-cols-[1.1fr_0.9fr_0.8fr_0.55fr] items-center border-b border-slate-100 px-3 py-2 text-left transition-colors last:border-0",
                      selected ? "bg-blue-50/70" : "hover:bg-slate-50",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-slate-900">{lead.name}</div>
                      <div className="text-[9px] text-slate-500">Instant follow-up enabled</div>
                    </div>
                    <span className="text-[10px] text-slate-600">{lead.source}</span>
                    <span
                      className={cn(
                        "w-fit rounded-full border px-2 py-1 text-[9px] font-semibold",
                        STATUS_TONES[lead.status],
                      )}
                    >
                      {lead.status}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">{lead.age}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Selected Lead
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{selectedLead.name}</div>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-1 text-[9px] font-semibold",
                  STATUS_TONES[selectedLead.status],
                )}
              >
                {selectedLead.status}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Next Action
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                  AI already replied. Next step is confirming the appointment window and routing to the calendar.
                </p>
              </div>
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-semibold text-white">
                Open Lead
                <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
};

const CallsPreview = () => {
  const [view, setView] = useState<(typeof CALL_VIEWS)[number]>("All");
  const visibleCalls =
    view === "All" ? CALL_ROWS : CALL_ROWS.filter((call) => call.outcome === view);

  return (
    <PreviewShell
      title="Call History"
      description="Recovery view with quick outcome filters and a live feed feel."
      actions={
        <div className="flex items-center gap-2">
          {CALL_VIEWS.map((option) => (
            <FilterPill key={option} active={view === option} onClick={() => setView(option)}>
              {option}
            </FilterPill>
          ))}
        </div>
      }
    >
      <div className="flex h-full flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Calls Today" value="18" note="steady volume" />
          <StatCard label="Recovered" value="7" note="39% saved" />
          <StatCard label="Booked" value="5" note="same-day wins" />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Live Feed
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
              Agent online
            </span>
          </div>
          <div className="max-h-full space-y-2 overflow-y-auto p-3">
            {visibleCalls.map((call) => (
              <button
                key={call.id}
                className="flex w-full items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-left transition-colors hover:bg-slate-100/80"
              >
                <div className={cn("mt-0.5 h-2.5 w-2.5 rounded-full", call.outcome === "Live" ? "bg-emerald-500" : "bg-blue-500")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[11px] font-semibold text-slate-900">{call.caller}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-1 text-[9px] font-semibold",
                        STATUS_TONES[call.outcome],
                      )}
                    >
                      {call.outcome}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed text-slate-500">{call.detail}</div>
                </div>
                <span className="shrink-0 text-[9px] font-medium text-slate-400">{call.time}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </PreviewShell>
  );
};

const MessagesPreview = () => {
  const [selectedThreadId, setSelectedThreadId] = useState<string>(MESSAGE_THREADS[0].id);
  const [approvedThreadIds, setApprovedThreadIds] = useState<string[]>([]);

  const selectedThread =
    MESSAGE_THREADS.find((thread) => thread.id === selectedThreadId) ?? MESSAGE_THREADS[0];
  const isApproved = approvedThreadIds.includes(selectedThread.id);

  return (
    <PreviewShell
      title="Messages"
      description="Thread switching plus an approval action that updates the preview state."
      actions={
        <div className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[9px] font-semibold text-blue-700">
          Inbox active
        </div>
      }
    >
      <div className="flex h-full gap-3">
        <div className="flex w-[170px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Conversations
          </div>
          <div className="flex-1 space-y-1 p-2">
            {MESSAGE_THREADS.map((thread) => {
              const selected = thread.id === selectedThread.id;
              const threadApproved = approvedThreadIds.includes(thread.id);

              return (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={cn(
                    "w-full rounded-xl border px-2.5 py-2 text-left transition-colors",
                    selected
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-100 bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-semibold text-slate-900">{thread.name}</span>
                    <span
                      className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[8px] font-semibold",
                        STATUS_TONES[threadApproved ? "Booked" : thread.status],
                      )}
                    >
                      {threadApproved ? "Sent" : thread.status}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-[9px] text-slate-500">{thread.preview}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-[10px] font-semibold text-slate-900">{selectedThread.name}</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-700">
              {isApproved ? "Approved" : "AI draft ready"}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2 p-3">
            <div className="max-w-[78%] rounded-2xl rounded-tl-md bg-slate-100 px-3 py-2">
              <p className="text-[10px] text-slate-700">{selectedThread.inbound}</p>
            </div>
            <div className="self-end max-w-[82%] rounded-2xl rounded-tr-md bg-blue-600 px-3 py-2">
              <p className="text-[10px] text-white">{selectedThread.draft}</p>
            </div>

            <div
              className={cn(
                "mt-auto rounded-2xl border p-3 transition-colors",
                isApproved ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
              )}
            >
              <div
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-[0.2em]",
                  isApproved ? "text-emerald-700" : "text-amber-700",
                )}
              >
                {isApproved ? "Sent To Lead" : "Approval Queue"}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                {isApproved
                  ? "The reply was approved and the conversation moved forward toward booking."
                  : "Boltcall drafted the response and held it for review because the lead asked for same-day booking."}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    setApprovedThreadIds((current) =>
                      current.includes(selectedThread.id)
                        ? current
                        : [...current, selectedThread.id],
                    )
                  }
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[9px] font-semibold",
                    isApproved ? "bg-emerald-600 text-white" : "bg-slate-900 text-white",
                  )}
                >
                  <HugeiconsIcon
                    icon={isApproved ? CheckmarkCircle02Icon : Calendar03Icon}
                    size={12}
                  />
                  {isApproved ? "Approved" : "Approve"}
                </button>
                <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold text-slate-600">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
};
