"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";
import { Download } from "lucide-react";
import ReceiptModal from "@/components/ReceiptModal";
import type { ReceiptData } from "@/components/Receipt";

function toCsvValue(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Branch = "Palindan" | "Uptown";
type DateRange = "today" | "7d" | "30d" | "all";
type StatusFilter = "all" | "completed" | "voided";

type OrderItem = { key: string; name: string; unitPrice: number; quantity: number };

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
  items: OrderItem[];
  discount_reason: string | null;
  discount_note: string | null;
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
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [wifiByBranch, setWifiByBranch] = useState<Record<string, string | null>>({});

  useEffect(() => {
    supabase
      .from("branch_info")
      .select("branch, wifi_password")
      .then(({ data }) => {
        const map: Record<string, string | null> = {};
        for (const b of data ?? []) map[b.branch] = b.wifi_password;
        setWifiByBranch(map);
      });
  }, [supabase]);

  async function load() {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("orders")
      .select(
        "id, created_at, branch, subtotal, discount, tax, total, payment_method, status, discount_reason, discount_note, customer:profiles!orders_customer_id_fkey(full_name), staff:profiles!orders_admin_id_fkey(full_name), order_items(name, quantity, unit_price)"
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
        items: (o.order_items ?? []).map((i: any, idx: number) => ({
          key: `${i.name}-${idx}`,
          name: i.name,
          unitPrice: Number(i.unit_price),
          quantity: i.quantity,
        })),
        discount_reason: o.discount_reason ?? null,
        discount_note: o.discount_note ?? null,
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

  function exportCsv() {
    const header = ["When", "Branch", "Items", "Customer", "Staff", "Payment", "Total", "Status"];
    const lines = visibleOrders.map((o) =>
      [
        new Date(o.created_at).toLocaleString("en-PH"),
        o.branch,
        o.item_summary,
        o.customer_name ?? "",
        o.staff_name ?? "",
        o.payment_method,
        Number(o.total).toFixed(2),
        o.status,
      ]
        .map(toCsvValue)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function viewReceipt(o: OrderRow) {
    setReceipt({
      id: o.id,
      createdAt: o.created_at,
      branch: o.branch,
      items: o.items,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      tax: Number(o.tax),
      total: Number(o.total),
      paymentMethod: o.payment_method,
      customerName: o.customer_name,
      discountReason: o.discount_reason,
      discountNote: o.discount_note,
      wifiPassword: wifiByBranch[o.branch] ?? null,
    });
  }

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
      <div className="print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-[#2D5A27]">Orders</h2>
          <p className="mt-1 text-sm text-stone-600">
            {access.isBranchLocked ? `Order history for ${access.branch}.` : "Full order history across both branches."}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={visibleOrders.length === 0}
          className="flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 transition hover:border-[#2D5A27] hover:text-[#2D5A27] disabled:opacity-50"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

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
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm px-5 py-3">
          <p className="text-xs uppercase tracking-wide text-stone-500">Orders shown</p>
          <p className="mt-1 text-xl font-medium text-[#2D5A27]">{summary.count}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm px-5 py-3">
          <p className="text-xs uppercase tracking-wide text-stone-500">Revenue (completed)</p>
          <p className="mt-1 text-xl font-medium text-[#2D5A27]">₱{summary.revenue.toFixed(2)}</p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">Couldn&apos;t load orders: {error}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
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
                  <td className="whitespace-nowrap px-4 py-3">
                    <button onClick={() => viewReceipt(o)} className="text-xs text-stone-500 hover:underline">
                      View Receipt
                    </button>
                    {o.status === "completed" && access.isBranchLocked && (
                      <button onClick={() => voidOrder(o.id)} className="ml-3 text-xs text-red-500 hover:underline">
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

      {receipt && <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
