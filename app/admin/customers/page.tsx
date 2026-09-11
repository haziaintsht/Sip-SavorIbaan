"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download } from "lucide-react";
import CoffeeLoader from "@/components/CoffeeLoader";

type CustomerRow = {
  id: string;
  full_name: string;
  phone_number: string | null;
  location: string | null;
  created_at: string;
  stampCount: number;
  rewardsEarned: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

type SortKey = "stamps" | "spend" | "recent" | "inactive";

function daysAgo(iso: string | null) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function toCsvValue(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AdminCustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: profileRows, error: profileError }, { data: orderRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, phone_number, location, created_at, loyalty_cards(stamp_count, total_earned_rewards)")
          .eq("role", "customer")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("orders").select("customer_id, total, created_at").eq("status", "completed").not("customer_id", "is", null),
      ]);

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      const spendByCustomer = new Map<string, { total: number; lastOrderAt: string | null }>();
      for (const o of orderRows ?? []) {
        const existing = spendByCustomer.get(o.customer_id as string) ?? { total: 0, lastOrderAt: null };
        existing.total += Number(o.total);
        if (!existing.lastOrderAt || new Date(o.created_at) > new Date(existing.lastOrderAt)) {
          existing.lastOrderAt = o.created_at;
        }
        spendByCustomer.set(o.customer_id as string, existing);
      }

      setCustomers(
        (profileRows ?? []).map((c: any) => ({
          id: c.id,
          full_name: c.full_name,
          phone_number: c.phone_number,
          location: c.location,
          created_at: c.created_at,
          stampCount: c.loyalty_cards?.stamp_count ?? 0,
          rewardsEarned: c.loyalty_cards?.total_earned_rewards ?? 0,
          totalSpent: spendByCustomer.get(c.id)?.total ?? 0,
          lastOrderAt: spendByCustomer.get(c.id)?.lastOrderAt ?? null,
        }))
      );
      setLoading(false);
    }
    load();
  }, [supabase]);

  const sorted = useMemo(() => {
    const list = [...customers];
    switch (sortKey) {
      case "stamps":
        return list.sort((a, b) => b.stampCount - a.stampCount);
      case "spend":
        return list.sort((a, b) => b.totalSpent - a.totalSpent);
      case "inactive":
        return list.sort((a, b) => daysAgo(b.lastOrderAt) - daysAgo(a.lastOrderAt));
      case "recent":
      default:
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [customers, sortKey]);

  function exportCsv() {
    const header = ["Name", "Phone", "Location", "Stamps", "Rewards earned", "Total spent", "Last order", "Joined"];
    const lines = sorted.map((c) =>
      [
        c.full_name,
        c.phone_number ?? "",
        c.location ?? "",
        c.stampCount,
        c.rewardsEarned,
        c.totalSpent.toFixed(2),
        c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : "",
        new Date(c.created_at).toLocaleDateString(),
      ]
        .map(toCsvValue)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-[#2D5A27]">Customers</h2>
          <p className="mt-1 text-sm text-stone-600">
            {customers.length} verified {customers.length === 1 ? "customer" : "customers"}. The loyalty program is
            shared across both branches.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={customers.length === 0}
          className="flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 transition hover:border-[#2D5A27] hover:text-[#2D5A27] disabled:opacity-50"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            { key: "recent", label: "Newest joined" },
            { key: "stamps", label: "Most stamps" },
            { key: "spend", label: "Highest spend" },
            { key: "inactive", label: "Least recently seen" },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            onClick={() => setSortKey(s.key)}
            className={`chip ${sortKey === s.key ? "chip-active" : ""}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">Couldn&apos;t load customers.</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#2D5A27]/5 text-stone-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Stamps</th>
              <th className="px-5 py-3 font-medium">Total spent</th>
              <th className="px-5 py-3 font-medium">Last order</th>
              <th className="px-5 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8">
                  <CoffeeLoader size={36} label={null} />
                </td>
              </tr>
            ) : (
              sorted.map((c) => {
                const inactive = daysAgo(c.lastOrderAt) >= 30;
                return (
                  <tr key={c.id} className="border-t border-stone-100 transition hover:bg-stone-50">
                    <td className="px-5 py-3 text-stone-900">{c.full_name}</td>
                    <td className="px-5 py-3 text-stone-700">{c.phone_number ?? "—"}</td>
                    <td className="px-5 py-3 text-stone-700">{c.location ?? "—"}</td>
                    <td className="px-5 py-3 text-stone-700">{c.stampCount} / 10</td>
                    <td className="px-5 py-3 font-medium text-[#2D5A27]">₱{c.totalSpent.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      {c.lastOrderAt ? (
                        <span className={inactive ? "text-amber-600" : "text-stone-700"}>
                          {new Date(c.lastOrderAt).toLocaleDateString()}
                          {inactive && " · inactive"}
                        </span>
                      ) : (
                        <span className="text-stone-400">Never ordered</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-stone-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })
            )}

            {!loading && customers.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-stone-500">
                  No verified customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
