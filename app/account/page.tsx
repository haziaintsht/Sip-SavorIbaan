"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CoffeeLoader from "@/components/CoffeeLoader";
import ChangePasswordModal from "@/components/ChangePasswordModal";

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const cooldownUntil = profileUpdatedAt
    ? new Date(new Date(profileUpdatedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const inCooldown = !!cooldownUntil && cooldownUntil.getTime() > Date.now();
  const cooldownDateLabel = cooldownUntil?.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone_number, location, profile_updated_at")
        .eq("id", user.id)
        .single();
      setFullName(profile?.full_name ?? "");
      setPhoneNumber(profile?.phone_number ?? "");
      setLocation(profile?.location ?? "");
      setProfileUpdatedAt(profile?.profile_updated_at ?? null);
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
    if (error) {
      setProfileMessage({ type: "error", text: error.message });
    } else {
      setProfileMessage({ type: "ok", text: "Profile updated." });
      setProfileUpdatedAt(new Date().toISOString());
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

        {inCooldown && (
          <p className="rounded-xl bg-[#2D5A27]/10 px-4 py-3 text-sm text-[#2D5A27]">
            You can update your profile again on {cooldownDateLabel}.
          </p>
        )}

        <fieldset disabled={inCooldown} className="flex flex-col gap-4 disabled:opacity-60">
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
        </fieldset>

        {profileMessage && (
          <p className={`text-sm ${profileMessage.type === "ok" ? "text-[#2D5A27]" : "text-red-600"}`}>
            {profileMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={savingProfile || inCooldown}
          className="mt-2 rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          {savingProfile ? "Saving..." : "Save changes"}
        </button>
      </form>

      <div className="mt-12 border-t border-stone-200 pt-8">
        <h2 className="font-serif text-lg text-[#2D5A27]">Change password</h2>
        <p className="mt-1 text-sm text-stone-600">You&apos;ll need your current password to set a new one.</p>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="mt-4 w-full rounded-full border border-[#2D5A27] px-6 py-3 text-sm font-medium text-[#2D5A27]"
        >
          Change password
        </button>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal email={email} onClose={() => setShowPasswordModal(false)} />
      )}
    </main>
  );
}
