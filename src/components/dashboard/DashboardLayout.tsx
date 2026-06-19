import React, { useState, useEffect, useRef } from 'react';
import NotificationsWithActions from '../ui/notifications-with-actions';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Bot,
  BookOpen,

  Settings,
  Menu,
  X,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  UserPlus,
  Calendar,
  Phone,
  FileText,
  Ticket,
  Crown,
  Server,
  Globe,
  Plug,
  Zap,
  PhoneMissed,
  Reply,
  Mail,
  ClipboardList,
  ListChecks,
  TrendingUp,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { addLogEntry, logUserAction } from '../../lib/logging';
import { supabase } from '../../lib/supabase';
import { LocationSwitcher } from './LocationSwitcher';
import { useDirection } from '../../hooks/useDirection';
import UsageBanner from './UsageBanner';
import UsageLimitModal from './UsageLimitModal';
import TrialExpiryPopup from './TrialExpiryPopup';
import PageInfoTooltip from '../ui/PageInfoTooltip';
import FeedbackSlider from '../ui/feedback-slider';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useAgentMilestoneAlerts } from '../../hooks/useAgentMilestoneAlerts';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const DashboardLayout: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const dir = useDirection();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [showGettingStartedBox, setShowGettingStartedBox] = useState(() => {
    return localStorage.getItem('gettingStartedBoxDismissed') !== 'true';
  });
  // sidebarHovered removed — collapsed sidebar shows tooltips instead of expanding
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHelpSidebar, setShowHelpSidebar] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  // Language switcher removed
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const [showLanguageExpanded, setShowLanguageExpanded] = useState(false);
  const [pendingQACount, setPendingQACount] = useState(0);

  // Get current user from auth context
  const { user } = useAuth();
  const { alerts } = useDashboardStore();
  const milestoneAlerts = useAgentMilestoneAlerts();
  const allAlerts = [...milestoneAlerts, ...alerts];
  
  // Mock user plan - in real app, this would come from user context/API
  const userPlan: 'free' | 'pro' | 'elite' = 'free';
  
  


  // Services status — loaded from Supabase business_features + facebook_page_connections
  const [services, setServices] = useState({
    aiReceptionist: false,
    phoneSystem: false,
    sms: false,
    whatsapp: false,
    websiteBubble: false,
    reminders: false,
    reputation: false,
    instantLeadResponse: false,
  });

  // Fetch pending QA review count for sidebar badge
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('qa_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .then(({ count }) => { if (count != null) setPendingQACount(count); });
  }, [user?.id]);

  // Log dashboard access when component mounts
  useEffect(() => {
    if (user?.id) {
      addLogEntry('Dashboard Access', 'User accessed dashboard', user.id);
    }
  }, [user?.id]);

  // Show feedback popup randomly — 25% chance, no more than once per 7 days
  useEffect(() => {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const lastShown = Number(localStorage.getItem('feedbackPopupLastShown') || 0);
    const cooldownPassed = Date.now() - lastShown > SEVEN_DAYS;
    if (!cooldownPassed || Math.random() > 0.25) return;
    const timer = setTimeout(() => {
      setShowFeedback(true);
      localStorage.setItem('feedbackPopupLastShown', String(Date.now()));
    }, 45_000);
    return () => clearTimeout(timer);
  }, []);

  // Load real service statuses from Supabase
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const [{ data: features }, { data: fbConnections }, { data: waSettings }] = await Promise.all([
          supabase
            .from('business_features')
            .select('ai_receptionist_enabled, phone_system_enabled, sms_enabled, chat_widget_enabled, reminders_enabled, reminders_config, reputation_manager_enabled, reputation_manager_config')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('facebook_page_connections')
            .select('id')
            .or(`workspace_id.eq.${user.id},user_id.eq.${user.id}`)
            .limit(1),
          supabase
            .from('whatsapp_settings')
            .select('is_enabled')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        setServices({
          aiReceptionist: features?.ai_receptionist_enabled ?? false,
          phoneSystem: features?.phone_system_enabled ?? false,
          sms: features?.sms_enabled ?? false,
          whatsapp: waSettings?.is_enabled ?? false,
          websiteBubble: features?.chat_widget_enabled ?? false,
          reminders: features?.reminders_enabled ?? false,
          reputation: !!(features?.reputation_manager_enabled || features?.reputation_manager_config?.google_review_url),
          instantLeadResponse: (fbConnections?.length ?? 0) > 0,
        });
      } catch {
        // Silently fail — will show defaults (all off)
      }
    })();
  }, [user?.id]);

  // Scrollbar auto-hide functionality
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      setScrollbarVisible(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setScrollbarVisible(false);
      }, 3000); // Hide after 3 seconds of inactivity
    };

    const mainElement = mainContentRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll, { passive: true });
      mainElement.addEventListener('mouseenter', () => setScrollbarVisible(true));
      mainElement.addEventListener('mouseleave', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          setScrollbarVisible(false);
        }, 3000);
      });
    }

    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
        mainElement.removeEventListener('mouseenter', () => setScrollbarVisible(true));
        mainElement.removeEventListener('mouseleave', () => {});
      }
      clearTimeout(scrollTimeout);
    };
  }, []);

  const location = useLocation();
  const { logout } = useAuth();
  const mainContentRef = useRef<HTMLElement>(null);

  // Scroll main content to top on route change + update page title
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
    // Update document title based on current page
    const pageName = getPageName();
    document.title = `${pageName} | Boltcall Dashboard`;
  }, [location.pathname]);

  // Get current page name based on route
  const getPageName = () => {
    const path = location.pathname;

    // Define page name mappings using i18n keys
    const pageNames: Record<string, string> = {
      '/dashboard': t('page.overview'),
      '/dashboard/leads': t('page.leads'),
      '/dashboard/calls': t('page.calls'),
      '/dashboard/messages': t('page.messages'),
      '/dashboard/sms': 'SMS Agent',
      '/dashboard/instant-lead-response': t('page.instantLeadResponse'),
      '/dashboard/website-instant-response': 'Website Instant Response',
      '/dashboard/ad-instant-response': 'Ad Instant Response',
      '/dashboard/ai-receptionist': 'AI Receptionist',
      '/dashboard/agents': t('page.aiAgents'),
      '/dashboard/knowledge-base': t('page.knowledgeBase'),
      '/dashboard/phone': t('page.phoneNumbers'),
      '/dashboard/chat-widget': t('page.chatWidget'),
      '/dashboard/integrations': t('page.integrations'),
      '/dashboard/analytics': t('page.analytics'),
      '/dashboard/settings': t('page.settings'),
      '/dashboard/settings/members': t('page.teamMembers'),
      '/dashboard/settings/plan-billing': t('page.planBilling'),
    };

    // Settings pages always show "Settings"
    if (path.startsWith('/dashboard/settings')) {
      return t('page.settings');
    }

    // Agent detail pages — show "AI Agents" instead of the raw UUID
    if (path.startsWith('/dashboard/agents/')) {
      return t('page.aiAgents');
    }

    // Return mapped name or convert path to title case
    if (pageNames[path]) {
      return pageNames[path];
    }

    // Fallback: convert path to title case
    const pathSegments = path.split('/').filter(Boolean);
    const pageSegment = pathSegments[pathSegments.length - 1] || 'dashboard';

    return pageSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Page-specific tooltips — only shown on pages where extra context helps
  const getPageTooltip = (): string | null => {
    const path = location.pathname;
    const tooltips: Record<string, string> = {
      '/dashboard/chat-widget': 'Add an AI chat widget to your website to capture leads 24/7',
      '/dashboard/integrations': 'Connect your CRM, calendar, and other tools to sync data automatically',
    };
    return tooltips[path] || null;
  };

  // Add dashboard-page class to body for normal scrolling
  useEffect(() => {
    document.body.classList.add('dashboard-page');
    return () => {
      document.body.classList.remove('dashboard-page');
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };




  const handleLogout = async () => {
    try {
      if (user?.id) {
        await logUserAction('User Logout', 'User logged out from dashboard', user.id);
      }
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };





  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('[data-user-menu]')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  // Load dark mode preference on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Apply dark mode class when isDarkMode changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Focus main content area to ensure mouse wheel events work
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.focus();
    }
  }, []);

  // MAIN
  const navItemsMain = [
    { to: '/dashboard', label: t('nav.overview'), icon: <LayoutDashboard className="w-3.5 h-3.5 scale-[0.95]" /> },
    { to: '/dashboard/leads', label: t('nav.leads'), icon: <Zap className="w-3.5 h-3.5 scale-[0.95]" /> },
    { to: '/dashboard/calls', label: t('nav.calls'), icon: <Phone className="w-3.5 h-3.5 scale-[0.95]" /> },
  ];

  // SERVICES
  const navItemsServices = [
    { to: '/dashboard/ai-receptionist', label: t('nav.aiReceptionist'), icon: <Bot className="w-3.5 h-3.5 scale-[0.95]" />, needsSetup: !services.aiReceptionist },
    { to: '/dashboard/calls', label: t('nav.missedCalls'), icon: <PhoneMissed className="w-3.5 h-3.5 scale-[0.95]" />, badge: t('beta') as string, needsSetup: !services.phoneSystem },
    { to: '/dashboard/sms', label: 'SMS Agent', icon: <MessageSquare className="w-3.5 h-3.5 scale-[0.95]" /> },
    { to: '/dashboard/whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon className="w-3.5 h-3.5 scale-[0.95]" />, badge: 'Coming Soon', needsSetup: !services.whatsapp },
    { to: '/dashboard/website-instant-response', label: 'Website Response', icon: <Globe className="w-3.5 h-3.5 scale-[0.95]" />, needsSetup: !services.instantLeadResponse },
    { to: '/dashboard/ad-instant-response', label: 'Ad Response', icon: <Reply className="w-3.5 h-3.5 scale-[0.95]" /> },
    { to: '/dashboard/email', label: 'AI Email', icon: <Mail className="w-3.5 h-3.5 scale-[0.95]" /> },
  ];

  // SETUP
  const navItemsSetup = [
    { to: '/dashboard/agents', label: t('nav.aiAgents'), icon: <Bot className="w-3.5 h-3.5 scale-[0.95]" /> },
    { to: '/dashboard/knowledge-base', label: t('nav.knowledgeBase'), icon: <BookOpen className="w-3.5 h-3.5 scale-[0.95]" /> },
    { to: '/dashboard/phone', label: t('nav.phoneNumbers'), icon: <Phone className="w-3.5 h-3.5 scale-[0.95]" /> },
    { to: '/dashboard/integrations', label: t('nav.integrations'), icon: <Plug className="w-3.5 h-3.5 scale-[0.95]" /> },
  ];

  const navItemsQuality = [
    { to: '/dashboard/qa/rubrics',   label: 'QA Rubrics',    icon: <ClipboardList className="w-3.5 h-3.5 scale-[0.95]" /> },
    { to: '/dashboard/qa/review',    label: 'Review Queue',  icon: <ListChecks className="w-3.5 h-3.5 scale-[0.95]" />, badge: pendingQACount > 0 ? String(pendingQACount) : undefined },
    { to: '/dashboard/qa/analytics', label: 'QA Analytics',  icon: <TrendingUp className="w-3.5 h-3.5 scale-[0.95]" /> },
  ];

  const navItemsFooter = [
    { to: '/dashboard/settings', label: t('nav.settings'), icon: <Settings className="w-5 h-5 scale-[0.95]" />, onboardingId: 'nav-settings' },
    { to: '/help-center', label: t('nav.helpCenter'), icon: <HelpCircle className="w-5 h-5 scale-[0.95]" /> },
  ];



  // Helper function to render navigation items
  const renderNavItem = (item: any, isActive: boolean, extraClassName = '') => {
    const isCollapsedView = sidebarCollapsed;
    const sharedClassName = `relative flex items-center ${isCollapsedView ? 'justify-center' : 'gap-2 w-full'} px-2 py-2 rounded-lg text-xs font-medium transition-all duration-700 group ${extraClassName} ${
      isActive
        ? isDarkMode
          ? 'bg-[#1a1a1f] text-white'
          : 'bg-blue-50 text-blue-700'
        : isDarkMode
          ? 'text-white hover:bg-[#1a1a1f]'
          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-300/30'
    }`;
    const innerContent = (
      <>
        <span className={`relative flex items-center ${isCollapsedView ? '' : '-mt-[5px]'}`}>
          {item.icon}
        </span>
        {/* Custom tooltip — card to the outside of icon (flips for RTL) */}
        {isCollapsedView && (
          <span className="absolute left-full ml-2 px-2.5 py-1.5 text-xs font-medium text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1f] rounded-lg shadow-lg border border-gray-200 dark:border-[#2a2a30] whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
            {item.label}
          </span>
        )}
        {!isCollapsedView && (
          <span className="relative pb-1">
            {item.label}
            <div className={`absolute -bottom-1 left-0 h-0.5 bg-blue-600 ${
              isActive ? 'w-full' : 'w-0 group-hover:w-full'
            }`}
            style={{
              transition: isActive
                ? 'width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                : 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </span>
        )}
        {!isCollapsedView && item.badge && (
          <span className={`ml-auto px-1.5 py-0.5 text-[9px] font-semibold rounded-full leading-none ${
            item.badge === 'Beta'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : item.badge === 'Coming Soon'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {item.badge}
          </span>
        )}
      </>
    );
    if (item.href) {
      return (
        <a
          key={item.to}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          data-onboarding={item.onboardingId || `nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          onClick={closeSidebar}
          className={sharedClassName}
        >
          {innerContent}
        </a>
      );
    }
    return (
      <Link
        key={item.to}
        to={item.to}
        data-onboarding={item.onboardingId || `nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={closeSidebar}
        className={sharedClassName}
      >
        {innerContent}
      </Link>
    );
  };

  return (
    <ToastProvider>
      <div className="h-screen flex transition-colors duration-300 gap-0 md:gap-4 bg-gray-100 dark:bg-[#0a0a0c]">
      <div className="flex flex-1 overflow-hidden gap-0 md:gap-4">
         {/* Left Panel - Navigation with Logo at Top */}
         <aside
           data-onboarding="sidebar"
           className={`fixed lg:static inset-y-0 left-0 z-[9999] transform transition-all duration-300 ease-in-out flex-shrink-0 ${
             sidebarCollapsed ? 'w-16' : 'w-64'
           } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} bg-white dark:bg-[#111114] rounded-2xl shadow-lg m-2 dashboard-sidebar lg:z-40 relative group/sidebar`}
         >
          {/* Collapse/Expand toggle arrow — fixed position so it doesn't shift on collapse */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex fixed top-8 z-50 w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#2a2a30] shadow-md items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200"
            style={{
              [dir === 'rtl' ? 'right' : 'left']: sidebarCollapsed ? 'calc(4rem + 0.5rem - 20px)' : 'calc(16rem + 0.5rem - 20px)',
              transition: dir === 'rtl' ? 'right 300ms ease-in-out' : 'left 300ms ease-in-out',
            }}
            aria-label={sidebarCollapsed ? t('topbar.expandSidebar') : t('topbar.collapseSidebar')}
          >
            {sidebarCollapsed
              ? (dir === 'rtl' ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)
              : (dir === 'rtl' ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />)
            }
          </button>

          <div className="flex flex-col h-full pt-2 pb-4">
            {/* Logo at Top - Aligned Left */}
            <div className="mb-2 px-2">
            <Link
              to="/dashboard"
              className="flex items-center justify-start"
            >
              {sidebarCollapsed ? (
                <img
                  src="/boltcall_small_logo.png"
                  alt="Boltcall"
                  className="h-10 w-10 mx-auto"
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <img
                  src="/boltcall_full_logo.png"
                  alt="Boltcall"
                  className="h-14 w-auto"
                  width={160}
                  height={56}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </Link>
          </div>

            {/* Getting Started box — top, below logo */}
            {showGettingStartedBox && !sidebarCollapsed && (
              <div className="mx-2 mb-2">
                <Link
                  to="/dashboard/getting-started"
                  onClick={closeSidebar}
                  className="block rounded-lg border border-gray-200 dark:border-[#1e1e24] bg-gray-50 dark:bg-[#0e0e11] overflow-hidden hover:bg-gray-100 dark:hover:bg-[#1a1a1f] transition-colors"
                >
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">Getting Started</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-medium">4 of 7</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          localStorage.setItem('gettingStartedBoxDismissed', 'true');
                          setShowGettingStartedBox(false);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        aria-label="Dismiss"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mx-3 mb-2.5 h-1.5 rounded-full bg-gray-200 dark:bg-[#1e1e24] overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '57%' }} />
                  </div>
                </Link>
              </div>
            )}

            {/* Ask Boltcall Agent button */}
            {!sidebarCollapsed && (
              <div className="mx-2 mb-2">
                <Link
                  to="/dashboard/boltcall-agent"
                  onClick={closeSidebar}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs font-semibold">Ask Boltcall Agent</span>
                </Link>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="mx-2 mb-2 flex justify-center">
                <Link
                  to="/dashboard/boltcall-agent"
                  onClick={closeSidebar}
                  title="Ask Boltcall Agent"
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <Zap className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* User profile moved to top-right bar */}

            {/* Mobile menu button */}
              <button
                onClick={toggleSidebar}
                className={`lg:hidden absolute top-2 right-2 p-2 rounded-md transition-colors ${
           isDarkMode
                    ? 'text-gray-300 hover:text-white hover:bg-[#1a1a1f]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300/50'
                }`}
                aria-label="Toggle navigation menu"
              >
                <X className="w-5 h-5" />
              </button>


            {/* Navigation — scrollbar hidden by default, visible on sidebar hover */}
            <nav className="flex-1 flex flex-col overflow-y-auto sidebar-nav-scroll" aria-label="Main navigation">
              <div className="flex-1 px-2">
                {/* Main */}
                <div className="space-y-1 mb-4">
                  {navItemsMain.map((item) => {
                    const isActive = location.pathname === item.to;
                    return renderNavItem(item, isActive);
                  })}
                </div>

                {/* Setup */}
                <div className="mb-4" data-onboarding="section-setup">
                  {!(sidebarCollapsed) && (
                    <p className={`px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('nav.section.setup')}</p>
                  )}
                  {sidebarCollapsed && <div className="border-t border-gray-200 dark:border-[#1e1e24] my-2 mx-2" />}
                  <div className="space-y-1">
                    {navItemsSetup.map((item) => {
                      const isActive = location.pathname === item.to;
                      return renderNavItem(item, isActive);
                    })}
                  </div>
                </div>

                {/* Services */}
                <div className="mb-4" data-onboarding="section-services">
                  {!(sidebarCollapsed) && (
                    <p className={`px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('nav.section.services')}</p>
                  )}
                  {sidebarCollapsed && <div className="border-t border-gray-200 dark:border-[#1e1e24] my-2 mx-2" />}
                  <div className="space-y-1">
                    {navItemsServices.map((item) => {
                      const isActive = location.pathname === item.to;
                      return renderNavItem(item, isActive);
                    })}
                  </div>
                </div>

                {/* Quality */}
                <div className="mb-4">
                  {!(sidebarCollapsed) && (
                    <p className={`px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Quality</p>
                  )}
                  {sidebarCollapsed && <div className="border-t border-gray-200 dark:border-[#1e1e24] my-2 mx-2" />}
                  <div className="space-y-1">
                    {navItemsQuality.map((item) => {
                      const isActive = location.pathname.startsWith(item.to);
                      return renderNavItem(item, isActive);
                    })}
                  </div>
                </div>

              </div>

              {/* Footer Group - Always at very bottom */}
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-[#1e1e24] px-2">
                <div className={sidebarCollapsed ? 'space-y-1' : 'flex gap-0 items-center'}>
                  {navItemsFooter.map((item, idx) => {
                    const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                    if (sidebarCollapsed) {
                      return renderNavItem(item, isActive);
                    }
                    return (
                      <React.Fragment key={item.to}>
                        {idx > 0 && (
                          <div className="w-px h-5 flex-shrink-0 bg-gray-200 dark:bg-[#1e1e24] mx-0.5" />
                        )}
                        <div className="flex-1 min-w-0">{renderNavItem(item, isActive)}</div>
                      </React.Fragment>
                    );
                  })}
                </div>

              </div>

            </nav>
            
            {/* Spacer */}
            <div className="mt-auto" />
            
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998] lg:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

         {/* Right Panel - Main Content with Top Bar */}
         <main 
           ref={mainContentRef}
           className={`flex-1 overflow-y-auto transition-colors duration-300 rounded-none md:rounded-2xl bg-white dark:bg-[#0e0e11] shadow-lg m-0 md:m-2 dashboard-main-scroll ${
             scrollbarVisible ? 'scrollbar-visible' : 'scrollbar-hidden'
           }`}
           style={{
             scrollBehavior: 'auto',
             WebkitOverflowScrolling: 'touch',
             overscrollBehavior: 'contain'
           }}
           tabIndex={0}
         >
           {/* Top Bar - Page Header */}
           <div className="sticky top-0 z-10 flex-shrink-0 transition-colors duration-300 bg-white/80 backdrop-blur-sm">
             <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-6">
               {/* Left side - Mobile menu button and Page Name */}
               <div className="flex items-center gap-2 md:gap-3 min-w-0">
                 <button
                   onClick={toggleSidebar}
                   className={`lg:hidden p-2 rounded-md transition-colors flex-shrink-0 ${
                     isDarkMode
                       ? 'text-gray-300 hover:text-white hover:bg-[#1a1a1f]'
                       : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300/30'
                   }`}
                   aria-label="Toggle navigation menu"
                 >
                   <Menu className="w-5 h-5" />
                 </button>

                 {/* Page Name Header */}
                 <div className="flex items-center gap-2 min-w-0">
                   <div className={`w-1 h-5 md:h-6 rounded-full flex-shrink-0 ${
                     isDarkMode ? 'bg-blue-400' : 'bg-blue-600'
                   }`}></div>
                   <h1 className={`text-lg md:text-2xl font-bold truncate ${
                     isDarkMode ? 'text-white' : 'text-gray-900'
                   }`}>
                     {getPageName()}
                   </h1>
                   {getPageTooltip() && (
                     <span className="self-start -mt-1 ml-0.5">
                       <PageInfoTooltip text={getPageTooltip()!} />
                     </span>
                   )}
                 </div>
               </div>
          
              {/* Right side - Free Trial, Toggle, Location switcher, Notifications */}
              <div className="flex items-center gap-1 md:gap-3">
                <div className="hidden md:block">
                  <LocationSwitcher />
                </div>

                 
                 {/* Alerts Dropdown (hidden on mobile) */}
                 <div className="hidden md:block">
                   <NotificationsWithActions alerts={allAlerts} />
                 </div>

                 {/* Services Status Dropdown (hidden on mobile) */}
                 <div className="relative group hidden md:block">
                   <button
                     className="p-2 rounded-lg transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-300/30 relative"
                     aria-label="Services status"
                   >
                     <Server className="w-5 h-5" />
                   </button>

                   {/* Services Dropdown — minimal list */}
                   <div className="absolute right-0 top-full mt-2 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                     <div className={`rounded-lg shadow-lg border py-2 ${isDarkMode ? 'bg-[#111114] border-[#1e1e24]' : 'bg-white border-gray-200'}`}>
                       <div className="px-3 py-1.5 mb-1">
                         <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('topbar.services')}</span>
                       </div>

                       {([
                         { key: 'aiReceptionist' as const, label: 'AI Receptionist', icon: <Bot className="w-4 h-4" />, enabled: services.aiReceptionist, configLink: '/dashboard/agents' },
                         { key: 'phoneSystem' as const, label: 'Phone System', icon: <Phone className="w-4 h-4" />, enabled: services.phoneSystem, configLink: '/dashboard/phone' },
                         { key: 'sms' as const, label: 'SMS Agent', icon: <MessageSquare className="w-4 h-4" />, enabled: services.sms, configLink: '/dashboard/messages' },
                         { key: 'websiteBubble' as const, label: 'Website Widget', icon: <Globe className="w-4 h-4" />, enabled: services.websiteBubble, configLink: '/dashboard/chat-widget' },
                         { key: 'whatsapp' as const, label: 'WhatsApp', icon: <WhatsAppIcon className="w-4 h-4" />, enabled: services.whatsapp, configLink: '/dashboard/whatsapp' },
                       ] as const).map((svc) => (
                         <div
                           key={svc.key}
                           className={`flex items-center justify-between px-3 py-2.5 ${isDarkMode ? 'hover:bg-[#1a1a1f]' : 'hover:bg-gray-50'}`}
                         >
                           <div className="flex items-center gap-2.5">
                             <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{svc.icon}</span>
                             <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{svc.label}</span>
                           </div>

                           {svc.enabled ? (
                             <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                               <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                               Active
                             </span>
                           ) : svc.configLink ? (
                             <Link
                               to={svc.configLink}
                               className="text-xs font-medium text-blue-600 hover:text-blue-700"
                             >
                               Configure
                             </Link>
                           ) : (
                             <span className="text-xs text-gray-400">Coming soon</span>
                           )}
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>

                  {/* User Avatar */}
                  <div className="relative" data-user-menu>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
                      title={user?.name || 'User'}
                    >
                      {(user?.name || 'U').charAt(0).toUpperCase()}
                    </button>

                    <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-xl border border-gray-200 bg-white z-50 overflow-hidden"
                      >
                        {/* Profile Header */}
                        <div className="px-4 py-4 flex items-center gap-3 border-b border-gray-100">
                          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            {(user?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</div>
                            <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          <Link
                            to="/partners"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <UserPlus className="w-4 h-4 text-gray-400" />
                            {t('topbar.inviteFriend')}
                          </Link>
                          <button
                            onClick={() => { setShowUserMenu(false); }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span className="flex items-center gap-3">
                              <Bell className="w-4 h-4 text-gray-400" />
                              {t('topbar.notifications')}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90" />
                          </button>
                          <button
                            onClick={() => { setShowUserMenu(false); setShowHelpSidebar(true); }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span className="flex items-center gap-3">
                              <HelpCircle className="w-4 h-4 text-gray-400" />
                              {t('nav.helpCenter')}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90" />
                          </button>
                        </div>


                        {/* Language Switcher */}
                        <div className="border-t border-gray-100 dark:border-gray-800">
                          <button
                            onClick={() => setShowLanguageExpanded(!showLanguageExpanded)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span className="flex items-center gap-3">
                              <Globe className="w-4 h-4 text-gray-400" />
                              {t('topbar.language')}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showLanguageExpanded ? 'rotate-0' : '-rotate-90'}`} />
                          </button>
                          {showLanguageExpanded && (
                            <div className="px-4 pb-3">
                              <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                                {[
                                  { code: 'en', label: 'EN' },
                                  { code: 'he', label: 'HE' },
                                  { code: 'es', label: 'ES' },
                                ].map((lang) => (
                                  <button
                                    key={lang.code}
                                    onClick={() => i18n.changeLanguage(lang.code)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                      i18n.language?.startsWith(lang.code)
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                  >
                                    {lang.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Theme Switcher */}
                        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                          <div className="text-xs font-medium text-gray-900 mb-2">{t('topbar.theme')}</div>
                          <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
                            <button
                              onClick={() => { setIsDarkMode(false); localStorage.setItem('darkMode', 'false'); }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                !isDarkMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {t('topbar.themeLight')}
                            </button>
                            <button
                              onClick={() => { setIsDarkMode(true); localStorage.setItem('darkMode', 'true'); }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                isDarkMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {t('topbar.themeDark')}
                            </button>
                            <button
                              onClick={() => {
                                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                setIsDarkMode(prefersDark);
                                localStorage.removeItem('darkMode');
                              }}
                              className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              {t('topbar.themeSystem')}
                            </button>
                          </div>
                        </div>

                        {/* Bottom Section */}
                        <div className="py-2 border-t border-gray-100">
                          <Link
                            to="/dashboard/settings/general"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Settings className="w-4 h-4 text-gray-400" />
                            {t('nav.settings')}
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            {t('logout')}
                          </button>
                        </div>
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

           {/* Page Content */}
           <div className="p-3 md:p-6">
             <UsageBanner className="mb-4" />
             <motion.div
               key={location.pathname.startsWith('/dashboard/settings/') ? '/dashboard/settings' : location.pathname}
               initial={{ opacity: 0, y: 12 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.3, ease: 'easeOut' }}
             >
               <Outlet />
             </motion.div>
          </div>
          <UsageLimitModal />
          <TrialExpiryPopup />

           {/* Feedback Slider - Bottom sliding panel */}
           <FeedbackSlider isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
         </main>
          </div>
        </div>




    {/* Help Sidebar */}
    <div className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${showHelpSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={() => setShowHelpSidebar(false)}
      />
      
      {/* Sidebar */}
      <div className={`absolute right-0 top-0 h-full w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${showHelpSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{t('help.title')}</h2>
              <button
                onClick={() => setShowHelpSidebar(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-6">
              {/* Documentation Links */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">{t('help.documentation')}</h3>
                <div className="space-y-3">
                  <a
                    href="https://boltcall.mintlify.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    onClick={() => setShowHelpSidebar(false)}
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {t('help.documentation')}
                      </div>
                      <div className="text-sm text-gray-500">{t('help.documentationDesc')}</div>
                    </div>
                  </a>

                  <Link
                    to="/help-center"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    onClick={() => setShowHelpSidebar(false)}
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                        {t('help.helpCenter')}
                      </div>
                      <div className="text-sm text-gray-500">{t('help.helpCenterDesc')}</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Support Actions */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">{t('help.getSupport')}</h3>
                <div className="space-y-3">
                  {/* Create Support Ticket */}
                  <button
                    onClick={() => {
                      // Handle support ticket creation
                      // TODO: handle support ticket creation
                      setShowHelpSidebar(false);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                        {t('help.createTicket')}
                      </div>
                      <div className="text-sm text-gray-500">{t('help.createTicketDesc')}</div>
                    </div>
                  </button>

                  {/* Schedule Onboarding - Only for paid plans */}
                  {userPlan !== 'free' && (
                    <button
                      onClick={() => {
                        // Handle onboarding scheduling
                        // TODO: handle onboarding scheduling
                        setShowHelpSidebar(false);
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                          {t('help.scheduleOnboarding')}
                        </div>
                        <div className="text-sm text-gray-500">{t('help.scheduleOnboardingDesc')}</div>
                      </div>
                    </button>
                  )}

                  {/* Upgrade Button - Only for free plan */}
                  {userPlan === 'free' && (
                    <button
                      onClick={() => {
                        // Handle upgrade
                        // TODO: handle upgrade
                        setShowHelpSidebar(false);
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all group"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium group-hover:text-yellow-200 transition-colors">
                          {t('help.upgrade')}
                        </div>
                        <div className="text-sm text-blue-100">{t('help.upgradeDesc')}</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Plan Status */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${
                    userPlan === 'free' ? 'bg-gray-400' : 
                    userPlan === 'pro' ? 'bg-blue-500' : 'bg-purple-500'
                  }`} />
                  <span>{t('help.currentPlan')}: {userPlan === 'free' ? t('plan.free') : userPlan === 'pro' ? t('plan.pro') : t('plan.ultimate')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
};

export default DashboardLayout;
