export default function SignedInCheck({ size = 56 }: { size?: number }) {
  return (
    <svg className="signed-in-check" width={size} height={size} viewBox="0 0 35.6 35.6" aria-hidden="true">
      <circle className="bg" cx="17.8" cy="17.8" r="17.8" />
      <circle className="stroke" cx="17.8" cy="17.8" r="14.37" />
      <polyline className="check" points="11.78 18.12 15.55 22.23 25.17 12.87" />
    </svg>
  );
}
