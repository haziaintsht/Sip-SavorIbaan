export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="font-serif text-3xl text-[#2D5A27]">Privacy Notice</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated September 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-stone-700">
        <section>
          <h2 className="font-serif text-lg text-[#2D5A27]">What we collect</h2>
          <p className="mt-2">
            When you sign up for the loyalty program, we collect your full name, email address, phone
            number, and barangay. As you use the program, we also keep a record of your stamps, rewards
            redeemed, and order history at Palindan and Uptown.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-[#2D5A27]">How we use it</h2>
          <p className="mt-2">
            This information is used to run the loyalty program — tracking your stamps, letting our
            staff look up your account by name or QR code, and showing you your own order history. We
            may use your phone number or email to reach you about your account or an order, for example
            if you contact us to arrange delivery.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-[#2D5A27]">Who can see it</h2>
          <p className="mt-2">
            Your loyalty and order data is visible to Sip &amp; Savor Spot staff and management at both
            branches — that&apos;s how the shared, one-account-works-everywhere loyalty card works. We
            don&apos;t sell your information to anyone else.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-[#2D5A27]">Your data</h2>
          <p className="mt-2">
            You can ask us to correct or delete your account and its data at any time — message us on
            Facebook, Instagram, or TikTok, or ask a staff member at either branch.
          </p>
        </section>
      </div>
    </main>
  );
}
