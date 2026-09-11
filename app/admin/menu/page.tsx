"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatMenuPrice } from "@/lib/menuPrice";
import MenuImageInput from "@/components/MenuImageInput";
import { useAdminAccess } from "@/lib/useAdminAccess";
import { BRANCHES, priceFieldsFromForm, hasAnyPrice, type Branch, type FormState } from "./shared";

type MenuItem = {
  id: string;
  branch: Branch;
  name: string;
  description: string | null;
  price: number | null;
  price_medium: number | null;
  price_large: number | null;
  price_note: string | null;
  category: string;
  is_hidden: boolean;
  is_available: boolean;
  image_url: string | null;
};

export default function AdminMenuPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const access = useAdminAccess();
  const initialBranch = (searchParams.get("branch") as Branch | null) ?? "Palindan";

  const [branchFilter, setBranchFilter] = useState<Branch>(initialBranch);
  const canEditThisBranch = access.role === "super_admin" || (access.isBranchLocked && access.branch === branchFilter);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FormState | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "unavailable" | "secret">("all");
  const [sortBy, setSortBy] = useState<"default" | "name" | "category" | "price_asc" | "price_desc">("default");

  async function loadItems(branch: Branch) {
    setLoading(true);
    const { data, error } = await supabase
      .from("menu_items")
      .select(
        "id, branch, name, description, price, price_medium, price_large, price_note, category, is_hidden, is_available, image_url"
      )
      .eq("branch", branch)
      .order("sort_order", { ascending: true });
    if (error) setError(error.message);
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadItems(branchFilter);
    setSearch("");
    setCategoryFilter("All");
    setStatusFilter("all");
    setSortBy("default");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter]);

  // Default a locked cashier to their own branch, but let them still
  // switch over to view (not edit) the other branch's menu.
  useEffect(() => {
    if (access.isBranchLocked && access.branch && !searchParams.get("branch")) {
      setBranchFilter(access.branch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.isBranchLocked, access.branch]);

  function selectBranch(b: Branch) {
    setBranchFilter(b);
    router.replace(`/admin/menu?branch=${b}`);
  }

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items]
  );

  function sortablePrice(item: MenuItem) {
    return item.price ?? item.price_medium ?? item.price_large ?? Number.POSITIVE_INFINITY;
  }

  const visibleItems = useMemo(() => {
    let result = items;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "All") {
      result = result.filter((i) => i.category === categoryFilter);
    }
    if (statusFilter === "available") result = result.filter((i) => i.is_available && !i.is_hidden);
    if (statusFilter === "unavailable") result = result.filter((i) => !i.is_available);
    if (statusFilter === "secret") result = result.filter((i) => i.is_hidden);

    result = [...result];
    if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "category") result.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    else if (sortBy === "price_asc") result.sort((a, b) => sortablePrice(a) - sortablePrice(b));
    else if (sortBy === "price_desc") result.sort((a, b) => sortablePrice(b) - sortablePrice(a));

    return result;
  }, [items, search, categoryFilter, statusFilter, sortBy]);

  async function toggleField(item: MenuItem, field: "is_hidden" | "is_available") {
    const { error } = await supabase
      .from("menu_items")
      .update({ [field]: !item[field] })
      .eq("id", item.id);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: !i[field] } : i)));
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setEditDraft({
      branch: item.branch,
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      price: item.price === null ? "" : String(item.price),
      price_medium: item.price_medium === null ? "" : String(item.price_medium),
      price_large: item.price_large === null ? "" : String(item.price_large),
      price_note: item.price_note ?? "",
      image_url: item.image_url ?? "",
    });
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    const priceFields = priceFieldsFromForm(editDraft);

    if (!editDraft.name.trim() || !editDraft.category.trim() || !hasAnyPrice(priceFields)) {
      setError("Name, category, and at least one price field are required.");
      return;
    }
    const { error } = await supabase
      .from("menu_items")
      .update({
        branch: editDraft.branch,
        name: editDraft.name.trim(),
        description: editDraft.description.trim() || null,
        category: editDraft.category.trim(),
        image_url: editDraft.image_url.trim() || null,
        ...priceFields,
      })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingId(null);
    setEditDraft(null);
    loadItems(branchFilter);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-[#2D5A27]">Menu Management</h2>
          <p className="mt-1 text-sm text-stone-600">
            Manages the <code>menu_items</code> table that powers the public <code>/menu</code> page.
          </p>
        </div>
        {canEditThisBranch && (
          <Link
            href={`/admin/menu/new?branch=${branchFilter}`}
            className="rounded-full bg-[#2D5A27] px-5 py-2.5 text-sm font-medium text-[#F9F6F0]"
          >
            + Add Menu Item
          </Link>
        )}
      </div>

      {!canEditThisBranch && (
        <p className="mt-3 text-sm text-stone-500">
          Viewing {branchFilter}&apos;s menu — you can only edit items for your own branch.
        </p>
      )}

      <div className="mt-6 flex gap-2">
        {BRANCHES.map((b) => (
          <button
            key={b}
            onClick={() => selectBranch(b)}
            className={`chip ${branchFilter === b ? "chip-active" : ""}`}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="input flex-1 sm:max-w-xs"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input sm:w-56">
          <option value="All">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="input sm:w-44"
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="secret">Secret menu</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="input sm:w-48"
        >
          <option value="default">Sort: Menu order</option>
          <option value="name">Sort: Name (A–Z)</option>
          <option value="category">Sort: Category</option>
          <option value="price_asc">Sort: Price (low–high)</option>
          <option value="price_desc">Sort: Price (high–low)</option>
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {loading && <p className="text-sm text-stone-500">Loading menu…</p>}

        {!loading &&
          visibleItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-stone-200 bg-white shadow-sm p-5">
              {editingId === item.id && editDraft ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {access.isBranchLocked ? (
                    <span className="input flex items-center">{editDraft.branch}</span>
                  ) : (
                    <select
                      value={editDraft.branch}
                      onChange={(e) => setEditDraft((d) => (d ? { ...d, branch: e.target.value as Branch } : d))}
                      className="input"
                    >
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    value={editDraft.name}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                    className="input"
                  />
                  <input
                    value={editDraft.category}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, category: e.target.value } : d))}
                    className="input"
                  />
                  <input
                    value={editDraft.price}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, price: e.target.value } : d))}
                    placeholder="Price / S tier"
                    inputMode="decimal"
                    className="input"
                  />
                  <input
                    value={editDraft.price_medium}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, price_medium: e.target.value } : d))}
                    placeholder="M tier"
                    inputMode="decimal"
                    className="input"
                  />
                  <input
                    value={editDraft.price_large}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, price_large: e.target.value } : d))}
                    placeholder="L tier"
                    inputMode="decimal"
                    className="input"
                  />
                  <input
                    value={editDraft.price_note}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, price_note: e.target.value } : d))}
                    placeholder="Price override"
                    className="input"
                  />
                  <MenuImageInput
                    value={editDraft.image_url}
                    onChange={(url) => setEditDraft((d) => (d ? { ...d, image_url: url } : d))}
                    branch={editDraft.branch}
                  />
                  <input
                    value={editDraft.description}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                    placeholder="Description"
                    className="input sm:col-span-3"
                  />
                  <div className="flex gap-2 sm:col-span-3">
                    <button
                      onClick={() => saveEdit(item.id)}
                      className="rounded-full bg-[#2D5A27] px-4 py-2 text-sm text-[#F9F6F0]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft(null);
                      }}
                      className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-stone-900">
                      {item.name}{" "}
                      <span className="text-sm font-normal text-stone-500">· {item.category}</span>
                    </p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-stone-600">{item.description}</p>
                    )}
                    <p className="mt-1 text-sm text-[#2D5A27]">{formatMenuPrice(item)}</p>
                    <div className="mt-1 flex gap-2 text-xs">
                      {item.is_hidden && (
                        <span className="rounded-full bg-[#2D5A27]/10 px-2 py-0.5 text-[#2D5A27]">
                          Secret menu
                        </span>
                      )}
                      {!item.is_available && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-600">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                  {canEditThisBranch && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => startEdit(item)} className="chip">
                        Edit
                      </button>
                      <button onClick={() => toggleField(item, "is_hidden")} className="chip">
                        {item.is_hidden ? "Unmark secret" : "Mark secret"}
                      </button>
                      <button onClick={() => toggleField(item, "is_available")} className="chip">
                        {item.is_available ? "Mark unavailable" : "Mark available"}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="chip border-red-300 text-red-600 hover:border-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

        {!loading && items.length === 0 && (
          <p className="text-sm text-stone-500">No menu items for {branchFilter} yet.</p>
        )}
        {!loading && items.length > 0 && visibleItems.length === 0 && (
          <p className="text-sm text-stone-500">No items match these filters.</p>
        )}
      </div>
    </div>
  );
}
