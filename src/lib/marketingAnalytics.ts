type ClarityFunction = ((...args: unknown[]) => void) & { q?: IArguments[] };

const GOOGLE_TAG_MANAGER_ID = 'GTM-5LWRPT5N';
const GOOGLE_ANALYTICS_ID = 'G-LY9H4ZQW81';
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || 'x4e3hjsgc7';

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
  if (!window._analyticsLoaded) {
    window._analyticsLoaded = true;
    loadGoogleTagManager();
    loadGoogleAnalytics();
  }

  loadMicrosoftClarity();
}
