"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push(`/reset-password?email=${encodeURIComponent(email)}`);
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-serif text-3xl text-[#2D5A27]">Forgot password</h1>
      <p className="mt-2 text-sm text-stone-600">
        Enter your email and we&apos;ll send you a code to reset it.
      </p>

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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset code"}
        </button>

        <Link href="/login" className="text-center text-sm text-stone-500 hover:underline">
          Back to log in
        </Link>
      </form>
    </main>
  );
}
