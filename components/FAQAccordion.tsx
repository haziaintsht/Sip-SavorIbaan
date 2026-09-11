"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Do you have a secret menu?",
    a: "We do — a handful of drinks that never made it onto the printed board. They're hiding on the menu page for anyone curious enough to go looking. 👀",
  },
  {
    q: "What are your hours?",
    a: "Palindan Branch is open 10:00 AM – 12:00 MN daily. Uptown Branch is open 8:00 AM – 12:00 MN daily.",
  },
  {
    q: "Do you deliver?",
    a: "Yes — message us on Facebook, Instagram, or TikTok to arrange delivery.",
  },
  {
    q: "Is there parking?",
    a: "Yes, plenty of room for the whole barkada — cars and motorcycles alike.",
  },
  {
    q: "Are pets allowed?",
    a: "Bring your dog! We keep water bowls by the door and seat pet owners in our alfresco area.",
  },
  {
    q: "How does the loyalty card work?",
    a: "Create an account, show your QR code at the counter with every order, and earn a digital stamp. Collect 10 stamps and your next Signature Drink is free.",
  },
  {
    q: "Does my loyalty card work at both branches?",
    a: "Yes — one account, one card, works at Palindan and Uptown.",
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto mt-8 max-w-3xl divide-y divide-[#2D5A27]/10 rounded-2xl border border-[#2D5A27]/10 bg-white">
      {FAQS.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q}>
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
            >
              <span className="font-medium text-stone-900">{item.q}</span>
              <span
                className={`shrink-0 text-[#2D5A27] transition-transform duration-200 ${open ? "rotate-45" : ""}`}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <div
              className={`grid overflow-hidden px-6 text-sm text-stone-600 transition-all duration-300 ease-out ${
                open ? "grid-rows-[1fr] pb-4 opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0">{item.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
