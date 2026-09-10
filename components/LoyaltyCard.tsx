const TOTAL_SLOTS = 10;

export default function LoyaltyCard({ stampCount }: { stampCount: number }) {
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i < stampCount);
  const remaining = TOTAL_SLOTS - stampCount;

  return (
    <div className="rounded-3xl border border-[#2D5A27]/15 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
        {slots.map((filled, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-full border-2 text-xs font-medium ${
              filled
                ? "border-[#2D5A27] bg-[#2D5A27] text-[#F9F6F0]"
                : "border-dashed border-stone-300 text-stone-300"
            }`}
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
  );
}
