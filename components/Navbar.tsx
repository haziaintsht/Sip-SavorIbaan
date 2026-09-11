"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu as MenuIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = "customer" | "admin" | "super_admin" | null;

const siteLinks = [
  { href: "/", label: "Home" },
  { href: "/#story", label: "About" },
  { href: "/#contact", label: "Contact" },
];

export default function Navbar({
  initialLoggedIn = false,
  initialRole = null,
}: {
  initialLoggedIn?: boolean;
  initialRole?: Role;
}) {
  const pathname = usePathname();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(initialRole);
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);

  useEffect(() => {
    async function syncFromUser(user: { id: string } | null) {
      if (!user) {
        setLoggedIn(false);
        setRole(null);
        return;
      }
      setLoggedIn(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole((profile?.role as Role) ?? "customer");
    }

    supabase.auth.getUser().then(({ data: { user } }) => syncFromUser(user));

    // Navbar lives in the root layout and never remounts on client-side
    // navigation, so a login/logout on another page (e.g. /login) wouldn't
    // otherwise be noticed until a full reload — listen for the auth event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (pathname?.startsWith("/admin")) return null;

  const isStaff = role === "admin" || role === "super_admin";

  return (
    <header className="sticky top-0 z-40 border-b border-[#2D5A27]/10 bg-[#F9F6F0]/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo_sns.jpg"
            alt="Sip & Savor Spot"
            width={36}
            height={36}
            className="rounded-full"
            priority
          />
          <span className="font-serif text-xl tracking-tight text-[#2D5A27]">
            Sip &amp; Savor Spot
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {!loggedIn &&
            siteLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-stone-700 hover:text-[#2D5A27]">
                {l.label}
              </Link>
            ))}
          {loggedIn && !isStaff && (
            <Link href="/dashboard" className="text-sm text-stone-700 hover:text-[#2D5A27]">
              Home
            </Link>
          )}
          <Link href="/menu" className="text-sm text-stone-700 hover:text-[#2D5A27]">
            Menu
          </Link>

          {loggedIn ? (
            <>
              {isStaff && (
                <Link href="/admin" className="text-sm text-stone-700 hover:text-[#2D5A27]">
                  Admin Panel
                </Link>
              )}
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
                Join us
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
          {open ? <X size={22} className="text-[#2D5A27]" /> : <MenuIcon size={22} className="text-[#2D5A27]" />}
        </button>
      </nav>

      {open && (
        <div className="flex flex-col gap-1 border-t border-[#2D5A27]/10 px-6 py-4 md:hidden">
          {!loggedIn &&
            siteLinks.map((l) => (
              <Link key={l.href} href={l.href} className="py-2 text-sm text-stone-700">
                {l.label}
              </Link>
            ))}
          {loggedIn && !isStaff && (
            <Link href="/dashboard" className="py-2 text-sm text-stone-700">
              Home
            </Link>
          )}
          <Link href="/menu" className="py-2 text-sm text-stone-700">
            Menu
          </Link>
          {loggedIn ? (
            <>
              {isStaff && (
                <Link href="/admin" className="py-2 text-sm text-stone-700">
                  Admin Panel
                </Link>
              )}
              <button onClick={handleLogout} className="py-2 text-left text-sm text-[#2D5A27]">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="py-2 text-sm text-stone-700">Log in</Link>
              <Link href="/register" className="py-2 text-sm text-[#2D5A27]">Join us</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
