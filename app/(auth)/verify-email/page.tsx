import { Mail } from "lucide-react";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <Mail size={48} strokeWidth={1.5} className="text-[#2D5A27]" />
      <h1 className="mt-6 font-serif text-2xl text-[#2D5A27]">Check your inbox</h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        We sent a verification link to{" "}
        <span className="font-medium text-stone-900">{email ?? "your email"}</span>. Open it in
        your Gmail or email app to activate your loyalty account, then come back and log in.
      </p>
      <p className="mt-6 text-xs text-stone-500">
        Didn&apos;t get it? Check spam, or try registering again in a minute.
      </p>
    </main>
  );
}
