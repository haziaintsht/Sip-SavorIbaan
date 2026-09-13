import { Star } from "lucide-react";

type Testimonial = { quote: string; name: string; branch: string; rating: number };

export default function TestimonialsMarquee({
  testimonials,
  redactName,
}: {
  testimonials: Testimonial[];
  redactName: (name: string) => string;
}) {
  // Rendered twice back-to-back so the track can scroll exactly -50% and loop seamlessly.
  const track = [...testimonials, ...testimonials];

  return (
    <div className="overflow-hidden">
      <div className="marquee-track marquee-track-slow flex w-max gap-6 px-6">
        {track.map((t, i) => (
          <div
            key={i}
            className="flex h-52 w-80 shrink-0 flex-col rounded-2xl border border-[#2D5A27]/15 bg-white p-6 text-left shadow-sm sm:w-96"
          >
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={13}
                  className={n <= t.rating ? "fill-[#2D5A27] text-[#2D5A27]" : "fill-transparent text-stone-300"}
                />
              ))}
            </div>
            <p className="mt-2 line-clamp-4 text-sm italic text-stone-600">&quot;{t.quote}&quot;</p>
            <div className="mt-auto pt-4">
              <p className="text-sm font-medium text-[#2D5A27]">{redactName(t.name)}</p>
              {t.branch && <p className="text-xs text-stone-500">{t.branch}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
