"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import CoffeeLoader from "@/components/CoffeeLoader";

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone_number, location")
        .eq("id", user.id)
        .single();
      setFullName(profile?.full_name ?? "");
      setPhoneNumber(profile?.phone_number ?? "");
      setLocation(profile?.location ?? "");
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone_number: phoneNumber, location })
      .eq("id", user.id);

    setSavingProfile(false);
    setProfileMessage(
      error ? { type: "error", text: error.message } : { type: "ok", text: "Profile updated." }
    );
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords don't match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordMessage({ type: "error", text: error.message });
    } else {
      setPasswordMessage({ type: "ok", text: "Password updated." });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  if (loading) {
    return (
      <main className="px-6 py-24">
        <CoffeeLoader label="Loading your account..." />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-14">
      <h1 className="font-serif text-3xl text-[#2D5A27]">Your account</h1>
      <p className="mt-1 text-sm text-stone-600">Update your details or change your password.</p>

      <form onSubmit={handleSaveProfile} className="mt-8 flex flex-col gap-4">
        <h2 className="font-serif text-lg text-[#2D5A27]">Profile</h2>

        <label className="flex flex-col gap-1.5 text-sm text-stone-700">
          Full name
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-stone-700">
          Phone number
          <input
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="input"
            placeholder="09XX XXX XXXX"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-stone-700">
          Barangay
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input"
            placeholder="e.g. Poblacion"
          />
        </label>

        {profileMessage && (
          <p className={`text-sm ${profileMessage.type === "ok" ? "text-[#2D5A27]" : "text-red-600"}`}>
            {profileMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={savingProfile}
          className="mt-2 rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          {savingProfile ? "Saving..." : "Save changes"}
        </button>
      </form>

      <form onSubmit={handleChangePassword} className="mt-12 flex flex-col gap-4 border-t border-stone-200 pt-8">
        <h2 className="font-serif text-lg text-[#2D5A27]">Change password</h2>

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

        {passwordMessage && (
          <p className={`text-sm ${passwordMessage.type === "ok" ? "text-[#2D5A27]" : "text-red-600"}`}>
            {passwordMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={savingPassword}
          className="mt-2 rounded-full border border-[#2D5A27] px-6 py-3 text-sm font-medium text-[#2D5A27] disabled:opacity-60"
        >
          {savingPassword ? "Updating..." : "Update password"}
        </button>
      </form>
    </main>
  );
}
