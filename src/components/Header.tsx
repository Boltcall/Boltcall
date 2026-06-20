import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, ChevronDown, Phone, Zap, MessageSquare, Bell, Target, Globe, RotateCw, Gauge, Calculator, Sparkles, Scale, BookOpen, Book, Mail, ArrowRight, Filter } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import GiveawayBar from './GiveawayBar';
import LanguageSwitcher from './dashboard/LanguageSwitcher';

const HEADER_LANGS = ['en', 'he'] as const;

const Header: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation('marketing');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(location.pathname === '/strike-ai');
  const [isOverBlueBackground, setIsOverBlueBackground] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [mobileFeatures, setMobileFeatures] = useState(false);
  const [mobileResources, setMobileResources] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const tickingRef = useRef(false);
  const { isAuthenticated } = useAuth();

  const navItems = [
    { labelKey: 'header.pricing', href: '/pricing' },
    { labelKey: 'header.contact', href: '/contact' },
  ];

  const featuresItems = [
    { labelKey: 'header.featuresItems.aiReceptionist', href: '/features/ai-receptionist', icon: Phone },
    { labelKey: 'header.featuresItems.instantFormReply', href: '/features/instant-form-reply', icon: Zap },
    { labelKey: 'header.featuresItems.smsBookingAssistant', href: '/features/sms-booking-assistant', icon: MessageSquare },
    { labelKey: 'header.featuresItems.automatedReminders', href: '/features/automated-reminders', icon: Bell },
    { labelKey: 'header.featuresItems.aiFollowUpSystem', href: '/features/ai-follow-up-system', icon: Target },
    { labelKey: 'header.featuresItems.websiteWidget', href: '/features/website-widget', icon: Globe },
    { labelKey: 'header.featuresItems.leadReactivation', href: '/features/lead-reactivation', icon: RotateCw },
    { labelKey: 'header.featuresItems.smartWebsite', href: '/features/smart-website', icon: Sparkles },
  ];

  const resourcesItems = [
    { labelKey: 'header.resourcesItems.comparisons', href: '/comparisons', icon: Scale },
    { labelKey: 'header.resourcesItems.blog', href: '/blog', icon: BookOpen },
    { labelKey: 'header.resourcesItems.aiGuide', href: '/ai-guide-for-businesses', icon: Book },
    { labelKey: 'header.resourcesItems.newsletter', href: '/newsletter', icon: Mail },
    { labelKey: 'header.resourcesItems.freeAiCourse', href: '/ai-course', icon: BookOpen },
  ];

  const freeToolsItems = [
    { labelKey: 'header.freeToolsItems.leadResponseSpeedTest', href: '/speed-test', icon: Zap },
    { labelKey: 'header.freeToolsItems.aiRevenueAudit', href: '/ai-revenue-audit', icon: Calculator },
    { labelKey: 'header.freeToolsItems.leadResponseScorecard', href: '/lead-response-scorecard', icon: Target },
    { labelKey: 'header.freeToolsItems.conversionRateOptimizer', href: '/conversion-rate-optimizer', icon: Gauge },
    { labelKey: 'header.freeToolsItems.funnelOptimizer', href: '/funnel-optimizer', icon: Filter },
    { labelKey: 'header.freeToolsItems.aiVisibilityCheck', href: '/ai-visibility-check', icon: Gauge },
    { labelKey: 'header.freeToolsItems.aiReadinessScorecard', href: '/ai-readiness-scorecard', icon: Target },
    { labelKey: 'header.freeToolsItems.rankOnGoogleOffer', href: '/rank-on-google-offer', icon: Target },
    { labelKey: 'header.freeToolsItems.voiceAgentSetup', href: '/voice-agent-setup', icon: Phone },
    { labelKey: 'header.freeToolsItems.speedTestOffer', href: '/speed-test/offer', icon: Zap },
    { labelKey: 'header.freeToolsItems.medSpaRebookingCalculator', href: '/tools/medspa-rebooking-calculator', icon: Calculator },
    { labelKey: 'header.freeToolsItems.realEstateSpeedScorecard', href: '/tools/real-estate-speed-scorecard', icon: Target },
    { labelKey: 'header.freeToolsItems.speedToLeadForSolar', href: '/solar', icon: Sparkles },
    { labelKey: 'header.freeToolsItems.aiReceptionistBuyersGuide', href: '/lead-magnet/ai-receptionist-buyers-guide', icon: Book },
    { labelKey: 'header.freeToolsItems.claudeCodeOvernightKit', href: '/lead-magnet/claude-code-overnight-kit', icon: Book },
    { labelKey: 'header.freeToolsItems.freeWebsiteOffer', href: '/free-website', icon: Globe },
    { labelKey: 'header.freeToolsItems.giveaway', href: '/giveaway', icon: Sparkles },
  ];


  useEffect(() => {
    if (location.pathname === '/ai-guide-for-businesses' || location.pathname.startsWith('/ai-guide-for-businesses') || location.pathname === '/strike-ai' || location.pathname === '/free-website-package') {
      setIsOverBlueBackground(true);
    }

    let cachedHeader: Element | null = null;

    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        scrollLogic();
        tickingRef.current = false;
      });
    };

    const scrollLogic = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const isMobile = window.innerWidth < 768;
      setIsSticky(location.pathname === '/strike-ai' ? true : (isMobile ? true : scrollTop >= 64));

      if (scrollTop < 300 && location.pathname !== '/strike-ai') {
        setIsOverBlueBackground(false);
        return;
      }

      if (location.pathname === '/strike-ai' || location.pathname === '/free-website-package') {
        setIsOverBlueBackground(true);
        return;
      }

      if (!cachedHeader) cachedHeader = document.querySelector('header');
      const header = cachedHeader;
      if (!header) return;

      const headerRect = header.getBoundingClientRect();

      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        const pricingRect = pricingSection.getBoundingClientRect();
        if (headerRect.bottom >= pricingRect.top && headerRect.top <= pricingRect.bottom) {
          setIsOverBlueBackground(false);
          return;
        }
      }

      const faqSection = document.getElementById('faq');
      if (faqSection) {
        const faqRect = faqSection.getBoundingClientRect();
        if (headerRect.bottom >= faqRect.top - 50 && headerRect.top <= faqRect.bottom + 50) {
          setIsOverBlueBackground(false);
          return;
        }
      }

      const contactSection = document.getElementById('contact');
      if (contactSection) {
        const contactRect = contactSection.getBoundingClientRect();
        if (headerRect.bottom >= contactRect.top - 50 && headerRect.top <= contactRect.bottom + 50) {
          setIsOverBlueBackground(false);
          return;
        }
      }
      const headerCenterY = headerRect.top + headerRect.height / 2;
      const headerCenterX = window.innerWidth / 2;

      const elementBelow = document.elementFromPoint(headerCenterX, headerCenterY);

      if (elementBelow) {
        let currentElement: HTMLElement | null = elementBelow as HTMLElement;
        let foundBlueBackground = false;
        let foundLightBackground = false;

        while (currentElement && currentElement !== document.documentElement) {
          const computedStyle = window.getComputedStyle(currentElement);
          const bgColor = computedStyle.backgroundColor;
          const className = currentElement.className || '';
          const tagName = currentElement.tagName.toLowerCase();
          const id = currentElement.id || '';

          if (id === 'hero' || className.includes('hero') || className.includes('Hero')) {
            foundLightBackground = true;
            break;
          }

          if (id === 'pricing' || className.includes('pricing') || className.includes('Pricing')) {
            foundLightBackground = true;
            break;
          }

          if (id === 'faq' || className.includes('faq') || className.includes('FAQ')) {
            foundLightBackground = true;
            break;
          }

          if (id === 'contact' || className.includes('contact') || className.includes('Contact') || className.includes('FinalCTA') || className.includes('final-cta')) {
            foundLightBackground = true;
            break;
          }

          let parentCheck: HTMLElement | null = currentElement;
          while (parentCheck && parentCheck !== document.documentElement) {
            if (parentCheck.id === 'faq') {
              foundLightBackground = true;
              break;
            }
            parentCheck = parentCheck.parentElement;
          }
          if (foundLightBackground) break;

          if (tagName === 'section' && id === 'faq') {
            const sectionBg = computedStyle.backgroundColor;
            if (sectionBg) {
              const rgbMatch = sectionBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
              if (rgbMatch) {
                const r = parseInt(rgbMatch[1]);
                const g = parseInt(rgbMatch[2]);
                const b = parseInt(rgbMatch[3]);
                if (r > 240 && g > 240 && b > 240) {
                  foundLightBackground = true;
                  break;
                }
              }
            }
            if (className.includes('bg-white')) {
              foundLightBackground = true;
              break;
            }
          }

          const hasDarkClass =
            className.includes('bg-gray-900') ||
            className.includes('bg-gray-800') ||
            (className.includes('bg-gradient') && (className.includes('gray-900') || className.includes('gray-800')));

          if (hasDarkClass) {
            foundBlueBackground = true;
            break;
          }

          const hasLightClass =
            className.includes('bg-white') ||
            className.includes('bg-gray-50') ||
            className.includes('bg-gray-100') ||
            className.includes('bg-light-blue') ||
            (className.includes('bg-gradient') && (className.includes('white') || className.includes('light-blue')));

          if (hasLightClass) {
            foundLightBackground = true;
            break;
          }

          const isSmallElement = tagName === 'button' || tagName === 'div' && (currentElement.offsetWidth < 100 || currentElement.offsetHeight < 100);
          const hasBlueClass =
            (!isSmallElement && className.includes('bg-blue-600')) ||
            (!isSmallElement && className.includes('bg-blue-700')) ||
            (!isSmallElement && className.includes('bg-blue-800')) ||
            (className.includes('bg-gradient') && className.includes('blue') && !className.includes('white') && !className.includes('light-blue')) ||
            className.includes('bg-brand-blue') ||
            className.includes('bg-muted') ||
            className.includes('bg-black') ||
            className.includes('bg-gray-900') ||
            className.includes('bg-gray-800');

          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
              const r = parseInt(rgbMatch[1]);
              const g = parseInt(rgbMatch[2]);
              const b = parseInt(rgbMatch[3]);

              if (r > 200 && g > 200 && b > 200) {
                foundLightBackground = true;
                break;
              }

              const isDarkBackground = r < 100 && g < 100 && b < 100;
              const isBlueBackground = b > r + 50 && b > g + 50 && b > 150;

              if (isDarkBackground || isBlueBackground) {
                foundBlueBackground = true;
                break;
              }
            }
          }

          if (hasBlueClass) {
            foundBlueBackground = true;
            break;
          }

          if (tagName === 'section' || tagName === 'main') {
            if (id === 'faq') {
              foundLightBackground = true;
              break;
            }

            if (id === 'contact') {
              foundLightBackground = true;
              break;
            }

            const textColor = computedStyle.color;
            if (textColor && textColor.includes('255') && textColor.includes('255, 255, 255')) {
              if (bgColor) {
                const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (rgbMatch) {
                  const r = parseInt(rgbMatch[1]);
                  const g = parseInt(rgbMatch[2]);
                  const b = parseInt(rgbMatch[3]);
                  if (!(r > 200 && g > 200 && b > 200)) {
                    foundBlueBackground = true;
                    break;
                  }
                }
              }
            }
          }

          currentElement = currentElement.parentElement;
        }

        setIsOverBlueBackground(foundBlueBackground && !foundLightBackground);
      } else {
        setIsOverBlueBackground(false);
      }
    };

    if (location.pathname === '/ai-guide-for-businesses' || location.pathname.startsWith('/ai-guide-for-businesses') || location.pathname === '/free-website-package') {
      setIsOverBlueBackground(true);
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
    }
    return () => {};
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(event.target as Node)) {
        setIsResourcesOpen(false);
      }
      if (featuresRef.current && !featuresRef.current.contains(event.target as Node)) {
        setIsFeaturesOpen(false);
      }
    };

    if (isResourcesOpen || isFeaturesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isResourcesOpen, isFeaturesOpen]);

  const NavUnderline = ({ isBlue }: { isBlue: boolean }) => (
    <span
      className={`absolute bottom-0 ltr:left-0 rtl:right-0 h-0.5 w-0 group-hover:w-full transition-all duration-[576ms] ease-in-out ${isBlue ? 'bg-white' : 'bg-brand-blue'}`}
    />
  );

  const DropdownUnderline = ({ isBlue }: { isBlue: boolean }) => (
    <span
      className={`absolute -bottom-1 ltr:left-0 rtl:right-0 h-0.5 w-0 group-hover/item:w-full transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isBlue ? 'bg-white' : 'bg-blue-600'}`}
    />
  );

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[110] bg-transparent backdrop-blur-md transition-all duration-300 overflow-visible shadow-none border-none ring-0"
      style={{ contain: 'layout style' }}
    >
      {!isSticky && (
        <GiveawayBar />
      )}
      <div className="w-full px-2 sm:px-4 lg:px-6 overflow-visible">
        <div className="flex items-center justify-between h-14 max-w-7xl mx-auto overflow-visible">
          {/* Left Side - Logo and Navigation */}
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/">
              <div className="flex items-center cursor-pointer transition-transform duration-200 hover:scale-105">
                <picture>
                  <source srcSet="/boltcall_full_logo.webp" type="image/webp" />
                  <img
                    src="/boltcall_full_logo.png"
                    alt="Boltcall - AI Receptionist, Follow Ups, Reminders"
                    className="h-[68px] w-auto -translate-y-[2.8px]"
                    width="136"
                    height="68"
                    loading="eager"
                    fetchPriority="high"
                  />
                </picture>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 ltr:ml-4 rtl:mr-4">
              {/* Features Dropdown */}
              <div
                ref={featuresRef}
                className="relative overflow-visible"
                onMouseEnter={() => setIsFeaturesOpen(true)}
                onMouseLeave={() => setIsFeaturesOpen(false)}
              >
                <button
                  onClick={() => setIsFeaturesOpen(prev => !prev)}
                  className={`group relative font-medium py-2 transition-colors duration-300 flex items-center gap-1 ${isOverBlueBackground ? 'text-white' : 'text-text-muted'}`}
                >
                  {t('header.features')}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFeaturesOpen ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                  <NavUnderline isBlue={isOverBlueBackground} />
                </button>

                <div className={`absolute top-full ltr:left-0 rtl:right-0 pt-2 z-[120] transition-all duration-200 ease-in-out ${isFeaturesOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2.5 pointer-events-none'}`}>
                  <div className={`w-64 rounded-lg shadow-xl border ${isOverBlueBackground ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} py-3 px-2`}>
                    {featuresItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.href} className="relative">
                          <Link
                            to={item.href}
                            onClick={() => { setIsFeaturesOpen(false); setIsMenuOpen(false); }}
                            className={`group/item flex items-center gap-3 px-4 py-2 text-sm transition-colors relative ${isOverBlueBackground ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                          >
                            <Icon className="w-3 h-3 flex-shrink-0 -mt-[4px]" />
                            <span className="relative inline-block pb-1">
                              {t(item.labelKey)}
                              <DropdownUnderline isBlue={isOverBlueBackground} />
                            </span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* About Link */}
              <Link
                to="/about"
                className={`group relative font-medium py-2 transition-colors duration-300 ${isOverBlueBackground ? 'text-white' : 'text-text-muted'}`}
              >
                {t('header.about')}
                <NavUnderline isBlue={isOverBlueBackground} />
              </Link>

              {navItems.map((item) => (
                <Link
                  key={item.labelKey}
                  to={item.href}
                  className={`group relative font-medium py-2 transition-colors duration-300 ${isOverBlueBackground ? 'text-white' : 'text-text-muted'}`}
                >
                  {t(item.labelKey)}
                  <NavUnderline isBlue={isOverBlueBackground} />
                </Link>
              ))}

              {/* Resources Dropdown */}
              <div
                ref={resourcesRef}
                className="relative overflow-visible"
                onMouseEnter={() => setIsResourcesOpen(true)}
                onMouseLeave={() => setIsResourcesOpen(false)}
              >
                <button
                  onClick={() => setIsResourcesOpen(prev => !prev)}
                  className={`group relative font-medium py-2 transition-colors duration-300 flex items-center gap-1 ${isOverBlueBackground ? 'text-white' : 'text-text-muted'}`}
                >
                  {t('header.resources')}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isResourcesOpen ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                  <NavUnderline isBlue={isOverBlueBackground} />
                </button>

                <div className={`absolute top-full left-1/2 -translate-x-1/2 rtl:translate-x-1/2 pt-2 z-[120] transition-all duration-200 ease-in-out ${isResourcesOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2.5 pointer-events-none'}`}>
                  <div className={`rounded-lg shadow-xl border ${isOverBlueBackground ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} py-4 px-6 flex items-stretch`}>
                    {/* Content Section */}
                    <div className="flex-1 min-w-[198px] py-4">
                      <div className="px-6 py-2">
                        <p className={`text-sm font-semibold uppercase tracking-wider ${isOverBlueBackground ? 'text-gray-400' : 'text-gray-500'}`}>
                          {t('header.content')}
                        </p>
                      </div>
                      {resourcesItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.href} className="relative">
                            <Link
                              to={item.href}
                              onClick={() => { setIsResourcesOpen(false); setIsMenuOpen(false); }}
                              className={`group/item flex items-center gap-3 px-6 py-3 text-sm transition-colors relative ${isOverBlueBackground ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                            >
                              <Icon className="w-3.5 h-3.5 flex-shrink-0 -mt-[4px]" />
                              <span className="relative inline-block pb-1">
                                {t(item.labelKey)}
                                <DropdownUnderline isBlue={isOverBlueBackground} />
                              </span>
                            </Link>
                          </div>
                        );
                      })}
                    </div>

                    {/* Vertical Separator */}
                    <div className={`ltr:border-l rtl:border-r ${isOverBlueBackground ? 'border-gray-700' : 'border-gray-200'}`} />

                    {/* Free Tools Section */}
                    <div className="flex-1 min-w-[240px] py-4">
                      <div className="px-4 py-2">
                        <p className={`text-sm font-semibold uppercase tracking-wider ${isOverBlueBackground ? 'text-gray-400' : 'text-gray-500'}`}>
                          {t('header.freeTools')}
                        </p>
                      </div>
                      {freeToolsItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.href} className="relative">
                            <Link
                              to={item.href}
                              onClick={() => { setIsResourcesOpen(false); setIsMenuOpen(false); }}
                              className={`group/item flex items-center gap-3 px-4 py-3 text-sm transition-colors relative ${isOverBlueBackground ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                            >
                              <Icon className="w-3.5 h-3.5 flex-shrink-0 -mt-[4px]" />
                              <span className="relative inline-block pb-1 whitespace-nowrap">
                                {t(item.labelKey)}
                                <DropdownUnderline isBlue={isOverBlueBackground} />
                              </span>
                            </Link>
                          </div>
                        );
                      })}
                    </div>

                    {/* Vertical Separator */}
                    <div className={`ltr:border-l rtl:border-r ${isOverBlueBackground ? 'border-gray-700' : 'border-gray-200'}`} />

                    {/* Strike AI Announcement Section */}
                    <div className="flex-1 min-w-[320px] px-3 py-4 flex">
                      <Link
                        to="/strike-ai"
                        onClick={() => { setIsResourcesOpen(false); setIsMenuOpen(false); }}
                        className="block w-full"
                      >
                        <div className="h-full rounded-2xl p-6 border-2 border-gray-900 bg-white shadow-xl transition-all hover:translate-y-[-2px] hover:shadow-2xl">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black border-2 border-gray-900">
                              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                              <span className="font-bold text-sm uppercase tracking-wider text-black block">
                                {t('header.newStrikeAi')}
                              </span>
                              <span className="text-xs text-gray-600 block mt-0.5">
                                {t('header.nowAvailable')}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-gray-700 mb-5">
                            {t('header.strikeDesc')}
                          </p>
                          <div className="mt-auto flex justify-end">
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold shadow-md hover:bg-gray-900 transition-colors w-full justify-center">
                              {t('header.tryStrikeAi')}
                              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </nav>
          </div>

          {/* Right Side - Language Switcher + Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher
              dropdownDirection="down"
              visibleLanguages={HEADER_LANGS}
              light={isOverBlueBackground}
            />
            {isAuthenticated ? (
              <Link
                to="/dashboard/getting-started"
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${isOverBlueBackground ? 'bg-white text-brand-blue hover:bg-white/90' : 'bg-brand-blue text-white hover:bg-brand-blueDark'}`}
              >
                {t('header.dashboard')}
              </Link>
            ) : (
              <>
                <div className="relative group">
                  <Link
                    to="/login"
                    className={`relative font-medium py-2 transition-colors duration-300 ${isOverBlueBackground ? 'text-white' : 'text-text-muted'}`}
                  >
                    {t('header.login')}
                    <span className={`absolute bottom-0 ltr:left-0 rtl:right-0 h-0.5 w-0 opacity-0 group-hover:w-full group-hover:opacity-100 transition-all duration-300 ease-in-out ${isOverBlueBackground ? 'bg-white' : 'bg-brand-blue'}`} />
                  </Link>
                </div>
                <Link
                  to="/signup?redirect=/setup"
                  className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${isOverBlueBackground ? 'bg-white text-brand-blue hover:bg-blue-50' : 'bg-brand-blue text-white hover:bg-brand-blueDark'}`}
                >
                  {t('header.getStarted')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden fixed top-2 right-4 z-[9995] min-w-[44px] min-h-[44px] flex items-center justify-center bg-white backdrop-blur-sm rounded-full shadow-xl border-2 border-gray-300 hover:bg-gray-50 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="transition-transform duration-300" style={{ transform: isMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              {isMenuOpen ? (
                <X size={18} strokeWidth={2.5} className="text-gray-800" />
              ) : (
                <Menu size={18} strokeWidth={2.5} className="text-gray-800" />
              )}
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {typeof document !== 'undefined' && createPortal(
          <div className={`md:hidden fixed inset-0 z-[9999] bg-white overflow-y-auto transition-all duration-250 ease-out ${isMenuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100"
              aria-label="Close menu"
            >
              <X size={20} strokeWidth={2.5} className="text-gray-800" />
            </button>

            <div className="px-6 pt-16 pb-8 space-y-1">
              {[
                { labelKey: 'header.about', href: '/about' },
                ...navItems,
              ].map((item) => (
                <Link
                  key={item.labelKey}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full text-left px-4 py-4 text-lg font-semibold text-gray-900 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {t(item.labelKey)}
                </Link>
              ))}

              {/* Features dropdown */}
              <div>
                <button
                  onClick={() => setMobileFeatures(!mobileFeatures)}
                  className="w-full text-left px-4 py-4 text-lg font-semibold text-gray-900 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between"
                >
                  {t('header.features')}
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${mobileFeatures ? 'rotate-180' : ''}`} />
                </button>
                <div className={`ltr:pl-2 rtl:pr-2 space-y-0.5 mt-1 overflow-hidden transition-all duration-200 ${mobileFeatures ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {featuresItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-3"
                      >
                        <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700">{t(item.labelKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Resources dropdown */}
              <div>
                <button
                  onClick={() => setMobileResources(!mobileResources)}
                  className="w-full text-left px-4 py-4 text-lg font-semibold text-gray-900 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between"
                >
                  {t('header.resources')}
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${mobileResources ? 'rotate-180' : ''}`} />
                </button>
                <div className={`ltr:pl-2 rtl:pr-2 space-y-0.5 mt-1 overflow-hidden transition-all duration-200 ${mobileResources ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {resourcesItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-3"
                      >
                        <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700">{t(item.labelKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-gray-200 mt-4" />

              {/* Auth + Language Switcher */}
              <div className="space-y-3 pt-4">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard/getting-started"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full py-3 text-base font-semibold rounded-lg bg-brand-blue text-white hover:bg-brand-blueDark transition-colors text-center"
                  >
                    {t('header.dashboard')}
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full py-3 text-base font-semibold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
                    >
                      {t('header.login')}
                    </Link>
                    <Link
                      to="/signup?redirect=/setup"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full py-3 text-base font-bold rounded-lg bg-brand-blue text-white hover:bg-brand-blueDark transition-colors text-center"
                    >
                      {t('header.startNow')}
                    </Link>
                  </>
                )}
                <div className="flex justify-center pt-2">
                  <LanguageSwitcher
                    dropdownDirection="up"
                    visibleLanguages={HEADER_LANGS}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </header>
  );
};

export default React.memo(Header);
