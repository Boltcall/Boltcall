import React from 'react';
import {
  LayoutDashboard,
  Rocket,
  Inbox,
  PhoneCall,
  PhoneMissed,
  MessageSquare,
  Bell,
  Mic,
  MessageCircle,
  Mail,
  Globe,
  Bot,
  Volume2,
  BookOpen,
  Phone,
  Building2,
  BarChart3,
  Star,
  Plug,
  Settings,
} from 'lucide-react';
import NavItem from './NavItem';
import AgencyNavSection from './AgencyNavSection';
import ClientPortalNavSection from './ClientPortalNavSection';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Grouped nav: plain-language labels so a plumber/dentist owner can find every
// real dashboard page in one click. Groups map to the mental model owners
// actually have — "what leads came in", "where AI answers me", "what to set up".
const NAV_GROUPS: Array<{ heading: string; items: Array<{ to: string; label: string; icon: React.ReactNode }> }> = [
  {
    heading: 'Home',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
      { to: '/dashboard/getting-started', label: 'Getting Started', icon: <Rocket /> },
    ],
  },
  {
    heading: 'Leads & Calls',
    items: [
      { to: '/dashboard/leads', label: 'Leads', icon: <Inbox /> },
      { to: '/dashboard/calls', label: 'Calls', icon: <PhoneCall /> },
      { to: '/dashboard/missed-calls', label: 'Missed Calls', icon: <PhoneMissed /> },
      { to: '/dashboard/messages', label: 'Text Messages', icon: <MessageSquare /> },
      { to: '/dashboard/reminders', label: 'Reminders', icon: <Bell /> },
    ],
  },
  {
    heading: 'Channels',
    items: [
      { to: '/dashboard/ai-receptionist', label: 'Voice Receptionist', icon: <Mic /> },
      { to: '/dashboard/sms', label: 'SMS', icon: <MessageSquare /> },
      { to: '/dashboard/whatsapp', label: 'WhatsApp', icon: <MessageCircle /> },
      { to: '/dashboard/email', label: 'Email', icon: <Mail /> },
      { to: '/dashboard/chat-widget', label: 'Website Chat', icon: <Globe /> },
    ],
  },
  {
    heading: 'Setup',
    items: [
      { to: '/dashboard/agents', label: 'Agents', icon: <Bot /> },
      { to: '/dashboard/voice-library', label: 'Voice Library', icon: <Volume2 /> },
      { to: '/dashboard/knowledge-base', label: 'Knowledge Base', icon: <BookOpen /> },
      { to: '/dashboard/phone-numbers', label: 'Phone Numbers', icon: <Phone /> },
      { to: '/dashboard/business', label: 'Business Details', icon: <Building2 /> },
    ],
  },
  {
    heading: 'Growth',
    items: [
      { to: '/dashboard/analytics', label: 'Analytics', icon: <BarChart3 /> },
      { to: '/dashboard/reputation', label: 'Reputation', icon: <Star /> },
      { to: '/dashboard/integrations', label: 'Integrations', icon: <Plug /> },
    ],
  },
  {
    heading: 'Account',
    items: [
      { to: '/dashboard/settings', label: 'Settings', icon: <Settings /> },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo section */}
          <div className="p-6 border-b border-zinc-200">
            <h1 className="text-xl font-bold text-zinc-900">Boltcall</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-4 overflow-y-auto" aria-label="Main navigation">
            {NAV_GROUPS.map((group) => (
              <div key={group.heading} className="space-y-1">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  {group.heading}
                </h2>
                {group.items.map((item) => (
                  <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
                ))}
              </div>
            ))}
            {/* Render order preserved: ClientPortalNavSection (managed clients)
                → AgencyNavSection (founders). Gates mutually exclusive; each
                returns null when its gate fails. */}
            <ClientPortalNavSection />
            <AgencyNavSection />
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
