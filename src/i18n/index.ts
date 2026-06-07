import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Eager-load English (default/fallback)
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enAgents from './locales/en/agents.json';
import enAnalytics from './locales/en/analytics.json';
import enAuth from './locales/en/auth.json';
import enIntegrations from './locales/en/integrations.json';
import enLeads from './locales/en/leads.json';
import enSettings from './locales/en/settings.json';
import enSetup from './locales/en/setup.json';
import enMarketing from './locales/en/marketing.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' as const },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', dir: 'rtl' as const },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' as const },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];
export type TextDirection = 'ltr' | 'rtl';

export const NAMESPACES = ['common', 'dashboard', 'agents', 'analytics', 'auth', 'integrations', 'leads', 'settings', 'setup', 'marketing'] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** Get text direction for a language code */
export function getDirection(lang: string): TextDirection {
  const l = lang.split('-')[0];
  return SUPPORTED_LANGUAGES.find(sl => sl.code === l)?.dir ?? 'ltr';
}

// Lazy loader for non-English namespaces
const lazyLoadNamespaces = async (lang: string): Promise<Record<string, Record<string, unknown>>> => {
  const code = lang.split('-')[0];
  switch (code) {
    case 'he': {
      const [common, dashboard, agents, analytics, auth, integrations, leads, settings, setup, marketing] = await Promise.all([
        import('./locales/he/common.json'),
        import('./locales/he/dashboard.json'),
        import('./locales/he/agents.json'),
        import('./locales/he/analytics.json'),
        import('./locales/he/auth.json'),
        import('./locales/he/integrations.json'),
        import('./locales/he/leads.json'),
        import('./locales/he/settings.json'),
        import('./locales/he/setup.json'),
        import('./locales/he/marketing.json'),
      ]);
      return {
        common: common.default,
        dashboard: dashboard.default,
        agents: agents.default,
        analytics: analytics.default,
        auth: auth.default,
        integrations: integrations.default,
        leads: leads.default,
        settings: settings.default,
        setup: setup.default,
        marketing: marketing.default,
      };
    }
    case 'es': {
      const [common, dashboard, agents, analytics, auth, integrations, leads, settings] = await Promise.all([
        import('./locales/es/common.json'),
        import('./locales/es/dashboard.json'),
        import('./locales/es/agents.json'),
        import('./locales/es/analytics.json'),
        import('./locales/es/auth.json'),
        import('./locales/es/integrations.json'),
        import('./locales/es/leads.json'),
        import('./locales/es/settings.json'),
      ]);
      return {
        common: common.default,
        dashboard: dashboard.default,
        agents: agents.default,
        analytics: analytics.default,
        auth: auth.default,
        integrations: integrations.default,
        leads: leads.default,
        settings: settings.default,
      };
    }
    default:
      return {};
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        dashboard: enDashboard,
        agents: enAgents,
        analytics: enAnalytics,
        auth: enAuth,
        integrations: enIntegrations,
        leads: enLeads,
        settings: enSettings,
        setup: enSetup,
        marketing: enMarketing,
      },
    },
    ns: [...NAMESPACES],
    defaultNS: 'common',
    lng: localStorage.getItem('i18nextLng')?.split('-')[0] || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Load non-English locale if detected/stored on init
const initLang = (i18n.language || '').split('-')[0];
if (initLang && initLang !== 'en') {
  lazyLoadNamespaces(initLang).then((bundles) => {
    Object.entries(bundles).forEach(([ns, translations]) => {
      i18n.addResourceBundle(initLang, ns, translations, true, true);
    });
    i18n.changeLanguage(initLang);
    // Apply direction on init
    document.documentElement.dir = getDirection(initLang);
    document.documentElement.lang = initLang;
  });
} else {
  document.documentElement.dir = 'ltr';
  document.documentElement.lang = 'en';
}

// Hook into language changes to lazy-load locale bundles
i18n.on('languageChanged', async (lng) => {
  const lang = lng.split('-')[0];

  // Update document direction and lang attribute
  const dir = getDirection(lang);
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;

  if (lang !== 'en' && !i18n.hasResourceBundle(lang, 'common')) {
    const bundles = await lazyLoadNamespaces(lang);
    Object.entries(bundles).forEach(([ns, translations]) => {
      i18n.addResourceBundle(lang, ns, translations, true, true);
    });
  }
});

export default i18n;
