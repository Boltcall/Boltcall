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
      className="whitespace-nowrap text-center font-semibold uppercase tracking-[0.22em] text-white text-[clamp(0.85rem,3.6vw,3.5rem)]"
    >
      {title}
    </motion.h1>
  );
}
