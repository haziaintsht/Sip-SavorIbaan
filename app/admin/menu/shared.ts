export type Branch = "Palindan" | "Uptown";
export const BRANCHES: Branch[] = ["Palindan", "Uptown"];

export type FormState = {
  branch: Branch;
  name: string;
  description: string;
  category: string;
  price: string;
  price_medium: string;
  price_large: string;
  price_note: string;
  image_url: string;
};

export const emptyForm: FormState = {
  branch: "Palindan",
  name: "",
  description: "",
  category: "",
  price: "",
  price_medium: "",
  price_large: "",
  price_note: "",
  image_url: "",
};

export function toNullableFloat(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return Number.isNaN(n) ? null : n;
}

export function priceFieldsFromForm(f: FormState) {
  return {
    price: toNullableFloat(f.price),
    price_medium: toNullableFloat(f.price_medium),
    price_large: toNullableFloat(f.price_large),
    price_note: f.price_note.trim() || null,
  };
}

export function hasAnyPrice(priceFields: ReturnType<typeof priceFieldsFromForm>): boolean {
  return (
    priceFields.price !== null ||
    priceFields.price_medium !== null ||
    priceFields.price_large !== null ||
    priceFields.price_note !== null
  );
}
