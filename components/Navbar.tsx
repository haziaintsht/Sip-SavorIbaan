"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Role = "customer" | "admin" | null;

export default function Navbar() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setLoggedIn(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole((profile?.role as Role) ?? "customer");
    });
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const links = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#2D5A27]/10 bg-[#F9F6F0]/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl tracking-tight text-[#2D5A27]">
          Sip &amp; Savor Spot
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-stone-700 hover:text-[#2D5A27]">
              {l.label}
            </Link>
          ))}

          {loggedIn ? (
            <>
              <Link
                href={role === "admin" ? "/admin" : "/dashboard"}
                className="text-sm text-stone-700 hover:text-[#2D5A27]"
              >
                {role === "admin" ? "Admin Panel" : "My Stamp Card"}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full border border-[#2D5A27] px-4 py-2 text-sm text-[#2D5A27]"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-stone-700 hover:text-[#2D5A27]">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[#2D5A27] px-4 py-2 text-sm text-[#F9F6F0]"
              >
                Join loyalty
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d={open ? "M6 6l12 12M6 18 18 6" : "M4 7h16M4 12h16M4 17h16"}
              stroke="#2D5A27"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </nav>

      {open && (
        <div className="flex flex-col gap-1 border-t border-[#2D5A27]/10 px-6 py-4 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="py-2 text-sm text-stone-700">
              {l.label}
            </Link>
          ))}
          {loggedIn ? (
            <>
              <Link href={role === "admin" ? "/admin" : "/dashboard"} className="py-2 text-sm text-stone-700">
                {role === "admin" ? "Admin Panel" : "My Stamp Card"}
              </Link>
              <button onClick={handleLogout} className="py-2 text-left text-sm text-[#2D5A27]">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="py-2 text-sm text-stone-700">Log in</Link>
              <Link href="/register" className="py-2 text-sm text-[#2D5A27]">Join loyalty</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
