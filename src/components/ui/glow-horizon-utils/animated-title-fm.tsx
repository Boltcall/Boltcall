"use client";

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
  return (
    <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 text-center">
      <div className="relative inline-flex items-center justify-center">
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
          initial={open ? { opacity: 0, clipPath: "inset(82% 0 0 0)" } : false}
          animate={
            open
              ? {
                  opacity: [0, 1, 0.9, 0.7],
                  clipPath: [
                    "inset(82% 0 0 0)",
                    "inset(58% 0 18% 0)",
                    "inset(46% 0 28% 0)",
                    "inset(44% 0 32% 0)",
                  ],
                }
              : undefined
          }
          transition={{ duration: 1.9, ease: EASE, times: [0, 0.42, 0.72, 1] }}
        >
          <motion.h1
            className="text-center text-4xl font-semibold uppercase tracking-[0.32em] text-white/95 sm:text-5xl md:text-6xl"
            initial={open ? { x: 0, y: 0, skewX: 0, filter: "blur(0px)" } : false}
            animate={
              open
                ? {
                    x: [0, 18, -14, 8, 0],
                    y: [0, 10, -7, 3, 0],
                    skewX: [0, -10, 7, -3, 0],
                    filter: [
                      "blur(0px)",
                      "blur(1px)",
                      "blur(0px)",
                      "blur(0.6px)",
                      "blur(0px)",
                    ],
                  }
                : undefined
            }
            transition={{
              duration: 1.9,
              ease: EASE,
              times: [0, 0.42, 0.62, 0.8, 1],
            }}
          >
            {title}
          </motion.h1>
        </motion.div>
      </div>
    </div>
  );
}
