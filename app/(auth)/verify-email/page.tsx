function MailIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-[#2D5A27]">
      <path
        d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <MailIcon />
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
