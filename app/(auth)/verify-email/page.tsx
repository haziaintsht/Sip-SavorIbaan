"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResent(false);

    const res = await fetch("/api/auth/verify-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: code.trim() }),
    });
    const body = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "That code is invalid or expired. Request a new one below.");
      return;
    }

    router.push("/login?verified=1");
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    const res = await fetch("/api/auth/resend-signup-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to resend code");
      return;
    }
    setResent(true);
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <Mail size={48} strokeWidth={1.5} className="text-[#2D5A27]" />
      <h1 className="mt-6 font-serif text-2xl text-[#2D5A27]">Check your inbox</h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-stone-900">{email || "your email"}</span>. Enter it
        below to activate your loyalty account.
      </p>

      <form onSubmit={handleVerify} className="mt-8 flex w-full flex-col gap-4 text-left">
        <label className="flex flex-col gap-1.5 text-sm text-stone-700">
          Verification code
          <input
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="123456"
            className="input text-center text-lg tracking-[0.4em]"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {resent && <p className="text-sm text-[#2D5A27]">New code sent — check your inbox.</p>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>

      <button onClick={handleResend} className="mt-6 text-xs text-stone-500 underline">
        Didn&apos;t get it? Send a new code
      </button>
    </main>
  );
}
