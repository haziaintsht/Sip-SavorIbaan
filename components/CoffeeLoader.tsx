export default function CoffeeLoader({
  label = "Loading...",
  size = 72,
  className = "",
}: {
  label?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div className="coffee-loader" style={{ fontSize: size }} role="status" aria-label={label ?? "Loading"}>
        <div className="cup">
          <div className="cup-handle" />
          <div className="smoke one" />
          <div className="smoke two" />
          <div className="smoke three" />
        </div>
      </div>
      {label && <p className="text-sm text-stone-500">{label}</p>}
    </div>
  );
}
