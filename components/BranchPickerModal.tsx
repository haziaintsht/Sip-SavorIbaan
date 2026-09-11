"use client";

import { motion } from "framer-motion";

type Branch = "Palindan" | "Uptown";

export default function BranchPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (branch: Branch) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-900/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-3xl bg-[#F9F6F0] p-6 shadow-xl"
      >
        <p className="text-center font-serif text-lg text-[#2D5A27]">Which branch are you at?</p>
        <p className="mt-1 text-center text-xs text-stone-500">We&apos;ll show you that branch&apos;s menu.</p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            onClick={() => onSelect("Palindan")}
            className="rounded-full bg-[#2D5A27] py-3 text-sm font-medium text-[#F9F6F0]"
          >
            Palindan Branch
          </button>
          <button
            onClick={() => onSelect("Uptown")}
            className="rounded-full border border-[#2D5A27] py-3 text-sm font-medium text-[#2D5A27]"
          >
            Uptown Branch
          </button>
        </div>

        <button onClick={onClose} className="mt-4 w-full text-center text-xs text-stone-500">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
