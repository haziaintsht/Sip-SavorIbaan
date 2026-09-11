export type MenuPriceFields = {
  price: number | null;
  price_medium: number | null;
  price_large: number | null;
  price_note: string | null;
};

// Free-form override (e.g. "₱999 / ₱1,799", "+₱20") always wins when set;
// otherwise builds "S ₱x · M ₱y · L ₱z" from whichever tiers are present,
// or a flat "₱x" when there are no size tiers at all.
export function formatMenuPrice(item: MenuPriceFields): string {
  if (item.price_note) return item.price_note;

  const hasTiers = item.price_medium !== null || item.price_large !== null;
  const parts: string[] = [];
  if (item.price !== null) parts.push(hasTiers ? `S ₱${item.price}` : `₱${item.price}`);
  if (item.price_medium !== null) parts.push(`M ₱${item.price_medium}`);
  if (item.price_large !== null) parts.push(`L ₱${item.price_large}`);
  return parts.join(" · ");
}
