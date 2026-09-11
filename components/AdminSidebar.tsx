"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Wallet,
  Gift,
  Users,
  Coffee,
  History,
  LogOut,
  Menu as MenuIcon,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/pos", label: "POS", icon: ShoppingCart, hideForSuperAdmin: true },
      { href: "/admin/orders", label: "Orders", icon: Receipt },
      { href: "/admin/shifts", label: "Shifts", icon: Wallet },
    ],
  },
  {
    label: "Loyalty",
    items: [
      { href: "/admin/stamps", label: "Stamps", icon: Gift },
      { href: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Catalog",
    items: [{ href: "/admin/menu", label: "Menu", icon: Coffee }],
  },
  {
    label: "System",
    items: [{ href: "/admin/logs", label: "Activity Log", icon: History }],
  },
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

  const brandBlock = (size: number) => (
    <div className="flex items-center gap-2.5">
      <Image src="/logo_sns.jpg" alt="Sip & Savor Spot" width={size} height={size} className="rounded-full ring-2 ring-[#2D5A27]/10" />
      <div>
        <p className="font-serif text-base leading-tight text-[#2D5A27]">Sip &amp; Savor</p>
        <div className="mt-1 flex items-center gap-1.5">
          {access.isBranchLocked && (
            <span className="rounded-full bg-[#2D5A27]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2D5A27]">
              {access.branch}
            </span>
          )}
          <span className="text-xs text-stone-500">
            {access.role === "super_admin" ? "Super Admin" : "Admin"}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 print:hidden md:hidden">
        {brandBlock(28)}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle admin menu"
          aria-expanded={open}
          className="rounded-lg border border-stone-300 p-2 text-[#2D5A27] transition hover:bg-[#2D5A27]/5"
        >
          {open ? <X size={18} /> : <MenuIcon size={18} />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: slide-in drawer on mobile, pinned in place on desktop (doesn't scroll with content) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col overflow-y-auto border-r border-stone-200 bg-white shadow-sm transition-transform duration-200 print:hidden md:w-60 md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="hidden border-b border-stone-200 px-5 py-5 md:block">{brandBlock(34)}</div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => !item.hideForSuperAdmin || access.role !== "super_admin");
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                          active
                            ? "bg-[#2D5A27] font-medium text-[#F9F6F0] shadow-sm"
                            : "text-stone-600 hover:bg-[#2D5A27]/8 hover:text-[#2D5A27]"
                        }`}
                      >
                        <Icon size={17} strokeWidth={2} className={active ? "text-[#F9F6F0]" : "text-stone-400"} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-stone-200 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-stone-600 transition hover:bg-stone-100"
          >
            <LogOut size={17} className="text-stone-400" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
