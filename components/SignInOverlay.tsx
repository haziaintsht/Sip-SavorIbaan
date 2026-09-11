"use client";

import { AnimatePresence, motion } from "framer-motion";
import CoffeeLoader from "@/components/CoffeeLoader";
import SignedInCheck from "@/components/SignedInCheck";

export default function SignInOverlay({ phase }: { phase: "loading" | "success" }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F9F6F0]/95 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {phase === "loading" ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CoffeeLoader label="Signing you in..." size={90} />
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <SignedInCheck size={64} />
            <p className="font-serif text-xl text-[#2D5A27]">You&apos;re signed in!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
