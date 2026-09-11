"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";

type Branch = "Palindan" | "Uptown";
const BRANCHES: Branch[] = ["Palindan", "Uptown"];

type MenuItemRow = {
  id: string;
  name: string;
  category: string;
  price: number | null;
  price_medium: number | null;
  price_large: number | null;
  price_note: string | null;
};

type CartLine = {
  key: string; // menuItemId + tier label, so S/M/L of the same item are separate lines
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

type Customer = {
  id: string;
  full_name: string;
  phone_number: string | null;
  card_id: string;
  stamp_count: number;
};

type RecentOrder = {
  id: string;
  created_at: string;
  subtotal: number;
  total: number;
  discount: number;
  tax: number;
  payment_method: string;
  status: "completed" | "voided";
  customer_name: string | null;
  item_summary: string;
  items: CartLine[];
};

type ReceiptData = {
  id: string;
  createdAt: string;
  branch: Branch;
  items: CartLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName: string | null;
  cashReceived: number | null;
  changeDue: number | null;
  discountReason: string | null;
  discountNote: string | null;
};

type HeldOrder = {
  id: string;
  savedAt: string;
  cart: CartLine[];
  discountPct: number;
  taxPct: number;
  discountReason: string;
  discountNote: string;
  selectedCustomer: Customer | null;
  paymentMethod: "Cash" | "GCash";
};

const DISCOUNT_PRESETS = ["Senior/PWD", "Staff meal", "Promo", "Damage/Comp"] as const;

function priceOptions(item: MenuItemRow): { label: string; amount: number }[] | null {
  const hasTiers = item.price_medium !== null || item.price_large !== null;
  if (item.price === null && !hasTiers) return null; // price_note-only item
  const opts: { label: string; amount: number }[] = [];
  if (item.price !== null) opts.push({ label: hasTiers ? "S" : "Add", amount: item.price });
  if (item.price_medium !== null) opts.push({ label: "M", amount: item.price_medium });
  if (item.price_large !== null) opts.push({ label: "L", amount: item.price_large });
  return opts;
}

// Pulls quick-pick amounts out of free-form notes like "₱999 / ₱1,799" or "+₱20"
// so staff usually don't have to type a price by hand.
function parseNoteAmounts(note: string): number[] {
  const matches = note.match(/₱[\d,]+(?:\.\d+)?/g) ?? [];
  return matches.map((m) => parseFloat(m.replace(/[₱,]/g, ""))).filter((n) => !Number.isNaN(n));
}

export default function AdminPOSPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBranch = (searchParams.get("branch") as Branch | null) ?? "Palindan";
  const access = useAdminAccess();

  const [branch, setBranch] = useState<Branch>(initialBranch);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [itemSearch, setItemSearch] = useState("");
  const [customPriceFor, setCustomPriceFor] = useState<string | null>(null);
  const [customPriceValue, setCustomPriceValue] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [discountNote, setDiscountNote] = useState("");

  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  const [showCloseShift, setShowCloseShift] = useState(false);
  const [closingShift, setClosingShift] = useState(false);
  const [closeoutDraft, setCloseoutDraft] = useState<{
    periodStart: string;
    cashTotal: number;
    gcashTotal: number;
    orderCount: number;
  } | null>(null);
  const [countedCash, setCountedCash] = useState("");
  const [closeoutHistory, setCloseoutHistory] = useState<
    { id: string; created_at: string; cash_total: number; gcash_total: number; counted_cash: number; variance: number }[]
  >([]);

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "GCash">("Cash");
  const [cashReceived, setCashReceived] = useState("");
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingMenu(true);
    supabase
      .from("menu_items")
      .select("id, name, category, price, price_medium, price_large, price_note")
      .eq("branch", branch)
      .eq("is_available", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setMenuItems(data ?? []);
        setLoadingMenu(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, branch]);

  async function loadRecentOrders(b: Branch) {
    setLoadingOrders(true);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, created_at, subtotal, total, discount, tax, payment_method, status, customer:profiles!orders_customer_id_fkey(full_name), order_items(name, quantity, unit_price)"
      )
      .eq("branch", b)
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) console.error("Failed to load recent orders:", error);

    setRecentOrders(
      (data ?? []).map((o: any) => ({
        id: o.id,
        created_at: o.created_at,
        subtotal: o.subtotal,
        total: o.total,
        discount: o.discount,
        tax: o.tax,
        payment_method: o.payment_method,
        status: o.status,
        customer_name: o.customer?.full_name ?? null,
        item_summary: (o.order_items ?? []).map((i: any) => `${i.quantity}x ${i.name}`).join(", "),
        items: (o.order_items ?? []).map((i: any, idx: number) => ({
          key: `${i.name}-${idx}`,
          menuItemId: "",
          name: i.name,
          unitPrice: Number(i.unit_price),
          quantity: i.quantity,
        })),
      }))
    );
    setLoadingOrders(false);
  }

  async function loadCloseoutHistory(b: Branch) {
    const { data } = await supabase
      .from("shift_closeouts")
      .select("id, created_at, cash_total, gcash_total, counted_cash, variance")
      .eq("branch", b)
      .order("created_at", { ascending: false })
      .limit(5);
    setCloseoutHistory(data ?? []);
  }

  useEffect(() => {
    loadRecentOrders(branch);
    loadCloseoutHistory(branch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  // Held orders are a counter-side convenience (not yet real DB orders),
  // so they just live in localStorage per branch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`pos-held-${branch}`);
      setHeldOrders(raw ? JSON.parse(raw) : []);
    } catch {
      setHeldOrders([]);
    }
  }, [branch]);

  function persistHeldOrders(next: HeldOrder[]) {
    setHeldOrders(next);
    try {
      localStorage.setItem(`pos-held-${branch}`, JSON.stringify(next));
    } catch {
      // best-effort only
    }
  }

  // Branch-locked cashiers can't shop for the other branch — snap to
  // their assigned branch the moment we know it, ignoring the URL param.
  useEffect(() => {
    if (access.isBranchLocked && access.branch && access.branch !== branch) {
      setBranch(access.branch);
      router.replace(`/admin/pos?branch=${access.branch}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.isBranchLocked, access.branch]);

  useEffect(() => {
    if (selectedCustomer) return;
    if (!customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(() => searchCustomer(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerQuery]);

  function selectBranch(b: Branch) {
    setBranch(b);
    setActiveCategory("All");
    setCart([]);
    router.replace(`/admin/pos?branch=${b}`);
  }

  const categories = useMemo(() => Array.from(new Set(menuItems.map((i) => i.category))), [menuItems]);
  const visibleItems = useMemo(() => {
    let result = activeCategory === "All" ? menuItems : menuItems.filter((i) => i.category === activeCategory);
    const q = itemSearch.trim().toLowerCase();
    if (q) result = result.filter((i) => i.name.toLowerCase().includes(q));
    return result;
  }, [menuItems, activeCategory, itemSearch]);

  function addToCart(item: MenuItemRow, label: string, amount: number) {
    const key = `${item.id}:${label}:${amount}`;
    const name = label === "Add" ? item.name : `${item.name} (${label})`;
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { key, menuItemId: item.id, name, unitPrice: amount, quantity: 1 }];
    });
  }

  function addCustomPrice(item: MenuItemRow) {
    const amount = parseFloat(customPriceValue);
    if (Number.isNaN(amount) || amount <= 0) return;
    addToCart(item, "Add", amount);
    setCustomPriceFor(null);
    setCustomPriceValue("");
  }

  function changeQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const discountAmount = useMemo(() => (subtotal * discountPct) / 100, [subtotal, discountPct]);
  const taxAmount = useMemo(() => ((subtotal - discountAmount) * taxPct) / 100, [subtotal, discountAmount, taxPct]);
  const total = subtotal - discountAmount + taxAmount;
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const changeDue = cashReceivedNum - total;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function searchCustomer(e?: React.FormEvent) {
    e?.preventDefault();
    const q = customerQuery.trim();
    if (!q) {
      setCustomerResults([]);
      return;
    }
    setSearchingCustomer(true);
    setSelectedCustomer(null);
    const filters = [`full_name.ilike.%${q}%`, `phone_number.ilike.%${q}%`];
    if (UUID_RE.test(q)) filters.push(`id.eq.${q}`);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone_number, loyalty_cards(id, stamp_count)")
      .or(filters.join(","))
      .eq("role", "customer")
      .limit(5);
    if (error) console.error("Customer search failed:", error);
    setSearchingCustomer(false);
    setCustomerResults(
      (data ?? [])
        .filter((row: any) => row.loyalty_cards)
        .map((row: any) => ({
          id: row.id,
          full_name: row.full_name,
          phone_number: row.phone_number,
          card_id: row.loyalty_cards.id,
          stamp_count: row.loyalty_cards.stamp_count,
        }))
    );
  }

  const discountNeedsNote = discountAmount > 0 && discountReason !== "Senior/PWD" && !discountNote.trim();

  async function completeOrder() {
    if (cart.length === 0) return;
    if (discountNeedsNote) {
      setError("This discount needs a short note explaining why (shown next to the discount field).");
      return;
    }
    setCompleting(true);
    setError(null);
    setSuccessMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        branch,
        customer_id: selectedCustomer?.id ?? null,
        admin_id: user?.id ?? null,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        payment_method: paymentMethod,
        discount_reason: discountAmount > 0 ? discountReason || null : null,
        discount_note: discountAmount > 0 ? discountNote.trim() || null : null,
      })
      .select("id, created_at")
      .single();

    if (orderError || !order) {
      setCompleting(false);
      setError(orderError?.message ?? "Could not save the order.");
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      cart.map((l) => ({
        order_id: order.id,
        menu_item_id: l.menuItemId,
        name: l.name,
        unit_price: l.unitPrice,
        quantity: l.quantity,
        line_total: l.unitPrice * l.quantity,
      }))
    );

    if (itemsError) {
      setCompleting(false);
      setError(itemsError.message);
      return;
    }

    if (selectedCustomer) {
      const { error: stampError } = await supabase.rpc("stamp_action", {
        p_card_id: selectedCustomer.card_id,
        p_action: "ADD_STAMP",
        p_branch_location: `${branch} Branch`,
      });
      if (stampError) {
        setError(`Order saved, but the loyalty stamp failed: ${stampError.message}`);
      }
    }

    setReceipt({
      id: order.id,
      createdAt: order.created_at,
      branch,
      items: cart,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      paymentMethod,
      customerName: selectedCustomer?.full_name ?? null,
      cashReceived: paymentMethod === "Cash" && cashReceivedNum > 0 ? cashReceivedNum : null,
      changeDue: paymentMethod === "Cash" && cashReceivedNum > 0 ? changeDue : null,
      discountReason: discountAmount > 0 ? discountReason || null : null,
      discountNote: discountAmount > 0 ? discountNote.trim() || null : null,
    });

    setCompleting(false);
    setSuccessMsg(
      `Order complete — ₱${total.toFixed(2)}${selectedCustomer ? " · stamp added" : ""}`
    );
    setCart([]);
    setDiscountPct(0);
    setTaxPct(0);
    setDiscountReason("");
    setDiscountNote("");
    setSelectedCustomer(null);
    setCustomerResults([]);
    setCustomerQuery("");
    setCashReceived("");
    loadRecentOrders(branch);
  }

  async function voidOrder(id: string) {
    if (!confirm("Void this order? It will be excluded from sales totals.")) return;
    const { error } = await supabase.from("orders").update({ status: "voided" }).eq("id", id);
    if (error) {
      alert(`Couldn't void order: ${error.message}`);
      return;
    }
    loadRecentOrders(branch);
  }

  function reprintOrder(o: RecentOrder) {
    setReceipt({
      id: o.id,
      createdAt: o.created_at,
      branch,
      items: o.items,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      tax: Number(o.tax),
      total: Number(o.total),
      paymentMethod: o.payment_method,
      customerName: o.customer_name,
      cashReceived: null,
      changeDue: null,
      discountReason: null,
      discountNote: null,
    });
    setTimeout(() => window.print(), 50);
  }

  async function toggle86(item: MenuItemRow) {
    if (!confirm(`Mark "${item.name}" as unavailable? It'll disappear from this list until re-enabled in Menu Management.`))
      return;
    const { error } = await supabase.from("menu_items").update({ is_available: false }).eq("id", item.id);
    if (error) {
      alert(`Couldn't update item: ${error.message}`);
      return;
    }
    setMenuItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  function holdCurrentOrder() {
    if (cart.length === 0) return;
    const held: HeldOrder = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      cart,
      discountPct,
      taxPct,
      discountReason,
      discountNote,
      selectedCustomer,
      paymentMethod,
    };
    persistHeldOrders([held, ...heldOrders]);
    setCart([]);
    setDiscountPct(0);
    setTaxPct(0);
    setDiscountReason("");
    setDiscountNote("");
    setSelectedCustomer(null);
    setCustomerResults([]);
    setCustomerQuery("");
    setCashReceived("");
  }

  function resumeHeldOrder(id: string) {
    const held = heldOrders.find((h) => h.id === id);
    if (!held) return;
    if (cart.length > 0 && !confirm("This replaces your current unsaved order. Continue?")) return;
    setCart(held.cart);
    setDiscountPct(held.discountPct);
    setTaxPct(held.taxPct);
    setDiscountReason(held.discountReason);
    setDiscountNote(held.discountNote);
    setSelectedCustomer(held.selectedCustomer);
    setPaymentMethod(held.paymentMethod);
    persistHeldOrders(heldOrders.filter((h) => h.id !== id));
  }

  function discardHeldOrder(id: string) {
    if (!confirm("Discard this held order? This can't be undone.")) return;
    persistHeldOrders(heldOrders.filter((h) => h.id !== id));
  }

  async function openCloseShift() {
    setClosingShift(true);
    const { data: last } = await supabase
      .from("shift_closeouts")
      .select("period_end")
      .eq("branch", branch)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const periodStart = last?.period_end ?? startOfDay.toISOString();

    const { data: ordersSince } = await supabase
      .from("orders")
      .select("payment_method, total")
      .eq("branch", branch)
      .eq("status", "completed")
      .gte("created_at", periodStart);

    const rows = ordersSince ?? [];
    const cashTotal = rows.filter((o) => o.payment_method === "Cash").reduce((s, o) => s + Number(o.total), 0);
    const gcashTotal = rows.filter((o) => o.payment_method === "GCash").reduce((s, o) => s + Number(o.total), 0);

    setCloseoutDraft({ periodStart, cashTotal, gcashTotal, orderCount: rows.length });
    setCountedCash("");
    setShowCloseShift(true);
    setClosingShift(false);
  }

  async function submitCloseShift() {
    if (!closeoutDraft) return;
    const counted = parseFloat(countedCash);
    if (Number.isNaN(counted)) return;
    setClosingShift(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("shift_closeouts").insert({
      branch,
      admin_id: user?.id ?? null,
      period_start: closeoutDraft.periodStart,
      period_end: new Date().toISOString(),
      order_count: closeoutDraft.orderCount,
      cash_total: closeoutDraft.cashTotal,
      gcash_total: closeoutDraft.gcashTotal,
      counted_cash: counted,
      variance: counted - closeoutDraft.cashTotal,
    });

    setClosingShift(false);
    if (error) {
      alert(`Couldn't save shift close-out: ${error.message}`);
      return;
    }
    setShowCloseShift(false);
    setCloseoutDraft(null);
    setCountedCash("");
    loadCloseoutHistory(branch);
  }

  if (!access.loading && access.role === "super_admin") {
    return (
      <div>
        <h2 className="font-serif text-2xl text-[#2D5A27]">Point of Sale</h2>
        <p className="mt-3 max-w-md text-sm text-stone-600">
          The POS is for branch cashiers only. As the owner account, you monitor sales and analytics for both
          branches from <span className="font-medium text-[#2D5A27]">Overview</span> and{" "}
          <span className="font-medium text-[#2D5A27]">Orders</span> — a cashier assigned to a branch processes
          orders there so each branch's sales stay private to that branch.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h2 className="font-serif text-2xl text-[#2D5A27]">Point of Sale</h2>
        {access.isBranchLocked ? (
          <span className="chip chip-active">{branch} Branch</span>
        ) : (
          <div className="flex gap-2">
            {BRANCHES.map((b) => (
              <button key={b} onClick={() => selectBranch(b)} className={`chip ${branch === b ? "chip-active" : ""}`}>
                {b}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_360px] print:hidden">
        {/* Menu picker */}
        <div>
          <input
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search items to add…"
            className="input w-full sm:max-w-xs"
          />

          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory("All")}
              className={`chip shrink-0 ${activeCategory === "All" ? "chip-active" : ""}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`chip shrink-0 whitespace-nowrap ${activeCategory === c ? "chip-active" : ""}`}
              >
                {c}
              </button>
            ))}
          </div>

          {loadingMenu ? (
            <p className="mt-6 text-sm text-stone-500">Loading menu…</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {visibleItems.map((item) => {
                const opts = priceOptions(item);
                const noteAmounts = item.price_note ? parseNoteAmounts(item.price_note) : [];
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white shadow-sm p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-stone-900">{item.name}</p>
                      <button
                        onClick={() => toggle86(item)}
                        title="Mark out of stock"
                        className="shrink-0 rounded-full border border-stone-200 px-2 py-0.5 text-[11px] text-stone-400 hover:border-red-300 hover:text-red-500"
                      >
                        86
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {opts ? (
                        opts.map((o) => (
                          <button
                            key={o.label}
                            onClick={() => addToCart(item, o.label, o.amount)}
                            className="rounded-full bg-[#2D5A27]/10 px-3 py-1.5 text-xs font-medium text-[#2D5A27] hover:bg-[#2D5A27]/20"
                          >
                            {o.label} ₱{o.amount}
                          </button>
                        ))
                      ) : customPriceFor === item.id ? (
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                          {noteAmounts.map((amt) => (
                            <button
                              key={amt}
                              onClick={() => {
                                addToCart(item, "Add", amt);
                                setCustomPriceFor(null);
                              }}
                              className="rounded-full bg-[#2D5A27]/10 px-3 py-1.5 text-xs font-medium text-[#2D5A27] hover:bg-[#2D5A27]/20"
                            >
                              ₱{amt}
                            </button>
                          ))}
                          <input
                            autoFocus
                            value={customPriceValue}
                            onChange={(e) => setCustomPriceValue(e.target.value)}
                            placeholder="Custom ₱"
                            inputMode="decimal"
                            className="input w-28 py-1.5 text-sm"
                          />
                          <button
                            onClick={() => addCustomPrice(item)}
                            className="rounded-full bg-[#2D5A27] px-3 py-1.5 text-xs font-medium text-[#F9F6F0]"
                          >
                            Add
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCustomPriceFor(item.id)}
                          className="rounded-full bg-[#2D5A27]/10 px-3 py-1.5 text-xs font-medium text-[#2D5A27] hover:bg-[#2D5A27]/20"
                        >
                          {item.price_note ?? "Set price"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {visibleItems.length === 0 && (
                <p className="text-sm text-stone-500">No items in this category.</p>
              )}
            </div>
          )}

          {/* Recent orders / void */}
          <div className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif text-lg text-[#2D5A27]">Today&apos;s Orders — {branch}</h3>
              <button
                onClick={openCloseShift}
                disabled={closingShift}
                className="shrink-0 rounded-full border border-[#2D5A27] px-3 py-1.5 text-xs font-medium text-[#2D5A27] disabled:opacity-60"
              >
                Close Shift
              </button>
            </div>
            {loadingOrders ? (
              <p className="mt-2 text-sm text-stone-500">Loading…</p>
            ) : recentOrders.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No orders yet today.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {recentOrders.map((o) => (
                  <div
                    key={o.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${
                      o.status === "voided" ? "border-stone-200 bg-stone-50 opacity-60" : "border-stone-200 bg-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-stone-900">
                        {o.item_summary || "—"}
                        {o.customer_name && <span className="text-stone-500"> · {o.customer_name}</span>}
                      </p>
                      <p className="text-xs text-stone-500">
                        {new Date(o.created_at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })} ·{" "}
                        {o.payment_method}
                        {o.status === "voided" && " · VOIDED"}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium text-[#2D5A27]">₱{Number(o.total).toFixed(2)}</span>
                    <button onClick={() => reprintOrder(o)} className="shrink-0 text-xs text-stone-500 hover:underline">
                      Reprint
                    </button>
                    {o.status === "completed" && (
                      <button onClick={() => voidOrder(o.id)} className="shrink-0 text-xs text-red-500 hover:underline">
                        Void
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {closeoutHistory.length > 0 && (
            <div className="mt-8">
              <h3 className="font-serif text-lg text-[#2D5A27]">Recent Shift Close-outs</h3>
              <div className="mt-3 flex flex-col gap-2">
                {closeoutHistory.map((c) => (
                  <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">
                        {new Date(c.created_at).toLocaleString("en-PH", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={`font-medium ${
                          c.variance === 0 ? "text-[#2D5A27]" : c.variance > 0 ? "text-amber-600" : "text-red-600"
                        }`}
                      >
                        {c.variance === 0
                          ? "Balanced"
                          : c.variance > 0
                          ? `+₱${c.variance.toFixed(2)} over`
                          : `−₱${Math.abs(c.variance).toFixed(2)} short`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      Expected cash ₱{Number(c.cash_total).toFixed(2)} · Counted ₱{Number(c.counted_cash).toFixed(2)} ·
                      GCash ₱{Number(c.gcash_total).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order / cart panel */}
        <div className="h-fit self-start rounded-2xl border border-stone-200 bg-white shadow-sm p-5 md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto">
          <h3 className="font-serif text-lg text-[#2D5A27]">Current Order</h3>

          <div className="mt-3 flex flex-col gap-2">
            {cart.length === 0 && <p className="text-sm text-stone-500">No items yet — tap the menu to add.</p>}
            {cart.map((l) => (
              <div key={l.key} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-stone-900">{l.name}</p>
                  <p className="text-xs text-stone-500">₱{l.unitPrice} each</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => changeQty(l.key, -1)} className="h-6 w-6 rounded-full border border-stone-300 text-stone-600">
                    −
                  </button>
                  <span className="w-5 text-center">{l.quantity}</span>
                  <button onClick={() => changeQty(l.key, 1)} className="h-6 w-6 rounded-full border border-stone-300 text-stone-600">
                    +
                  </button>
                </div>
                <span className="w-16 shrink-0 text-right font-medium text-[#2D5A27]">
                  ₱{(l.unitPrice * l.quantity).toFixed(2)}
                </span>
                <button onClick={() => removeLine(l.key)} className="text-stone-400 hover:text-red-500" aria-label="Remove">
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-stone-200 pt-3">
            <label className="flex items-center gap-1.5 text-xs text-stone-600">
              Discount
              <input
                type="number"
                min={0}
                max={100}
                value={discountPct || ""}
                onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="input w-16 py-1 text-xs"
              />
              %
            </label>
            <label className="flex items-center gap-1.5 text-xs text-stone-600">
              Tax
              <input
                type="number"
                min={0}
                max={100}
                value={taxPct || ""}
                onChange={(e) => setTaxPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="input w-16 py-1 text-xs"
              />
              %
            </label>
          </div>

          {discountPct > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {DISCOUNT_PRESETS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setDiscountReason(r);
                    if (r === "Senior/PWD") setDiscountPct(20);
                  }}
                  className={`chip py-1 text-xs ${discountReason === r ? "chip-active" : ""}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {discountNeedsNote && (
            <input
              value={discountNote}
              onChange={(e) => setDiscountNote(e.target.value)}
              placeholder="Why this discount? (required)"
              className="input mt-2 w-full py-1.5 text-xs"
            />
          )}

          <div className="mt-3 flex flex-col gap-1 border-t border-stone-200 pt-3 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Discount ({discountPct}%)</span>
                <span>−₱{discountAmount.toFixed(2)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Tax ({taxPct}%)</span>
                <span>+₱{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between text-base font-medium">
              <span className="text-stone-700">Total</span>
              <span className="text-[#2D5A27]">₱{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-5 border-t border-stone-200 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Customer (optional — adds a stamp)
            </p>
            {selectedCustomer ? (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-[#2D5A27]/5 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-stone-900">{selectedCustomer.full_name}</p>
                  <p className="text-xs text-stone-500">{selectedCustomer.stamp_count} / 10 stamps</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-xs text-stone-500 hover:text-red-500">
                  Remove
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={searchCustomer} className="mt-2 flex gap-2">
                  <input
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Name, phone, or QR ID"
                    className="input flex-1 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={searchingCustomer}
                    className="rounded-full bg-[#2D5A27] px-3 py-1.5 text-xs font-medium text-[#F9F6F0] disabled:opacity-60"
                  >
                    {searchingCustomer ? "…" : "Find"}
                  </button>
                </form>
                {customerResults.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerResults([]);
                        }}
                        className="rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[#2D5A27]/5"
                      >
                        {c.full_name} <span className="text-xs text-stone-500">({c.stamp_count}/10)</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Payment</p>
            <div className="mt-2 flex gap-2">
              {(["Cash", "GCash"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setPaymentMethod(m);
                    if (m !== "Cash") setCashReceived("");
                  }}
                  className={`chip ${paymentMethod === m ? "chip-active" : ""}`}
                >
                  {m}
                </button>
              ))}
            </div>

            {paymentMethod === "Cash" && (
              <div className="mt-3 rounded-xl bg-stone-50 p-3">
                <div className="flex items-center gap-2">
                  <label className="shrink-0 text-xs text-stone-600">Cash received</label>
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="₱0.00"
                    className="input flex-1 py-1.5 text-sm"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[100, 200, 500, 1000].map((bill) => (
                    <button
                      key={bill}
                      onClick={() => setCashReceived(String(bill))}
                      className="chip py-1 text-xs"
                    >
                      ₱{bill}
                    </button>
                  ))}
                  <button
                    onClick={() => setCashReceived(total.toFixed(2))}
                    className="chip py-1 text-xs"
                  >
                    Exact
                  </button>
                </div>
                {cashReceived !== "" && (
                  <p
                    className={`mt-2 text-sm font-medium ${
                      changeDue < 0 ? "text-red-600" : "text-[#2D5A27]"
                    }`}
                  >
                    {changeDue < 0
                      ? `Short by ₱${Math.abs(changeDue).toFixed(2)}`
                      : `Change: ₱${changeDue.toFixed(2)}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {successMsg && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-sm text-[#2D5A27]">{successMsg}</p>
              {receipt && (
                <button onClick={() => window.print()} className="shrink-0 text-xs font-medium text-[#2D5A27] underline">
                  Print Receipt
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={completeOrder}
              disabled={cart.length === 0 || completing || discountNeedsNote}
              className="flex-1 rounded-full bg-[#2D5A27] py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-50"
            >
              {completing ? "Saving…" : `Complete Order — ₱${total.toFixed(2)}`}
            </button>
            <button
              onClick={holdCurrentOrder}
              disabled={cart.length === 0}
              title="Park this order and start a new one"
              className="shrink-0 rounded-full border border-stone-300 px-4 py-3 text-sm text-stone-600 disabled:opacity-40"
            >
              Hold
            </button>
          </div>

          {heldOrders.length > 0 && (
            <div className="mt-5 border-t border-stone-200 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Held Orders ({heldOrders.length})
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {heldOrders.map((h) => {
                  const heldTotal = h.cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
                  return (
                    <div key={h.id} className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-stone-700">
                          {h.cart.length} item{h.cart.length === 1 ? "" : "s"} · ₱{heldTotal.toFixed(2)}
                          {h.selectedCustomer && ` · ${h.selectedCustomer.full_name}`}
                        </p>
                        <p className="text-xs text-stone-400">
                          {new Date(h.savedAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                      <button onClick={() => resumeHeldOrder(h.id)} className="shrink-0 text-xs font-medium text-[#2D5A27] hover:underline">
                        Resume
                      </button>
                      <button onClick={() => discardHeldOrder(h.id)} className="shrink-0 text-xs text-red-500 hover:underline">
                        Discard
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close Shift panel */}
      {showCloseShift && closeoutDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="font-serif text-lg text-[#2D5A27]">Close Shift — {branch}</h3>
            <p className="mt-1 text-xs text-stone-500">
              Since {new Date(closeoutDraft.periodStart).toLocaleString("en-PH")}
            </p>

            <div className="mt-4 flex flex-col gap-1 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Orders completed</span>
                <span>{closeoutDraft.orderCount}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Expected cash</span>
                <span className="font-medium text-stone-900">₱{closeoutDraft.cashTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>GCash (not counted)</span>
                <span>₱{closeoutDraft.gcashTotal.toFixed(2)}</span>
              </div>
            </div>

            <label className="mt-4 flex flex-col gap-1.5 text-sm text-stone-700">
              Cash counted in drawer
              <input
                type="number"
                min={0}
                inputMode="decimal"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="₱0.00"
                className="input"
                autoFocus
              />
            </label>

            {countedCash !== "" && !Number.isNaN(parseFloat(countedCash)) && (
              <p
                className={`mt-2 text-sm font-medium ${
                  parseFloat(countedCash) - closeoutDraft.cashTotal === 0
                    ? "text-[#2D5A27]"
                    : parseFloat(countedCash) - closeoutDraft.cashTotal > 0
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {(() => {
                  const v = parseFloat(countedCash) - closeoutDraft.cashTotal;
                  return v === 0 ? "Balanced" : v > 0 ? `₱${v.toFixed(2)} over` : `₱${Math.abs(v).toFixed(2)} short`;
                })()}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={submitCloseShift}
                disabled={closingShift || countedCash === "" || Number.isNaN(parseFloat(countedCash))}
                className="flex-1 rounded-full bg-[#2D5A27] py-2.5 text-sm font-medium text-[#F9F6F0] disabled:opacity-50"
              >
                {closingShift ? "Saving…" : "Confirm Close-out"}
              </button>
              <button
                onClick={() => {
                  setShowCloseShift(false);
                  setCloseoutDraft(null);
                }}
                className="rounded-full border border-stone-300 px-4 py-2.5 text-sm text-stone-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print-only receipt — hidden on screen, shown only when printing */}
      {receipt && (
        <div className="hidden print:block">
          <div className="mx-auto max-w-xs font-mono text-xs text-black">
            <p className="text-center text-sm font-bold">SIP &amp; SAVOR SPOT</p>
            <p className="text-center">{receipt.branch} Branch</p>
            <p className="text-center">{new Date(receipt.createdAt).toLocaleString("en-PH")}</p>
            <p className="mt-1 text-center">Order #{receipt.id.slice(0, 8)}</p>
            <div className="my-2 border-t border-dashed border-black" />
            {receipt.items.map((l) => (
              <div key={l.key} className="flex justify-between">
                <span>
                  {l.quantity}x {l.name}
                </span>
                <span>₱{(l.unitPrice * l.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="my-2 border-t border-dashed border-black" />
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₱{receipt.subtotal.toFixed(2)}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount{receipt.discountReason ? ` (${receipt.discountReason})` : ""}</span>
                <span>−₱{receipt.discount.toFixed(2)}</span>
              </div>
            )}
            {receipt.discountNote && <p className="text-[10px]">Note: {receipt.discountNote}</p>}
            {receipt.tax > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>+₱{receipt.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>TOTAL</span>
              <span>₱{receipt.total.toFixed(2)}</span>
            </div>
            <div className="my-2 border-t border-dashed border-black" />
            <p>Payment: {receipt.paymentMethod}</p>
            {receipt.cashReceived !== null && (
              <div className="flex justify-between">
                <span>Cash received</span>
                <span>₱{receipt.cashReceived.toFixed(2)}</span>
              </div>
            )}
            {receipt.changeDue !== null && (
              <div className="flex justify-between">
                <span>Change</span>
                <span>₱{receipt.changeDue.toFixed(2)}</span>
              </div>
            )}
            {receipt.customerName && <p>Customer: {receipt.customerName} (+1 stamp)</p>}
            <p className="mt-3 text-center">Salamat po! Tara, Kape ulit! ☕</p>
          </div>
        </div>
      )}
    </div>
  );
}
