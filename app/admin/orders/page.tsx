"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";

type Branch = "Palindan" | "Uptown";
type DateRange = "today" | "7d" | "30d" | "all";
type StatusFilter = "all" | "completed" | "voided";

type OrderRow = {
  id: string;
  created_at: string;
  branch: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: string;
  status: "completed" | "voided";
  customer_name: string | null;
  staff_name: string | null;
  item_summary: string;
};

function rangeStart(range: DateRange): string | null {
  if (range === "all") return null;
  const d = new Date();
  if (range === "today") {
    d.setHours(0, 0, 0, 0);
  } else if (range === "7d") {
    d.setDate(d.getDate() - 7);
  } else {
    d.setDate(d.getDate() - 30);
  }
  return d.toISOString();
}

export default function AdminOrdersPage() {
  const supabase = createClient();
  const access = useAdminAccess();

  const [branchFilter, setBranchFilter] = useState<"All" | Branch>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [search, setSearch] = useState("");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);
  const [hasMore, setHasMore] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("orders")
      .select(
        "id, created_at, branch, subtotal, discount, tax, total, payment_method, status, customer:profiles!orders_customer_id_fkey(full_name), staff:profiles!orders_admin_id_fkey(full_name), order_items(name, quantity)"
      )
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (branchFilter !== "All") query = query.eq("branch", branchFilter);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const start = rangeStart(dateRange);
    if (start) query = query.gte("created_at", start);

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load orders:", error);
      setError(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    setHasMore(rows.length > limit);
    setOrders(
      rows.slice(0, limit).map((o: any) => ({
        id: o.id,
        created_at: o.created_at,
        branch: o.branch,
        subtotal: o.subtotal,
        discount: o.discount,
        tax: o.tax,
        total: o.total,
        payment_method: o.payment_method,
        status: o.status,
        customer_name: o.customer?.full_name ?? null,
        staff_name: o.staff?.full_name ?? null,
        item_summary: (o.order_items ?? []).map((i: any) => `${i.quantity}x ${i.name}`).join(", "),
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter, statusFilter, dateRange, limit]);

  useEffect(() => {
    if (access.isBranchLocked && access.branch) setBranchFilter(access.branch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.isBranchLocked, access.branch]);

  const q = search.trim().toLowerCase();
  const visibleOrders = useMemo(() => {
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.item_summary.toLowerCase().includes(q) ||
        (o.customer_name ?? "").toLowerCase().includes(q) ||
        (o.staff_name ?? "").toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
    );
  }, [orders, q]);

  const summary = useMemo(() => {
    const completed = visibleOrders.filter((o) => o.status === "completed");
    return {
      count: completed.length,
      revenue: completed.reduce((sum, o) => sum + Number(o.total), 0),
    };
  }, [visibleOrders]);

  async function voidOrder(id: string) {
    if (!confirm("Void this order? It will be excluded from sales totals.")) return;
    const { error } = await supabase.from("orders").update({ status: "voided" }).eq("id", id);
    if (error) {
      alert(`Couldn't void order: ${error.message}`);
      return;
    }
    load();
  }

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#2D5A27]">Orders</h2>
      <p className="mt-1 text-sm text-stone-600">
        {access.isBranchLocked ? `Order history for ${access.branch}.` : "Full order history across both branches."}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {access.isBranchLocked ? (
          <span className="chip chip-active">{access.branch}</span>
        ) : (
          (["All", "Palindan", "Uptown"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBranchFilter(b)}
              className={`chip ${branchFilter === b ? "chip-active" : ""}`}
            >
              {b}
            </button>
          ))
        )}
        <span className="mx-1 h-5 w-px bg-stone-200" />
        {(
          [
            { key: "today", label: "Today" },
            { key: "7d", label: "Last 7 days" },
            { key: "30d", label: "Last 30 days" },
            { key: "all", label: "All time" },
          ] as const
        ).map((r) => (
          <button
            key={r.key}
            onClick={() => setDateRange(r.key)}
            className={`chip ${dateRange === r.key ? "chip-active" : ""}`}
          >
            {r.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-stone-200" />
        {(
          [
            { key: "all", label: "All statuses" },
            { key: "completed", label: "Completed" },
            { key: "voided", label: "Voided" },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`chip ${statusFilter === s.key ? "chip-active" : ""}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by item, customer, staff, or order ID…"
        className="input mt-3 w-full sm:max-w-sm"
      />

      <div className="mt-4 flex flex-wrap gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-3">
          <p className="text-xs uppercase tracking-wide text-stone-500">Orders shown</p>
          <p className="mt-1 text-xl font-medium text-[#2D5A27]">{summary.count}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-3">
          <p className="text-xs uppercase tracking-wide text-stone-500">Revenue (completed)</p>
          <p className="mt-1 text-xl font-medium text-[#2D5A27]">₱{summary.revenue.toFixed(2)}</p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">Couldn&apos;t load orders: {error}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            ) : visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-stone-500">
                  No orders match these filters.
                </td>
              </tr>
            ) : (
              visibleOrders.map((o) => (
                <tr
                  key={o.id}
                  className={`border-b border-stone-100 last:border-0 ${
                    o.status === "voided" ? "opacity-60" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-stone-500">
                    {new Date(o.created_at).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{o.branch}</td>
                  <td className="max-w-xs px-4 py-3 text-stone-900">{o.item_summary || "—"}</td>
                  <td className="px-4 py-3 text-stone-700">{o.customer_name ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-700">{o.staff_name ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-700">{o.payment_method}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[#2D5A27]">
                    ₱{Number(o.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        o.status === "voided"
                          ? "bg-stone-100 text-stone-600"
                          : "bg-[#2D5A27]/10 text-[#2D5A27]"
                      }`}
                    >
                      {o.status === "voided" ? "Voided" : "Completed"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.status === "completed" && access.isBranchLocked && (
                      <button onClick={() => voidOrder(o.id)} className="text-xs text-red-500 hover:underline">
                        Void
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && !loading && (
        <button
          onClick={() => setLimit((l) => l + 50)}
          className="mt-4 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
        >
          Load more
        </button>
      )}
    </div>
  );
}
