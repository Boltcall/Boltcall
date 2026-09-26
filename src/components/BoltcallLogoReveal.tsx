import React, { useLayoutEffect, useState } from 'react';

// ponytail: module-scope flag, not React state/context - the whole point is it
// survives remounts within one page load but resets on a real reload.
let hasPlayedBoltcallLogoReveal = false;

// Glyph x-ranges measured from public/boltcall_full_logo.png (565x278).
// Every clip-path is a full-size crop of the same source image, so the 9
// layers tile back together into the exact real logo with zero seam.
const SLICES: Array<{ key: string; clip: string; origin?: string; anim: 'bolt' | 'char'; delayMs?: number }> = [
  { key: 'bolt', clip: 'inset(24% 71.00% 16% 5.00%)', origin: '16.8% 54%', anim: 'bolt' },
  { key: 'b', clip: 'inset(24% 59.12% 16% 29.00%)', anim: 'char', delayMs: 400 },
  { key: 'o', clip: 'inset(24% 49.20% 16% 40.88%)', anim: 'char', delayMs: 470 },
  { key: 'l1', clip: 'inset(24% 46.02% 16% 50.80%)', anim: 'char', delayMs: 540 },
  { key: 't', clip: 'inset(24% 39.82% 16% 53.98%)', anim: 'char', delayMs: 610 },
  { key: 'c', clip: 'inset(24% 29.73% 16% 60.18%)', anim: 'char', delayMs: 680 },
  { key: 'a', clip: 'inset(24% 21.68% 16% 70.27%)', anim: 'char', delayMs: 750 },
  { key: 'l2', clip: 'inset(24% 18.05% 16% 78.32%)', anim: 'char', delayMs: 820 },
  { key: 'l3', clip: 'inset(24%  0.00% 16% 81.95%)', anim: 'char', delayMs: 890 },
];

interface BoltcallLogoRevealProps {
  alt: string;
  invert?: boolean;
  className?: string;
}

/** Typing reveal of the Boltcall wordmark: 9 clipped copies of the same PNG
 * (bolt icon + 8 letters), each animating in once per full page load. Final
 * frame is pixel-identical to the static logo. */
const BoltcallLogoReveal: React.FC<BoltcallLogoRevealProps> = ({ alt, invert, className }) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // ponytail: flag flip lives in an effect, not the render-phase lazy
  // useState initializer - React Strict Mode double-invokes initializers,
  // which would burn the "first play" flag on a throwaway pass. Layout
  // effect (not passive) so the class lands before first paint, no flash.
  useLayoutEffect(() => {
    if (hasPlayedBoltcallLogoReveal) return;
    hasPlayedBoltcallLogoReveal = true;
    setShouldAnimate(true);
  }, []);

  return (
    <div
      className={`relative h-[68px] -translate-y-[2.8px] ${className ?? ''}`}
      style={{ aspectRatio: '565 / 278' }}
    >
      {SLICES.map((s) => (
        <img
          key={s.key}
          src="/boltcall_full_logo.png"
          alt={s.key === 'bolt' ? alt : ''}
          aria-hidden={s.key === 'bolt' ? undefined : true}
          draggable={false}
          loading={s.key === 'bolt' ? 'eager' : undefined}
          fetchPriority={s.key === 'bolt' ? 'high' : undefined}
          className={`absolute inset-0 h-full w-full object-contain select-none pointer-events-none transition-[filter] duration-200 ${invert ? 'brightness-0 invert' : ''} ${
            shouldAnimate ? (s.anim === 'bolt' ? 'motion-safe:animate-logo-bolt-in' : 'motion-safe:animate-logo-char-in') : ''
          }`}
          style={{ clipPath: s.clip, transformOrigin: s.origin, animationDelay: s.delayMs ? `${s.delayMs}ms` : undefined }}
        />
      ))}
    </div>
  );
};

export default BoltcallLogoReveal;
