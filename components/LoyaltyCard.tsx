"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const TOTAL_SLOTS = 10;

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61562860304155" },
  { label: "Instagram", href: "https://www.instagram.com/sipnsavorspot" },
  { label: "TikTok", href: "https://www.tiktok.com/@sipandsavorspot?_r=1&_t=ZS-99cLFRi93mG" },
];

export default function LoyaltyCard({ stampCount }: { stampCount: number }) {
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i < stampCount);
  const remaining = TOTAL_SLOTS - stampCount;

  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const prevCount = useRef(stampCount);

  useEffect(() => {
    if (stampCount > prevCount.current) {
      setPulseIndex(stampCount - 1);
      const t = setTimeout(() => setPulseIndex(null), 700);
      prevCount.current = stampCount;
      return () => clearTimeout(t);
    }
    prevCount.current = stampCount;
  }, [stampCount]);

  return (
    <div className="overflow-hidden rounded-3xl border border-[#2D5A27]/15 bg-[#F3E9D3] shadow-sm">
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <p className="font-serif text-2xl tracking-tight text-stone-900">Loyalty Card</p>
          <a
            href="https://www.instagram.com/sipnsavorspot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-stone-600 hover:text-[#2D5A27] hover:underline"
          >
            @sipnsavorspot
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Image
            src="/logo_sns.jpg"
            alt="Sip & Savor Spot"
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="font-serif text-sm leading-tight text-[#2D5A27]">
            Sip &amp;<br />Savor Spot
          </span>
        </div>
      </div>

      <div className="px-6 pt-6">
        <div className="grid grid-cols-5 gap-3">
          {slots.map((filled, i) => (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-full border-2 text-xs font-medium ${
                filled
                  ? "border-[#2D5A27] bg-[#2D5A27] text-[#F9F6F0]"
                  : "border-dashed border-[#8a6d4a]/40 text-[#8a6d4a]/50"
              } ${i === pulseIndex ? "animate-stamp-pop" : ""}`}
            >
              {filled ? "☕" : i + 1}
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-sm text-stone-600">
          {remaining === 0
            ? "Reward ready — show this screen to redeem your free drink!"
            : `${remaining} stamp${remaining === 1 ? "" : "s"} away from a FREE Signature Drink!`}
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-1.5 border-t border-[#2D5A27]/10 bg-[#2D5A27]/5 px-6 py-4 text-center">
        <p className="text-xs text-stone-600">Palindan &amp; Uptown Branch, Ibaan</p>
        <div className="flex gap-3 text-xs text-stone-500">
          {SOCIALS.map((s, i) => (
            <span key={s.label} className="flex items-center gap-3">
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-[#2D5A27] hover:underline">
                {s.label}
              </a>
              {i < SOCIALS.length - 1 && <span className="text-stone-300">·</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
