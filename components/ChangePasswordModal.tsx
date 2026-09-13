"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function ChangePasswordModal({
  email,
  onClose,
}: {
  email: string;
  onClose: () => void;
}) {
  const supabase = createClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords don't match." });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }

    setSaving(true);

    // Re-authenticate with the current password first — a valid session
    // alone shouldn't be enough to change it (e.g. a device left logged in).
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      setSaving(false);
      setMessage({ type: "error", text: "Current password is incorrect." });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setMessage({ type: "ok", text: "Password updated." });
    setTimeout(onClose, 1200);
  }

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
        className="w-full max-w-sm rounded-3xl bg-[#F9F6F0] p-6 shadow-xl"
      >
        <h2 className="font-serif text-lg text-[#2D5A27]">Change password</h2>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-stone-700">
            Current password
            <PasswordInput
              required
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              className="input"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-stone-700">
            New password
            <PasswordInput
              required
              minLength={8}
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              className="input"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-stone-700">
            Confirm new password
            <PasswordInput
              required
              minLength={8}
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              className="input"
            />
          </label>

          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-[#2D5A27]" : "text-red-600"}`}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update password"}
          </button>
        </form>

        <button onClick={onClose} className="mt-3 w-full text-center text-xs text-stone-500">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
