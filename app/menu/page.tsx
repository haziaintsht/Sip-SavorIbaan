"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMenuPrice } from "@/lib/menuPrice";

const SECRET_CODE = "SIPNSAVOR";

type Branch = "Palindan" | "Uptown";

const BRANCHES: Branch[] = ["Palindan", "Uptown"];

const CATEGORIES_BY_BRANCH: Record<Branch, string[]> = {
  Palindan: [
    "Appetizers",
    "Chicken Fingers",
    "Chicken Drummets",
    "Rice Meals",
    "Combo Meals",
    "Specials",
    "May Kape",
    "Walang Kape",
    "Klassics — Coffee Based",
    "Klassics — Non-Coffee Based",
    "Teas",
  ],
  Uptown: [
    "Mini Drumsticks / Signature Glazed Chicken",
    "Merienda",
    "Rice Meals",
    "Coffee-Based Signature Drinks",
    "Non-Coffee Signature Drinks",
    "Teas",
    "Blended Beverages",
    "Extras/Add-ons",
  ],
};

type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number | null;
  price_medium: number | null;
  price_large: number | null;
  price_note: string | null;
  is_hidden: boolean;
  image_url: string | null;
};

export default function MenuPage() {
  const supabase = createClient();
  const [branch, setBranch] = useState<Branch>("Palindan");
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [unlocked, setUnlocked] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [typedBuffer, setTypedBuffer] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItemRow | null>(null);

  const categories = CATEGORIES_BY_BRANCH[branch];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActiveCategory("All");

    supabase
      .from("menu_items")
      .select("id, name, description, category, price, price_medium, price_large, price_note, is_hidden, image_url")
      .eq("branch", branch)
      .eq("is_available", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setItems(data ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  // Secret trigger #1: tap/click the logo star 3 times within 1.5s
  function handleStarTap() {
    setTapCount((c) => c + 1);
  }

  useEffect(() => {
    if (tapCount === 0) return;
    if (tapCount >= 3) {
      setUnlocked(true);
      setTapCount(0);
      return;
    }
    const t = setTimeout(() => setTapCount(0), 1500);
    return () => clearTimeout(t);
  }, [tapCount]);

  // Secret trigger #2: type SIPNSAVOR anywhere on the page
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.length !== 1) return;
      setTypedBuffer((prev) => {
        const next = (prev + e.key).slice(-SECRET_CODE.length).toUpperCase();
        if (next === SECRET_CODE) setUnlocked(true);
        return next;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the item detail modal with Escape
  useEffect(() => {
    if (!selectedItem) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedItem(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedItem]);

  const hasHiddenItems = items.some((item) => item.is_hidden);
  const visibleCategories = useMemo(
    () => (unlocked && hasHiddenItems ? [...categories, "Secret Menu"] : categories),
    [categories, unlocked, hasHiddenItems]
  );

  const filtered = useMemo(() => {
    return items
      .filter((item) => (unlocked ? true : !item.is_hidden))
      .filter((item) => (activeCategory === "All" ? true : item.category === activeCategory))
      .filter((item) =>
        query.trim() === ""
          ? true
          : `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query.toLowerCase())
      );
  }, [items, activeCategory, query, unlocked]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleStarTap}
          aria-label="Sip and Savor Spot"
          className="text-[#2D5A27] transition hover:scale-110"
          title="tap thrice for something special"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.9 6.3L21.5 9l-5 4.9 1.2 7.1L12 17.8 6.3 21l1.2-7.1-5-4.9 6.6-.7L12 2z" />
          </svg>
        </button>
        <h1 className="text-center font-serif text-4xl text-[#2D5A27]">Our Menu</h1>
      </div>
      <p className="mt-2 text-center text-sm text-stone-500">
        Coffee, snacks, rice meals — and maybe a little more if you know where to look.
      </p>

      <div className="mt-6 flex justify-center gap-2">
        {BRANCHES.map((b) => (
          <button
            key={b}
            onClick={() => setBranch(b)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              branch === b
                ? "bg-[#2D5A27] text-[#F9F6F0]"
                : "border border-stone-300 text-stone-600 hover:border-[#2D5A27]"
            }`}
          >
            {b} Branch
          </button>
        ))}
      </div>

      <div className="sticky top-16 z-20 -mx-6 mt-8 bg-[#F9F6F0]/95 px-6 py-3 backdrop-blur">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the menu..."
          className="input w-full sm:max-w-xs"
        />

        <div className="no-scrollbar -mx-6 mt-3 flex gap-2 overflow-x-auto px-6 pb-1">
          <button
            onClick={() => setActiveCategory("All")}
            className={`chip shrink-0 ${activeCategory === "All" ? "chip-active" : ""}`}
          >
            All
          </button>
          {visibleCategories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`chip shrink-0 whitespace-nowrap ${activeCategory === c ? "chip-active" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {unlocked && (
        <div className="mt-8 rounded-2xl border border-[#2D5A27]/20 bg-[#2D5A27]/5 px-5 py-4 text-sm text-[#2D5A27]">
          🌟 Secret menu unlocked. These drinks aren&apos;t on the printed board.
        </div>
      )}

      {loading && <p className="mt-10 text-center text-sm text-stone-500">Loading the menu…</p>}

      {!loading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelectedItem(item)}
              className={`group cursor-pointer overflow-hidden rounded-2xl border transition hover:shadow-md ${
                item.is_hidden ? "border-[#2D5A27]/30 bg-[#2D5A27]/5" : "border-stone-200 bg-white"
              }`}
            >
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
                {activeCategory === "All" && (
                  <p className="text-xs uppercase tracking-wide text-stone-400">{item.category}</p>
                )}
                <div className="mt-1 flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg leading-snug text-stone-900">{item.name}</h3>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-[#2D5A27]/10 px-2.5 py-1 text-xs font-medium text-[#2D5A27]">
                    {formatMenuPrice(item)}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{item.description}</p>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-stone-500">
              Nothing matches that search.
            </p>
          )}
        </div>
      )}

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {selectedItem.image_url ? (
                <div className="relative h-64 w-full bg-stone-100">
                  <Image
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    fill
                    className="object-contain p-4"
                  />
                </div>
              ) : (
                <div className="h-16 w-full bg-[#2D5A27]/5" />
              )}
              <button
                onClick={() => setSelectedItem(null)}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-stone-600 shadow-sm hover:text-[#2D5A27]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M6 18 18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <p className="text-xs uppercase tracking-wide text-stone-400">{selectedItem.category}</p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <h3 className="font-serif text-2xl text-stone-900">{selectedItem.name}</h3>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-[#2D5A27]/10 px-3 py-1.5 text-sm font-medium text-[#2D5A27]">
                  {formatMenuPrice(selectedItem)}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-stone-600">
                {selectedItem.description ?? "No description yet for this item."}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
