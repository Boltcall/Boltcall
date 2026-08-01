import React from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useAuth } from '../../contexts/AuthContext';

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const businessName = useDashboardStore((s) => s.businessName);

  // Display business name if set, otherwise fall back to user's name/email
  const displayName = businessName || (user as any)?.user_metadata?.name || user?.email?.split('@')[0] || 'Account';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-zinc-200">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side - Logo and mobile menu */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Logo */}
          <Link 
            to="/" 
            className="text-xl font-bold text-zinc-900 hover:text-zinc-700 transition-colors"
            aria-label="Boltcall - Go to dashboard"
          >
            Boltcall
          </Link>
        </div>
        
        {/* Right side - User info */}
        <div className="flex items-center gap-3">
          {/* Workspace card: gradient initial avatar + label/name */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-[11px] text-zinc-400">Workspace</div>
              <div className="text-sm font-semibold text-zinc-900">{displayName}</div>
            </div>
          </div>

          {/* Plan badge */}
          <span className="text-xs rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700 font-medium">
            Pro
          </span>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
