"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu as MenuIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clearRememberPreference } from "@/lib/rememberMe";
import BranchPickerModal from "@/components/BranchPickerModal";

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
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(initialRole);
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [mounted, setMounted] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);

  function openBranchPicker() {
    setOpen(false);
    setShowBranchPicker(true);
  }

  function goToBranchMenu(branch: "Palindan" | "Uptown") {
    setShowBranchPicker(false);
    router.push(`/menu?branch=${branch}`);
  }

  useEffect(() => setMounted(true), []);

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
    clearRememberPreference();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (pathname?.startsWith("/admin")) return null;

  const isStaff = role === "admin" || role === "super_admin";
  const logoHref = loggedIn ? (isStaff ? "/admin" : "/dashboard") : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-[#2D5A27]/10 bg-[#F9F6F0]/95 backdrop-blur">
      <nav className="relative z-50 mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={logoHref} className="flex items-center gap-2.5">
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
          <button onClick={openBranchPicker} className="text-sm text-stone-700 hover:text-[#2D5A27]">
            Menu
          </button>

          {loggedIn ? (
            <>
              {!isStaff && (
                <Link href="/account" className="text-sm text-stone-700 hover:text-[#2D5A27]">
                  Account
                </Link>
              )}
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

      {/* Invisible click-catcher so tapping outside the menu closes it.
          Portaled to <body> because the header's backdrop-blur makes it a
          containing block for position:fixed descendants — a fixed overlay
          rendered inside header would be clipped to the header's own height
          instead of covering the viewport. No dimming: it's transparent on
          purpose, purely for the outside-click behavior.
          z-30, not z-40: header (sticky + z-40) is its own stacking context,
          so nothing inside it — however high its own z-index — can ever
          out-rank this catcher once it ties header's z-40 from outside; the
          catcher must stay strictly below header's z-index for header's
          content (the menu panel included) to reliably paint on top of it. */}
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-30 md:hidden" onClick={() => setOpen(false)} />,
          document.body
        )}

      <AnimatePresence>
        {open && (
            <motion.div
              key="menu"
              className="absolute inset-x-4 top-full z-40 mt-2 flex flex-col gap-1 rounded-2xl border border-[#2D5A27]/10 bg-[#F9F6F0] p-3 shadow-xl md:hidden"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              {!loggedIn &&
                siteLinks.map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-[#2D5A27]/5">
                    {l.label}
                  </Link>
                ))}
              {loggedIn && !isStaff && (
                <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-[#2D5A27]/5">
                  Home
                </Link>
              )}
              <button
                onClick={openBranchPicker}
                className="rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-[#2D5A27]/5"
              >
                Menu
              </button>
              {loggedIn ? (
                <>
                  {!isStaff && (
                    <Link href="/account" className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-[#2D5A27]/5">
                      Account
                    </Link>
                  )}
                  {isStaff && (
                    <Link href="/admin" className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-[#2D5A27]/5">
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-2 text-left text-sm text-[#2D5A27] hover:bg-[#2D5A27]/5"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-[#2D5A27]/5">
                    Log in
                  </Link>
                  <Link href="/register" className="rounded-lg px-3 py-2 text-sm font-medium text-[#2D5A27] hover:bg-[#2D5A27]/5">
                    Join us
                  </Link>
                </>
              )}
            </motion.div>
        )}
      </AnimatePresence>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {showBranchPicker && (
              <BranchPickerModal
                key="branch-picker"
                onSelect={goToBranchMenu}
                onClose={() => setShowBranchPicker(false)}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </header>
  );
}
