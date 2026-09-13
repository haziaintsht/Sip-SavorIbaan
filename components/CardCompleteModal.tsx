"use client";

import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";

export default function CardCompleteModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-[#F9F6F0] p-8 text-center shadow-xl"
      >
        <motion.div
          initial={{ scale: 0.4, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.15 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2D5A27] text-[#F9F6F0]"
        >
          <PartyPopper size={30} strokeWidth={2} />
        </motion.div>

        <h2 className="mt-5 font-serif text-2xl text-[#2D5A27]">Card complete!</h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          You&apos;ve earned a free Signature Drink. Show this screen at the counter to claim it —
          just present your loyalty card and the staff will take care of the rest.
        </p>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0]"
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}
