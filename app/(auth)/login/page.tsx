"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setRememberPreference } from "@/lib/rememberMe";
import SignInOverlay from "@/components/SignInOverlay";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [overlayPhase, setOverlayPhase] = useState<"loading" | "success" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const justVerified = searchParams.get("verified") === "1";
  const justReset = searchParams.get("reset") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setOverlayPhase("loading");
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setOverlayPhase(null);
      setError(
        signInError.message.includes("Email not confirmed")
          ? "Please verify your email before logging in."
          : signInError.message
      );
      return;
    }

    if (!data.user) {
      setOverlayPhase(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const isStaff = profile?.role === "admin" || profile?.role === "super_admin";
    const redirectTo = searchParams.get("redirectTo");

    setRememberPreference(rememberMe);
    setOverlayPhase("success");
    setTimeout(() => {
      router.push(redirectTo ?? (isStaff ? "/admin" : "/dashboard"));
      router.refresh();
    }, 900);
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-serif text-3xl text-[#2D5A27]">Welcome back</h1>
      <p className="mt-2 text-sm text-stone-600">Log in to view your stamp card.</p>

      {justVerified && (
        <p className="mt-4 rounded-xl bg-[#2D5A27]/10 px-4 py-3 text-sm text-[#2D5A27]">
          Email verified — you can now log in.
        </p>
      )}

      {justReset && (
        <p className="mt-4 rounded-xl bg-[#2D5A27]/10 px-4 py-3 text-sm text-[#2D5A27]">
          Password updated — you can now log in with your new password.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-stone-700">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-stone-700">
          Password
          <PasswordInput
            required
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            className="input"
          />
        </label>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-[#2D5A27] focus:ring-[#2D5A27]"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm text-[#2D5A27] hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      {overlayPhase && <SignInOverlay phase={overlayPhase} />}
    </main>
  );
}
