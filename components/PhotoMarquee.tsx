import Image from "next/image";

const PHOTOS = Array.from({ length: 8 }, (_, i) => `/community/community-${i + 1}.jpg`);

export default function PhotoMarquee() {
  // Rendered twice back-to-back so the track can scroll exactly -50% and loop seamlessly.
  const track = [...PHOTOS, ...PHOTOS];

  return (
    <div className="overflow-hidden">
      <div className="marquee-track flex w-max">
        {track.map((src, i) => (
          <div key={i} className="relative h-56 w-72 shrink-0 sm:h-64 sm:w-80">
            <Image src={src} alt="Guests at Sip & Savor Spot" fill className="object-cover" sizes="320px" />
          </div>
        ))}
      </div>
    </div>
  );
}
