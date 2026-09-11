"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61562860304155" },
  { label: "Instagram", href: "https://www.instagram.com/sipnsavorspot" },
  { label: "TikTok", href: "https://www.tiktok.com/@sipandsavorspot?_r=1&_t=ZS-99cLFRi93mG" },
];

const BRANCHES = [
  { name: "Palindan Branch", address: "Old Alternate Route, Palindan", hours: "10:00 AM – 12:00 MN" },
  { name: "Uptown Branch", address: "Inside Ibaan Recreation Park, Poblacion", hours: "8:00 AM – 12:00 MN" },
];

export default function Footer() {
  const pathname = usePathname();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
    });

    // Footer lives in the root layout and never remounts on client-side
    // navigation, so a login/logout on another page wouldn't otherwise be
    // noticed until a full reload — listen for the auth event instead.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (pathname?.startsWith("/admin")) return null;

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("saving");
    setErrorMsg(null);

    const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim() });

    if (error) {
      setStatus("error");
      setErrorMsg(error.code === "23505" ? "You're already on the list!" : "Something went wrong. Try again.");
      return;
    }
    setStatus("done");
    setEmail("");
  }

  return (
    <footer id="contact" className="border-t border-[#2D5A27]/10 bg-[#2D5A27] text-[#F9F6F0]">
      <div
        className={`mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 ${
          loggedIn ? "lg:grid-cols-2" : "lg:grid-cols-4"
        }`}
      >
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo_sns.jpg" alt="Sip & Savor Spot" width={36} height={36} className="rounded-full" />
            <span className="font-serif text-lg">Sip &amp; Savor Spot</span>
          </Link>
          {!loggedIn && (
            <p className="mt-3 text-sm text-[#F9F6F0]/70">
              A cozy al fresco spot in Ibaan to slow down, catch up, and sip something good.
            </p>
          )}
        </div>

        {!loggedIn && (
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-[#F9F6F0]/60">Quick Links</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li><Link href="/" className="hover:underline">Home</Link></li>
              <li><Link href="/menu" className="hover:underline">Menu</Link></li>
              <li><Link href="/#story" className="hover:underline">About</Link></li>
              <li><Link href="/register" className="hover:underline">Join Loyalty</Link></li>
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-[#F9F6F0]/60">Find Us</h3>
          <ul className="mt-3 flex flex-col gap-3 text-sm text-[#F9F6F0]/85">
            {BRANCHES.map((b) => (
              <li key={b.name}>
                <p className="font-medium text-[#F9F6F0]">{b.name}</p>
                <p>{b.address}</p>
                <p className="text-[#F9F6F0]/60">{b.hours}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-3 text-sm">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {!loggedIn && (
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-[#F9F6F0]/60">Stay in the loop</h3>
            <p className="mt-3 text-sm text-[#F9F6F0]/70">
              Get news on new drinks, promos, and the secret menu.
            </p>
            {status === "done" ? (
              <p className="mt-3 text-sm text-[#F9F6F0]">You&apos;re subscribed — see you at the counter ☕</p>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-3 flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="min-w-0 flex-1 rounded-full border border-[#F9F6F0]/30 bg-transparent px-4 py-2 text-sm text-[#F9F6F0] placeholder:text-[#F9F6F0]/50 focus:border-[#F9F6F0] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={status === "saving"}
                  className="shrink-0 rounded-full bg-[#F9F6F0] px-4 py-2 text-sm font-medium text-[#2D5A27] disabled:opacity-60"
                >
                  {status === "saving" ? "…" : "Subscribe"}
                </button>
              </form>
            )}
            {status === "error" && errorMsg && <p className="mt-2 text-xs text-[#F9F6F0]/80">{errorMsg}</p>}
          </div>
        )}
      </div>

      <div className="border-t border-[#F9F6F0]/10 px-6 py-5 text-center text-xs text-[#F9F6F0]/60">
        © {new Date().getFullYear()} Sip &amp; Savor Spot. All rights reserved.
      </div>
    </footer>
  );
}
