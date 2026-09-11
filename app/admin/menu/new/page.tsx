"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MenuImageInput from "@/components/MenuImageInput";
import { useAdminAccess } from "@/lib/useAdminAccess";
import { BRANCHES, emptyForm, priceFieldsFromForm, hasAnyPrice, type Branch, type FormState } from "../shared";

export default function NewMenuItemPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const access = useAdminAccess();
  const initialBranch = (searchParams.get("branch") as Branch | null) ?? "Palindan";

  const [form, setForm] = useState<FormState>({ ...emptyForm, branch: initialBranch });

  useEffect(() => {
    if (access.isBranchLocked && access.branch) setForm((f) => ({ ...f, branch: access.branch as Branch }));
  }, [access.isBranchLocked, access.branch]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceFields = priceFieldsFromForm(form);
    if (!form.name.trim() || !form.category.trim() || !hasAnyPrice(priceFields)) {
      setError("Name, category, and at least one price field are required.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("menu_items").insert({
      branch: form.branch,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim(),
      image_url: form.image_url.trim() || null,
      ...priceFields,
    });
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/admin/menu?branch=${form.branch}`);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/menu")}
          className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:border-[#2D5A27] hover:text-[#2D5A27]"
        >
          ← Back
        </button>
        <h2 className="font-serif text-2xl text-[#2D5A27]">Add Menu Item</h2>
      </div>
      <p className="mt-1 text-sm text-stone-600">
        Use price for a flat price (or the &quot;S&quot; tier), M/L for size tiers, and the note
        field to override the displayed price entirely (e.g. &quot;+₱20&quot;).
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid max-w-2xl gap-3 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-2">
        {access.isBranchLocked ? (
          <span className="input flex items-center sm:col-span-2">{form.branch} Branch</span>
        ) : (
          <select
            value={form.branch}
            onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value as Branch }))}
            className="input sm:col-span-2"
          >
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b} Branch
              </option>
            ))}
          </select>
        )}
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Item name"
          className="input sm:col-span-2"
        />
        <input
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          placeholder="Category"
          className="input sm:col-span-2"
        />
        <input
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          placeholder="Price / S tier (e.g. 179)"
          inputMode="decimal"
          className="input"
        />
        <input
          value={form.price_medium}
          onChange={(e) => setForm((f) => ({ ...f, price_medium: e.target.value }))}
          placeholder="M tier (optional)"
          inputMode="decimal"
          className="input"
        />
        <input
          value={form.price_large}
          onChange={(e) => setForm((f) => ({ ...f, price_large: e.target.value }))}
          placeholder="L tier (optional)"
          inputMode="decimal"
          className="input"
        />
        <input
          value={form.price_note}
          onChange={(e) => setForm((f) => ({ ...f, price_note: e.target.value }))}
          placeholder="Price override (optional, e.g. +₱20)"
          className="input"
        />
        <MenuImageInput
          value={form.image_url}
          onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
          branch={form.branch}
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Description (optional)"
          rows={3}
          className="input sm:col-span-2"
        />

        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#2D5A27] px-6 py-2.5 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add Menu Item"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/menu")}
            className="rounded-full border border-stone-300 px-6 py-2.5 text-sm text-stone-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
