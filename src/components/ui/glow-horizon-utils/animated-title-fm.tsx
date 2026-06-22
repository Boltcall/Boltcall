"use client";

import { motion } from "framer-motion";

interface AnimatedTitleFMProps {
  open: boolean;
  title?: string;
}

export function AnimatedTitleFM({
  open,
  title = "WELCOME TO BOLTCALL",
}: AnimatedTitleFMProps) {
  return (
    <motion.h1
      initial={open ? { opacity: 0, y: 28, filter: "blur(12px)" } : false}
      animate={open ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
      transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
      className="text-center text-4xl font-semibold uppercase tracking-[0.32em] text-white sm:text-5xl md:text-6xl"
    >
      {title}
    </motion.h1>
  );
}
