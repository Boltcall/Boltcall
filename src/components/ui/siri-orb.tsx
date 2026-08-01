import React from 'react';
import { cn } from '../../lib/utils';

interface SiriOrbProps {
  size?: string | number;
  className?: string;
  colors?: {
    bg?: string;
    c1?: string;
    c2?: string;
    c3?: string;
  };
  animationDuration?: number;
}

const DEFAULT_COLORS = {
  bg: 'transparent',
  c1: 'oklch(75% 0.15 350)',
  c2: 'oklch(80% 0.12 200)',
  c3: 'oklch(78% 0.14 280)',
};

const SiriOrb: React.FC<SiriOrbProps> = ({
  size = '192px',
  className,
  colors,
  animationDuration = 20,
}) => {
  const finalColors = { ...DEFAULT_COLORS, ...colors };
  const sizeValue =
    typeof size === 'number'
      ? size
      : Number.parseInt(size.replace('px', ''), 10) || 192;
  const blurAmount = Math.max(sizeValue * 0.08, 8);
  const contrastAmount = Math.max(sizeValue * 0.003, 1.8);
  const resolvedSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <>
      <style>{`
        @property --bc-siri-angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .bc-siri-orb {
          display: grid;
          grid-template-areas: "stack";
          overflow: hidden;
          border-radius: 9999px;
          position: relative;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.14) 0%,
            rgba(255, 255, 255, 0.04) 28%,
            transparent 70%
          );
          isolation: isolate;
        }

        .bc-siri-orb::before,
        .bc-siri-orb::after {
          content: "";
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
        }

        .bc-siri-orb::before {
          background:
            conic-gradient(
              from calc(var(--bc-siri-angle) * 1.2) at 30% 65%,
              var(--bc-siri-c3) 0deg,
              transparent 45deg 315deg,
              var(--bc-siri-c3) 360deg
            ),
            conic-gradient(
              from calc(var(--bc-siri-angle) * 0.8) at 70% 35%,
              var(--bc-siri-c2) 0deg,
              transparent 60deg 300deg,
              var(--bc-siri-c2) 360deg
            ),
            conic-gradient(
              from calc(var(--bc-siri-angle) * -1.5) at 65% 75%,
              var(--bc-siri-c1) 0deg,
              transparent 90deg 270deg,
              var(--bc-siri-c1) 360deg
            ),
            conic-gradient(
              from calc(var(--bc-siri-angle) * 2.1) at 25% 25%,
              var(--bc-siri-c2) 0deg,
              transparent 30deg 330deg,
              var(--bc-siri-c2) 360deg
            ),
            conic-gradient(
              from calc(var(--bc-siri-angle) * -0.7) at 80% 80%,
              var(--bc-siri-c1) 0deg,
              transparent 45deg 315deg,
              var(--bc-siri-c1) 360deg
            ),
            radial-gradient(
              ellipse 120% 80% at 40% 60%,
              var(--bc-siri-c3) 0%,
              transparent 50%
            );
          filter:
            blur(var(--bc-siri-blur))
            contrast(var(--bc-siri-contrast))
            saturate(1.2);
          animation: bc-siri-rotate var(--bc-siri-duration) linear infinite;
          transform: translateZ(0);
          will-change: transform;
        }

        .bc-siri-orb::after {
          background: radial-gradient(
            circle at 45% 55%,
            rgba(255, 255, 255, 0.16) 0%,
            rgba(255, 255, 255, 0.06) 28%,
            transparent 60%
          );
          mix-blend-mode: screen;
        }

        @keyframes bc-siri-rotate {
          from {
            --bc-siri-angle: 0deg;
          }
          to {
            --bc-siri-angle: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bc-siri-orb::before {
            animation: none;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        className={cn('bc-siri-orb', className)}
        style={
          {
            width: resolvedSize,
            height: resolvedSize,
            backgroundColor: finalColors.bg,
            '--bc-siri-c1': finalColors.c1,
            '--bc-siri-c2': finalColors.c2,
            '--bc-siri-c3': finalColors.c3,
            '--bc-siri-duration': `${animationDuration}s`,
            '--bc-siri-blur': `${blurAmount}px`,
            '--bc-siri-contrast': contrastAmount,
          } as React.CSSProperties
        }
      />
    </>
  );
};

export default SiriOrb;
