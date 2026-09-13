"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export default function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hovered || value);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="p-0.5"
          >
            <Star
              size={26}
              strokeWidth={1.5}
              className={filled ? "fill-[#2D5A27] text-[#2D5A27]" : "fill-transparent text-stone-300"}
            />
          </button>
        );
      })}
    </div>
  );
}
