/**
 * SidebarV2 — V2 navigation, grouped differently from V1.
 *
 * V1 grouping: Main / Setup / Services / Quality / footer.
 * V2 grouping (calmer, by user intent):
 *   - Home
 *   - Conversations  (Calls + Messages + Leads)
 *   - Agent          (Setup + Agent + Knowledge)
 *   - Insights       (Analytics + QA)
 *   - Growth         (Reputation + Integrations)
 *   - Help           (Help + Settings)
 *
 * All routes point at /v2/* paths — these are the V2 pages mounted by Day 8.
 *
 * Polish layer (2026-06-03):
 *   - "V2" badge upgraded to a gradient pill with Sparkles icon
 *   - Active nav item gets a left accent bar + gradient background
 *   - Section titles separated by a hairline divider for visual rhythm
 *   - Footer escape hatch has a subtle elevation
 *
 * V1 invariant: this file is brand new under src/components/v2/. It never
 * touches V1 sidebar or layout.
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Phone,
  MessageSquare,
  Zap,
  Bot,
  BookOpen,
  BarChart3,
  ClipboardCheck,
  Star,
  Plug,
  HelpCircle,
  Settings,
  Wrench,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarV2Props {
  isOpen: boolean;
  onClose: () => void;
  onBackToV1: () => void;
  backToV1Pending?: boolean;
}

const SidebarV2: React.FC<SidebarV2Props> = ({
  isOpen,
  onClose,
  onBackToV1,
  backToV1Pending = false,
}) => {
  const location = useLocation();

  const sections: NavSection[] = [
    {
      title: 'Home',
      items: [
        { to: '/v2', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Conversations',
      items: [
        { to: '/v2/calls', label: 'Calls', icon: <Phone className="w-4 h-4" /> },
        { to: '/v2/messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
        { to: '/v2/leads', label: 'Leads', icon: <Zap className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Agent',
      items: [
        { to: '/v2/setup', label: 'Setup', icon: <Wrench className="w-4 h-4" /> },
        { to: '/v2/agent', label: 'Agent', icon: <Bot className="w-4 h-4" /> },
        { to: '/v2/knowledge', label: 'Knowledge', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Insights',
      items: [
        { to: '/v2/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
        { to: '/v2/qa', label: 'QA', icon: <ClipboardCheck className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Growth',
      items: [
        { to: '/v2/reputation', label: 'Reputation', icon: <Star className="w-4 h-4" /> },
        { to: '/v2/integrations', label: 'Integrations', icon: <Plug className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Help',
      items: [
        { to: '/v2/help', label: 'Help', icon: <HelpCircle className="w-4 h-4" /> },
        { to: '/v2/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  const isActive = (to: string): boolean => {
    if (to === '/v2') return location.pathname === '/v2' || location.pathname === '/v2/';
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="V2 navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo + V2 badge — gradient pill signals "this is the AI-native dashboard" */}
          <div className="px-6 pt-6 pb-4">
            <Link to="/v2" className="flex items-center gap-2" onClick={onClose}>
              <img
                src="/boltcall_full_logo.png"
                alt="Boltcall"
                className="h-9 w-auto"
                width={140}
                height={36}
                loading="lazy"
                decoding="async"
              />
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-blue-500 px-1.5 py-0.5 rounded shadow-[0_2px_8px_-2px_rgba(59,130,246,0.5)]"
                title="V2 — AI-native dashboard"
              >
                <Sparkles className="w-2.5 h-2.5" />
                V2
              </span>
            </Link>
          </div>

          {/* Navigation — calmer density than V1; hairline divider before each
              section title gives visual rhythm without heavy borders. */}
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            {sections.map((section, idx) => (
              <div key={section.title} className="mb-5">
                <div
                  className={`flex items-center gap-2 px-3 mb-1.5 ${idx === 0 ? '' : 'pt-2'}`}
                >
                  {idx > 0 && (
                    <span className="h-px flex-1 bg-slate-100" aria-hidden="true" />
                  )}
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </p>
                  {idx > 0 && (
                    <span className="h-px flex-1 bg-slate-100" aria-hidden="true" />
                  )}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                          active
                            ? 'bg-gradient-to-r from-blue-50 to-transparent text-blue-700 font-semibold shadow-[inset_2px_0_0_0_rgb(37,99,235)]'
                            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 transition-colors ${
                            active ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Back-to-V1 escape hatch — always visible at the bottom of the sidebar.
              This is the second of two escape hatches (the other lives in the
              topbar). Redundant by design — the user must never feel trapped in V2. */}
          <div className="border-t border-slate-200/80 px-3 py-3 bg-slate-50/50">
            <button
              type="button"
              onClick={onBackToV1}
              disabled={backToV1Pending}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {backToV1Pending ? 'Switching…' : 'Back to classic dashboard'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SidebarV2;
