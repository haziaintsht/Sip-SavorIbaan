"use client";

import { useEffect, useMemo, useState } from "react";
import { categories, menuItems } from "@/data/menu";

const SECRET_CODE = "SIPNSAVOR";

export default function MenuPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [unlocked, setUnlocked] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [typedBuffer, setTypedBuffer] = useState("");

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

  const visibleCategories = useMemo(
    () => (unlocked ? [...categories, "Secret Menu"] : categories),
    [unlocked]
  );

  const filtered = useMemo(() => {
    return menuItems
      .filter((item) => (unlocked ? true : !item.hidden))
      .filter((item) => (activeCategory === "All" ? true : item.category === activeCategory))
      .filter((item) =>
        query.trim() === ""
          ? true
          : `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query.toLowerCase())
      );
  }, [activeCategory, query, unlocked]);

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

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the menu..."
          className="input sm:max-w-xs"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("All")}
            className={`chip ${activeCategory === "All" ? "chip-active" : ""}`}
          >
            All
          </button>
          {visibleCategories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`chip ${activeCategory === c ? "chip-active" : ""}`}
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <div
            key={item.name}
            className={`rounded-2xl border p-5 ${
              item.hidden ? "border-[#2D5A27]/30 bg-[#2D5A27]/5" : "border-stone-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-lg text-stone-900">{item.name}</h3>
              <span className="whitespace-nowrap text-sm font-medium text-[#2D5A27]">
                {item.price}
              </span>
            </div>
            {item.description && (
              <p className="mt-1.5 text-sm text-stone-600">{item.description}</p>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-stone-500">
            Nothing matches that search.
          </p>
        )}
      </div>
    </main>
  );
}
