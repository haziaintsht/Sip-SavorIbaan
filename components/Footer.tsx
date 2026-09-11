"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SocialIcons from "@/components/SocialIcons";

const BRANCHES = [
  { name: "Palindan Branch", address: "Old Alternate Route, Palindan", hours: "10:00 AM – 12:00 MN" },
  { name: "Uptown Branch", address: "Inside Ibaan Recreation Park, Poblacion", hours: "8:00 AM – 12:00 MN" },
];

export default function Footer() {
  const pathname = usePathname();
  const supabase = createClient();
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

  return (
    <footer id="contact" className="border-t border-[#2D5A27]/10 bg-[#2D5A27] text-[#F9F6F0]">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo_sns.jpg" alt="Sip & Savor Spot" width={32} height={32} className="rounded-full" />
            <span className="font-serif text-lg">Sip &amp; Savor Spot</span>
          </Link>
          <p className="mt-2 text-sm text-[#F9F6F0]/70">
            A cozy al fresco spot in Ibaan to slow down, catch up, and sip something good.
          </p>
        </div>

        {!loggedIn && (
          <div>
            <h3 className="text-sm font-semibold text-[#F9F6F0]">Company</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-[#F9F6F0]/80">
              <li><Link href="/" className="hover:text-[#F9F6F0] hover:underline">Home</Link></li>
              <li><Link href="/menu" className="hover:text-[#F9F6F0] hover:underline">Menu</Link></li>
              <li><Link href="/#story" className="hover:text-[#F9F6F0] hover:underline">About</Link></li>
              <li><Link href="/register" className="hover:text-[#F9F6F0] hover:underline">Join Loyalty</Link></li>
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-[#F9F6F0]">Visit Us</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-[#F9F6F0]/80">
            {BRANCHES.map((b) => (
              <li key={b.name}>
                {b.name} — {b.address}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[#F9F6F0]/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-[#F9F6F0]/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Sip &amp; Savor Spot. All rights reserved.</p>
          <SocialIcons />
        </div>
      </div>
    </footer>
  );
}
