"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/pos", label: "POS" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/shifts", label: "Shifts" },
  { href: "/admin/stamps", label: "Stamps" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/logs", label: "Activity Log" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const access = useAdminAccess();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 print:hidden md:hidden">
        <div className="flex items-center gap-2">
          <Image src="/logo_sns.jpg" alt="Sip & Savor Spot" width={28} height={28} className="rounded-full" />
          <div>
            <p className="font-serif text-sm leading-tight text-[#2D5A27]">Sip &amp; Savor</p>
            <p className="text-xs leading-tight text-stone-500">
              {access.isBranchLocked ? `${access.branch} Admin` : "Admin"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle admin menu"
          aria-expanded={open}
          className="rounded-lg border border-stone-300 p-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d={open ? "M6 6l12 12M6 18 18 6" : "M4 7h16M4 12h16M4 17h16"}
              stroke="#2D5A27"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: slide-in drawer on mobile, pinned in place on desktop (doesn't scroll with content) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col overflow-y-auto border-r border-stone-200 bg-white transition-transform duration-200 print:hidden md:w-56 md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="hidden items-center gap-2 border-b border-stone-200 px-5 py-5 md:flex">
          <Image src="/logo_sns.jpg" alt="Sip & Savor Spot" width={32} height={32} className="rounded-full" />
          <div>
            <p className="font-serif text-sm leading-tight text-[#2D5A27]">Sip &amp; Savor</p>
            <p className="text-xs leading-tight text-stone-500">
              {access.isBranchLocked ? `${access.branch} Admin` : "Admin"}
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.filter((item) => item.href !== "/admin/pos" || access.role !== "super_admin").map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-[#2D5A27] text-[#F9F6F0]"
                    : "text-stone-600 hover:bg-[#2D5A27]/10 hover:text-[#2D5A27]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-stone-200 p-3">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
