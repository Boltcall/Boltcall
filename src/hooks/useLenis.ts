import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type Lenis from 'lenis';

// Extend Window interface to include lenis
declare global {
  interface Window {
    lenis?: Lenis;
  }
}

export const useLenis = () => {
  const lenisRef = useRef<Lenis | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Only initialize Lenis on homepage and marketing pages
    // Disable on dashboard, login, signup, blog (breaks sticky TOC), and other app pages
    const isDashboardPage = location.pathname.startsWith('/dashboard');
    const isBlogPage = location.pathname.startsWith('/blog');
    const isAppPage = ['/login', '/signup', '/setup'].includes(location.pathname);
    const isRailsDemo = location.pathname === '/demo/speed-to-lead';

    if (isDashboardPage || isAppPage || isBlogPage || isRailsDemo) {
      return;
    }

    // Respect user's reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    let isRunning = true;
    let rafId: number;
    let cleanup: (() => void) | undefined;

    // Dynamic import — keeps Lenis out of the initial parse budget.
    // useEffect only runs after paint, so there's no UX cost to loading it here.
    import('lenis').then(({ default: LenisClass }) => {
      if (!isRunning) return; // component unmounted before module arrived

      const customEasing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

      const lenis = new LenisClass({
        duration: 1.5,
        easing: customEasing,
        infinite: false,
        lerp: 0.15,
        wheelMultiplier: 0.8,
        touchMultiplier: 1.2,
        smoothWheel: true,
      });

      window.lenis = lenis;
      lenisRef.current = lenis;

      function raf(time: number) {
        if (isRunning) {
          lenis.raf(time);
          rafId = requestAnimationFrame(raf);
        }
      }

      rafId = requestAnimationFrame(raf);

      const handleVisibilityChange = () => {
        if (document.hidden) {
          isRunning = false;
          cancelAnimationFrame(rafId);
        } else {
          isRunning = true;
          rafId = requestAnimationFrame(raf);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      cleanup = () => {
        isRunning = false;
        cancelAnimationFrame(rafId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        lenis.destroy();
        lenisRef.current = null;
        delete window.lenis;
      };
    });

    return () => {
      isRunning = false;
      if (cleanup) cleanup();
    };
  }, [location.pathname]);

  return lenisRef.current;
};
