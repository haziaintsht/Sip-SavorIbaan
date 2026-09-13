"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: code.trim(), password }),
    });
    const body = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "That code is invalid or expired.");
      return;
    }

    router.push("/login?reset=1");
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    const res = await fetch("/api/auth/forgot-password", {
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
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-serif text-3xl text-[#2D5A27]">Reset your password</h1>
      <p className="mt-2 text-sm text-stone-600">
        Enter the code we sent to{" "}
        <span className="font-medium text-stone-900">{email || "your email"}</span> and choose a
        new password.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-stone-700">
          Reset code
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
        {resent && <p className="text-sm text-[#2D5A27]">New code sent — check your inbox.</p>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="mt-2 rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save new password"}
        </button>
      </form>

      <button onClick={handleResend} className="mt-4 text-center text-xs text-stone-500 underline">
        Didn&apos;t get it? Send a new code
      </button>

      <Link href="/login" className="mt-6 text-center text-sm text-stone-500 hover:underline">
        Back to log in
      </Link>
    </main>
  );
}
