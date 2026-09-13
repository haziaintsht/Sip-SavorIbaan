import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMenuPrice } from "@/lib/menuPrice";
import Reveal from "@/components/Reveal";
import FAQAccordion from "@/components/FAQAccordion";
import PhotoMarquee from "@/components/PhotoMarquee";
import TestimonialsMarquee from "@/components/TestimonialsMarquee";

const FALLBACK_BRANCHES = [
  {
    name: "Palindan Branch",
    address: "Old Alternate Route, Palindan",
    hours: "10:00 AM – 12:00 MN",
    mapQuery: "13.825266,121.132656",
  },
  {
    name: "Uptown Branch",
    address: "Inside Ibaan Recreation Park, Poblacion",
    hours: "8:00 AM – 12:00 MN",
    mapQuery: "Ibaan Recreation Park, Poblacion, Ibaan, Batangas",
  },
];

const highlights = [
  { title: "Spacious Parking", desc: "Room for the whole barkada, cars and motorcycles alike." },
  { title: "Pet Friendly", desc: "Bring your dog. We keep water bowls by the door." },
  { title: "Alfresco Dining", desc: "Open-air seating under the trees, day or night." },
  { title: "Live Music", desc: "Acoustic sets on weekends — check our socials for the schedule." },
];

// Illustrative sample quotes with locally-flavored names — swap in real
// customer reviews as they come in.
const testimonials = [
  {
    quote:
      "Sobrang sarap ng kape dito, tapos may WiFi pa for work! Regular na ako dito sa Palindan, konti na lang stamps ko para sa free drink.",
    name: "Marites Magsino",
    branch: "Palindan Branch",
  },
  {
    quote:
      "Ang bait ng staff dito sa Uptown, parang barkada mo lang! Favorite ko yung Signature Glazed Chicken, sulit na sulit.",
    name: "Jun Pesigan",
    branch: "Uptown Branch",
  },
  {
    quote:
      "Go-to spot namin ng family every weekend. Cozy yung ambiance, maganda din for chikahan. Sulit yung loyalty card, libre na kape after 10 stamps!",
    name: "Grace Villanueva",
    branch: "Palindan Branch",
  },
  {
    quote:
      "Dinala ko yung aso ko dito last week, ayos lang pala! Alfresco pa yung seating so sobrang relax ng vibe. Balik-balikan talaga.",
    name: "Ramon Macatangay",
    branch: "Uptown Branch",
  },
  {
    quote:
      "May live music sila tuwing weekend, sobrang saya! Dito na lang kami palagi mag-hangout ng mga kaibigan ko every Saturday night.",
    name: "Baby Marasigan",
    branch: "Palindan Branch",
  },
  {
    quote:
      "Maluwag yung parking kaya OK na OK pag maramihan kami. Yung mga blended drinks nila, panalo lagi — ilang beses na kami bumalik dito.",
    name: "Ella Panganiban",
    branch: "Uptown Branch",
  },
  {
    quote:
      "First time ko dito nung nag-work from home ako, ayun na-loyalty program pa pala ako in-add. Tuwang-tuwa ako sa stamp card nila, ang cute!",
    name: "Noel Ilagan",
    branch: "Palindan Branch",
  },
  {
    quote:
      "Naka-ilang stamp na ako dito sa Uptown, sulit talaga bawat order. Yung rice meals nila, laking tulong pag busy day sa trabaho.",
    name: "Tin Mendoza",
    branch: "Uptown Branch",
  },
];

// Keeps the first letter of each name part, dots out the rest — reads as
// anonymized without losing the sense of a real local name.
function redactName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] + ".".repeat(part.length - 1))
    .join(" ");
}

