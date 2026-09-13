"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Supabase sends a verification email; clicking it hits /auth/callback
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
          location,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-serif text-3xl text-[#2D5A27]">Create your account</h1>
      <p className="mt-2 text-sm text-stone-600">
        Join the loyalty program and start collecting stamps.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Full name">
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            placeholder="Juan Dela Cruz"
          />
        </Field>

        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="juan@gmail.com"
          />
        </Field>

        <Field label="Phone number">
          <input
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="input"
            placeholder="09XX XXX XXXX"
          />
        </Field>

        <Field label="Barangay">
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input"
            placeholder="e.g. Poblacion"
          />
        </Field>

        <Field label="Password">
          <PasswordInput
            required
            minLength={8}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            className="input"
          />
        </Field>

        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input
            required
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-[#2D5A27] focus:ring-[#2D5A27]"
          />
          <span>
            I accept the{" "}
            <Link href="/terms" target="_blank" className="text-[#2D5A27] underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="text-[#2D5A27] underline">
              Privacy Notice
            </Link>
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !acceptedTerms}
          className="mt-2 rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-stone-700">
      {label}
      {children}
    </label>
  );
}
