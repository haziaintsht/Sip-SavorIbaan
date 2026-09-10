import Link from "next/link";

const branches = [
  {
    name: "Palindan Branch",
    address: "Old Alternate Route, Palindan",
    hours: "10:00 AM – 12:00 MN",
  },
  {
    name: "Uptown Branch",
    address: "Inside Ibaan Recreation Park, Poblacion",
    hours: "8:00 AM – 12:00 MN",
  },
];

const highlights = [
  { title: "Spacious Parking", desc: "Room for the whole barkada, cars and motorcycles alike." },
  { title: "Pet Friendly", desc: "Bring your dog. We keep water bowls by the door." },
  { title: "Alfresco Dining", desc: "Open-air seating under the trees, day or night." },
  { title: "Live Music", desc: "Acoustic sets on weekends — check our socials for the schedule." },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#2D5A27] px-6 py-24 text-[#F9F6F0] sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm uppercase tracking-widest text-[#F9F6F0]/70">
            Coffee · Snacks · Rice Meals
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">TARA KAPE.</h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-[#F9F6F0]/85 sm:text-lg">
            A cozy al fresco spot to slow down, catch up, and sip something good.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/menu"
              className="rounded-full bg-[#F9F6F0] px-7 py-3 text-sm font-medium text-[#2D5A27]"
            >
              View the menu
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-[#F9F6F0]/50 px-7 py-3 text-sm font-medium text-[#F9F6F0]"
            >
              Join the loyalty program
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {highlights.map((h) => (
            <div key={h.title} className="rounded-2xl border border-[#2D5A27]/10 p-5">
              <h3 className="font-serif text-lg text-[#2D5A27]">{h.title}</h3>
              <p className="mt-1.5 text-sm text-stone-600">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Branches */}
      <section className="bg-[#F9F6F0] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-serif text-3xl text-[#2D5A27]">Find us</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {branches.map((b) => (
              <div key={b.name} className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="font-serif text-xl text-[#2D5A27]">{b.name}</h3>
                <p className="mt-2 text-sm text-stone-600">{b.address}</p>
                <p className="mt-1 text-sm text-stone-500">{b.hours}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-sm text-stone-500">Find us on social media</p>
        <p className="mt-2 font-serif text-2xl text-[#2D5A27]">@sipnsavorspot</p>
        <p className="mt-1 text-sm text-stone-500">Facebook · Instagram · TikTok</p>
      </section>
    </main>
  );
}
