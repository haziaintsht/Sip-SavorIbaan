export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="font-serif text-3xl text-[#2D5A27]">Terms of Use</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated September 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-stone-700">
        <section>
          <h2 className="font-serif text-lg text-[#2D5A27]">The loyalty program</h2>
          <p className="mt-2">
            Creating an account enrolls you in the Sip &amp; Savor Spot loyalty program. Show your QR
            code (or give us your name) at either the Palindan or Uptown branch with a qualifying order
            to earn a digital stamp. Collect 10 stamps and your next Signature Drink is free. One
            account works at both branches.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-[#2D5A27]">Stamps and rewards</h2>
          <p className="mt-2">
            Stamps are added by our staff at the time of a qualifying order and can&apos;t be backdated
            or transferred between accounts. We may correct a stamp count that was added in error. Free
            drinks earned through the program have no cash value and can&apos;t be exchanged for cash.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-[#2D5A27]">Your account</h2>
          <p className="mt-2">
            You&apos;re responsible for keeping your login details to yourself. Let us know if you think
            someone else has accessed your account. We may suspend an account used to abuse the loyalty
            program (for example, claiming stamps for orders that didn&apos;t happen).
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-[#2D5A27]">Changes</h2>
          <p className="mt-2">
            We&apos;re a small, local coffee shop and may update these terms or the loyalty program from
            time to time — for example, adjusting how many stamps a free drink costs. We&apos;ll keep the
            current terms posted here.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-[#2D5A27]">Questions</h2>
          <p className="mt-2">
            Reach us on Facebook, Instagram, or TikTok, or drop by either branch — we&apos;re happy to
            help.
          </p>
        </section>
      </div>
    </main>
  );
}
