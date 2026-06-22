"use client";

import { useId } from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

interface AnimatedTitleFMProps {
  open: boolean;
  title?: string;
}

export function AnimatedTitleFM({
  open,
  title = "WELCOME TO BOLTCALL",
}: AnimatedTitleFMProps) {
  const filterId = `title-wobble-${useId().replace(/:/g, "")}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg aria-hidden className="absolute h-0 w-0">
          <filter id={filterId}>
            <feTurbulence
              baseFrequency="0.012 0.08"
              numOctaves="2"
              result="waves"
              seed="8"
              type="fractalNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="waves"
              scale="10"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>

        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[58%] h-14 w-[115%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9)_0%,rgba(165,88,251,0.6)_35%,rgba(73,34,229,0.18)_62%,rgba(73,34,229,0)_100%)] opacity-80 blur-2xl"
          initial={open ? { scaleX: 0.4, opacity: 0, y: -36 } : false}
          animate={open ? { scaleX: 1, opacity: 0.95, y: 0 } : undefined}
          transition={{ duration: 1.35, ease: EASE, delay: 0.3 }}
        />

        <motion.h1
          initial={open ? { opacity: 0, y: 28, filter: "blur(12px)" } : false}
          animate={open ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
          transition={{ duration: 0.95, ease: EASE, delay: 0.25 }}
          className="relative z-10 text-center text-4xl font-semibold uppercase tracking-[0.32em] text-white sm:text-5xl md:text-6xl"
        >
          {title}
        </motion.h1>

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
          initial={open ? { opacity: 0, clipPath: "inset(78% 0 12% 0)" } : false}
          animate={
            open
              ? {
                  opacity: [0, 0.85, 0.7, 0],
                  clipPath: [
                    "inset(78% 0 12% 0)",
                    "inset(56% 0 24% 0)",
                    "inset(46% 0 34% 0)",
                    "inset(40% 0 40% 0)",
                  ],
                }
              : undefined
          }
          transition={{ duration: 1.85, ease: EASE, times: [0, 0.42, 0.74, 1] }}
        >
          <motion.h1
            className="text-center text-4xl font-semibold uppercase tracking-[0.32em] text-white/95 sm:text-5xl md:text-6xl"
            style={{ filter: `url(#${filterId})` }}
            initial={open ? { opacity: 0, y: 0 } : false}
            animate={
              open
                ? {
                    opacity: [0, 1, 0.65, 0],
                    y: [0, 2, -1, 0],
                  }
                : undefined
            }
            transition={{
              duration: 1.85,
              ease: EASE,
              times: [0, 0.42, 0.74, 1],
            }}
          >
            {title}
          </motion.h1>
        </motion.div>
      </div>
    </div>
  );
}
