"use client";

import { motion, type Variants } from "framer-motion";

type Direction = "up" | "left" | "right";

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  left: { x: -28, y: 0 },
  right: { x: 28, y: 0 },
};

export default function Reveal({
  children,
  delay = 0,
  direction = "up",
  className,
  once = true,
  onMount = false,
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: Direction;
  className?: string;
  once?: boolean;
  /** Play immediately on mount instead of waiting for scroll into view — use for above-the-fold content. */
  onMount?: boolean;
}) {
  const { x, y } = offsets[direction];
  const variants: Variants = {
    hidden: { opacity: 0, x, y },
    visible: { opacity: 1, x: 0, y: 0 },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      {...(onMount ? { animate: "visible" } : { whileInView: "visible", viewport: { once, margin: "-60px" } })}
      variants={variants}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
