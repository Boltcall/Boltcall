import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Building2,
  Settings,
  Volume2
} from 'lucide-react';
import NavItem from './NavItem';
import AgencyNavSection from './AgencyNavSection';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { to: '/dashboard/analytics', label: 'Analytics', icon: <BarChart3 /> },
    { to: '/dashboard/agents', label: 'Agents', icon: <Users /> },
    { to: '/dashboard/voice-library', label: 'Voice Library', icon: <Volume2 /> },
    { to: '/dashboard/business', label: 'Business Details', icon: <Building2 /> },
    { to: '/dashboard/settings', label: 'Settings', icon: <Settings /> },
  ];

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
          <nav className="flex-1 p-4 space-y-2" aria-label="Main navigation">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Main
              </h2>
              {navItems.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </div>
            <AgencyNavSection />
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
