"use client";

import { motion } from "framer-motion";

export function AnimatedTitleFM({ open }: { open: boolean }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
      <motion.p
        initial={open ? { opacity: 0, y: 20 } : false}
        animate={open ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-4 text-xs font-semibold uppercase tracking-[0.45em] text-white/65 sm:text-sm"
      >
        Boltcall Component Demo
      </motion.p>
      <motion.h1
        initial={open ? { opacity: 0, y: 28 } : false}
        animate={open ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.8, delay: 0.35 }}
        className="text-5xl font-semibold tracking-[-0.08em] text-white sm:text-7xl"
      >
        Glow Horizon
      </motion.h1>
      <motion.p
        initial={open ? { opacity: 0, y: 22 } : false}
        animate={open ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-5 max-w-2xl text-sm leading-7 text-white/70 sm:text-lg"
      >
        A soft directional glow layer for hero sections, launch moments, and
        high-contrast demo surfaces.
      </motion.p>
    </div>
  );
}