const steps = [
  { n: "01", title: "Join loyalty", desc: "Sign up in seconds and verify your email — your digital stamp card is ready instantly." },
  { n: "02", title: "Show your QR", desc: "Pull up your dashboard QR code at the counter with every order." },
  { n: "03", title: "Earn stamps", desc: "Staff adds a stamp per qualifying purchase, right up to 10." },
  { n: "04", title: "Free drink", desc: "Hit 10 stamps and your next Signature Drink is on us." },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: featuredItems } = await supabase
    .from("menu_items")
    .select("id, name, description, price, price_medium, price_large, price_note, image_url")
    .eq("branch", "Palindan")
    .eq("is_available", true)
    .not("image_url", "is", null)
    .order("sort_order", { ascending: true })
    .limit(6);

  const { data: branchInfo } = await supabase
    .from("branch_info")
    .select("branch, address, hours, map_lat, map_lng")
    .order("branch");

  const branches =
    branchInfo && branchInfo.length > 0
      ? branchInfo.map((b) => ({
          name: `${b.branch} Branch`,
          address: b.address,
          hours: b.hours,
          mapQuery: b.map_lat !== null && b.map_lng !== null ? `${b.map_lat},${b.map_lng}` : `${b.address}, Ibaan, Batangas`,
        }))
      : FALLBACK_BRANCHES;

  return (
    <main>
      {/* Hero */}
      <section>
        <Image
          src="/coverphotopage_sns.jpg"
          alt="Sip & Savor Spot — Tara Kape"
          width={3318}
          height={1264}
          priority
          className="h-auto w-full"
        />
        <Reveal onMount className="bg-[#2D5A27] px-6 py-10 text-center text-[#F9F6F0] sm:py-12">
          <p className="text-sm uppercase tracking-widest text-[#F9F6F0]/70">
            Coffee · Snacks · Rice Meals
          </p>
          <p className="mx-auto mt-3 max-w-xl text-base text-[#F9F6F0]/85 sm:text-lg">
            A cozy al fresco spot to slow down, catch up, and sip something good.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/menu"
              className="rounded-full bg-[#F9F6F0] px-7 py-3 text-sm font-medium text-[#2D5A27] shadow-sm transition hover:scale-105 hover:shadow-md"
            >
              Explore Our Brews
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-[#F9F6F0]/60 px-7 py-3 text-sm font-medium text-[#F9F6F0] transition hover:scale-105 hover:bg-[#F9F6F0]/10"
            >
              Join us and sign up!
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {highlights.map((h, i) => (
            <Reveal key={h.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-[#2D5A27]/10 p-5 transition hover:border-[#2D5A27]/30 hover:shadow-sm">
                <h3 className="font-serif text-lg text-[#2D5A27]">{h.title}</h3>
                <p className="mt-1.5 text-sm text-stone-600">{h.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-[#F9F6F0] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center">
            <p className="text-sm uppercase tracking-widest text-[#2D5A27]/60">Loyalty, made simple</p>
            <h2 className="mt-1 font-serif text-3xl text-[#2D5A27]">How It Works</h2>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="h-full rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                  <p className="font-serif text-3xl text-[#2D5A27]/25">{s.n}</p>
                  <h3 className="mt-2 font-serif text-lg text-[#2D5A27]">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-stone-600">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Showcase */}
      {featuredItems && featuredItems.length > 0 && (
        <section className="bg-white px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-widest text-[#2D5A27]/60">Fan favorites</p>
                <h2 className="mt-1 font-serif text-3xl text-[#2D5A27]">From the Menu</h2>
              </div>
              <Link
                href="/menu"
                className="group text-sm font-medium text-[#2D5A27] underline-offset-4 hover:underline"
              >
                View full menu{" "}
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </Reveal>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredItems.map((item, i) => (
                <Reveal key={item.id} delay={(i % 3) * 0.1} className="h-full">
                  <div className="group h-full overflow-hidden rounded-2xl border border-stone-200 transition hover:shadow-md">
                    {item.image_url && (
                      <div className="relative h-44 w-full bg-stone-100">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-contain p-2 transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-serif text-lg text-stone-900">{item.name}</h3>
                        <span className="whitespace-nowrap text-sm font-medium text-[#2D5A27]">
                          {formatMenuPrice(item)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-stone-600">{item.description}</p>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Community photo strip */}
      <section className="bg-[#F9F6F0] py-16">
        <Reveal className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-sm uppercase tracking-widest text-[#2D5A27]/60">Good Company</p>
          <h2 className="mt-1 font-serif text-3xl text-[#2D5A27]">Moments at the Spot</h2>
        </Reveal>
        <div className="mt-8">
          <PhotoMarquee />
        </div>
      </section>

      {/* Brand Story */}
      <section id="story" className="scroll-mt-20 px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 sm:items-center">
          <Reveal direction="left">
            <p className="text-sm uppercase tracking-widest text-[#2D5A27]/60">Our Story</p>
            <h2 className="mt-1 font-serif text-3xl text-[#2D5A27]">Tara, Kape.</h2>
            <p className="mt-4 text-stone-600">
              Tucked along Ibaan&apos;s Old Alternate Route and inside Ibaan Recreation Park, Sip &amp;
              Savor Spot is built around slow mornings, easy afternoons, and good company. Between
              hand-crafted coffee, snacks, and rice meals, there&apos;s always a reason to linger —
              whether you&apos;re catching up with friends, working from a shaded table, or bringing
              the whole barkada along for the ride.
            </p>
            <p className="mt-4 text-stone-600">
              Two branches, one loyalty card, and a secret menu for the regulars who know where to
              look.
            </p>
          </Reveal>
          <Reveal direction="right" delay={0.1} className="relative h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D5A27]/10 via-[#F9F6F0] to-[#2D5A27]/15 sm:h-80">
            <Image
              src="/menu/palindan/oreo-matcha.jpg"
              alt="A Sip & Savor Spot signature drink"
              fill
              className="object-contain p-10 drop-shadow-md sm:p-14"
            />
          </Reveal>
        </div>
      </section>

      {/* Branches */}
      <section className="bg-[#F9F6F0] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="font-serif text-3xl text-[#2D5A27]">Find us</h2>
          </Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {branches.map((b, i) => (
              <Reveal key={b.name} delay={i * 0.1}>
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">
                  <div className="p-6">
                    <h3 className="font-serif text-xl text-[#2D5A27]">{b.name}</h3>
                    <p className="mt-2 text-sm text-stone-600">{b.address}</p>
                    <p className="mt-1 text-sm text-stone-500">{b.hours}</p>
                  </div>
                  <iframe
                    title={`Map to ${b.name}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(b.mapQuery)}&output=embed`}
                    className="h-56 w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-sm uppercase tracking-widest text-[#2D5A27]/60">Questions</p>
            <h2 className="mt-1 font-serif text-3xl text-[#2D5A27]">Frequently Asked</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <FAQAccordion />
          </Reveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <Reveal className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-sm uppercase tracking-widest text-[#2D5A27]/60">What people say</p>
          <h2 className="mt-1 font-serif text-3xl text-[#2D5A27]">From Our Regulars</h2>
        </Reveal>
        <div className="mt-10">
          <TestimonialsMarquee testimonials={testimonials} redactName={redactName} />
        </div>
      </section>
    </main>
  );
}
