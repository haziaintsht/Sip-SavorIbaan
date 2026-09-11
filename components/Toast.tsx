"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type ToastData = { id: number; message: string; icon?: LucideIcon };

export default function Toast({ toast, onDismiss }: { toast: ToastData | null; onDismiss: () => void }) {
  const Icon = toast?.icon;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            onClick={onDismiss}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#2D5A27] px-5 py-3 text-sm font-medium text-[#F9F6F0] shadow-lg"
          >
            {Icon && (
              <motion.span
                initial={{ scale: 0.5, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.1 }}
                className="flex items-center"
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </motion.span>
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
