import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  message,
  className = "",
}: {
  icon: LucideIcon;
  message: string;
  className?: string;
}) {
  return (
    <div className={`animate-fade-in flex flex-col items-center justify-center gap-2.5 py-8 text-center ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2D5A27]/8">
        <Icon size={18} strokeWidth={2} className="text-[#2D5A27]/50" />
      </div>
      <p className="text-sm text-stone-500">{message}</p>
    </div>
  );
}
