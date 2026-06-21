type ClarityFunction = ((...args: unknown[]) => void) & { q?: IArguments[] };

const GOOGLE_TAG_MANAGER_ID = 'GTM-5LWRPT5N';
const GOOGLE_ANALYTICS_ID = 'G-LY9H4ZQW81';
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || 'x4e3hjsgc7';
const ANALYTICS_SCRIPT_URL_PARTS = [
  'https://www.googletagmanager.com/gtm.js',
  'https://www.googletagmanager.com/gtag/js',
  'https://www.clarity.ms/tag/',
];
const ANALYTICS_COOKIE_PREFIXES = ['_ga', '_gid', '_gat', '_gcl', '_clck', '_clsk', 'CLID', 'ANONCHK', 'MR', 'MUID', 'SM'];

const SENSITIVE_APP_PATH_PREFIXES = ['/dashboard', '/v2', '/client', '/setup'];

declare global {
  interface Window {
    _analyticsLoaded?: boolean;
    _clarityLoaded?: boolean;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: ClarityFunction;
  }
}

function addScript(src: string, onload?: () => void) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  if (onload) script.onload = onload;
  document.head.appendChild(script);
  return script;
}

function matchesAnalyticsCookie(name: string) {
  return ANALYTICS_COOKIE_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}_`));
}

function getDomainVariants(hostname: string) {
  if (!hostname || hostname === 'localhost') return [];

  const parts = hostname.split('.').filter(Boolean);
  const variants = new Set<string>();

  for (let index = 0; index < parts.length - 1; index += 1) {
    const domain = parts.slice(index).join('.');
    variants.add(domain);
    variants.add(`.${domain}`);
  }

  return Array.from(variants);
}

function deleteCookie(name: string) {
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const directives = [`${name}=; expires=${expires}; Max-Age=0; path=/; SameSite=Lax`];

  for (const domain of getDomainVariants(window.location.hostname)) {
    directives.push(`${name}=; expires=${expires}; Max-Age=0; path=/; domain=${domain}; SameSite=Lax`);
  }

  for (const directive of directives) {
    document.cookie = directive;
  }
}

function removeInjectedAnalyticsScripts() {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[src]');

  for (const script of scripts) {
    const src = script.getAttribute('src') || '';
    if (ANALYTICS_SCRIPT_URL_PARTS.some((part) => src.includes(part))) {
      script.remove();
    }
  }
}

function updateGoogleConsent(analyticsStorage: 'granted' | 'denied') {
  const payload = {
    ad_storage: 'denied',
    analytics_storage: analyticsStorage,
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted',
  };

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', payload);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(['consent', 'default', payload]);
}

function loadGoogleTagManager() {
  (function (w: Window, d: Document, s: string, l: string, i: string) {
    const win = w as Window & Record<string, unknown[]>;
    win[l] = win[l] || [];
    win[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const firstScript = d.getElementsByTagName(s)[0];
    const tagManagerScript = d.createElement(s) as HTMLScriptElement;
    const dataLayerParam = l !== 'dataLayer' ? '&l=' + l : '';
    tagManagerScript.async = true;
    tagManagerScript.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dataLayerParam;
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(tagManagerScript, firstScript);
      return;
    }
    d.head.appendChild(tagManagerScript);
  })(window, document, 'script', 'dataLayer', GOOGLE_TAG_MANAGER_ID);
}

function loadGoogleAnalytics() {
  addScript(`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`, () => {
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    }
    gtag('js', new Date());
    gtag('config', GOOGLE_ANALYTICS_ID);
    window.gtag = gtag;
  });
}

export function shouldLoadClarity(pathname = window.location.pathname) {
  return Boolean(CLARITY_PROJECT_ID) && !SENSITIVE_APP_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function loadMicrosoftClarity() {
  if (window._clarityLoaded || !shouldLoadClarity()) return;
  window._clarityLoaded = true;

  window.clarity =
    window.clarity ||
    function () {
      window.clarity!.q = window.clarity!.q || [];
      window.clarity!.q.push(arguments);
    };
  window.clarity('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: 'granted',
  });

  addScript(`https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`);
}

export function loadMarketingAnalytics() {
  updateGoogleConsent('granted');

  if (!window._analyticsLoaded) {
    window._analyticsLoaded = true;
    loadGoogleTagManager();
    loadGoogleAnalytics();
  }

  loadMicrosoftClarity();
}

export function revokeMarketingAnalytics() {
  updateGoogleConsent('denied');

  if (typeof window.clarity === 'function') {
    window.clarity('consentv2', {
      ad_Storage: 'denied',
      analytics_Storage: 'denied',
    });
  }

  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0]?.trim())
    .filter(Boolean);

  for (const name of cookieNames) {
    if (matchesAnalyticsCookie(name)) {
      deleteCookie(name);
    }
  }

  removeInjectedAnalyticsScripts();
  window._analyticsLoaded = false;
  window._clarityLoaded = false;
  delete window.gtag;
  delete window.clarity;
}
