"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearRememberPreference } from "@/lib/rememberMe";
import PasswordInput from "@/components/PasswordInput";
import CoffeeLoader from "@/components/CoffeeLoader";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(!!user);
      setChecking(false);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    clearRememberPreference();
    await supabase.auth.signOut();
    router.push("/login?reset=1");
  }

  if (checking) {
    return (
      <main className="px-6 py-24">
        <CoffeeLoader label="Checking your link..." />
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="font-serif text-2xl text-[#2D5A27]">That link expired</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Password reset links only work once and expire after a while. Request a new one to
          continue.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0]"
        >
          Request a new link
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-serif text-3xl text-[#2D5A27]">Set a new password</h1>
      <p className="mt-2 text-sm text-stone-600">Choose something you haven&apos;t used before.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-stone-700">
          New password
          <PasswordInput
            required
            minLength={8}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-stone-700">
          Confirm password
          <PasswordInput
            required
            minLength={8}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            className="input"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save new password"}
        </button>
      </form>
    </main>
  );
}
