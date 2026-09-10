"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CustomerResult = {
  id: string;
  full_name: string;
  phone_number: string | null;
  card_id: string;
  stamp_count: number;
};

const BRANCHES = ["Palindan Branch", "Uptown Branch"];

export default function AdminPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setActionMsg(null);

    // Look up by name or phone number; a QR scan should populate `query`
    // with the customer's loyalty ID (their auth.users.id) directly.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone_number, loyalty_cards(id, stamp_count)")
      .or(`full_name.ilike.%${query}%,phone_number.ilike.%${query}%,id.eq.${query}`)
      .eq("role", "customer")
      .limit(10);

    setSearching(false);

    if (error || !data) {
      setActionMsg("Search failed. Try again.");
      return;
    }

    setResults(
      data
        .filter((row: any) => row.loyalty_cards?.[0])
        .map((row: any) => ({
          id: row.id,
          full_name: row.full_name,
          phone_number: row.phone_number,
          card_id: row.loyalty_cards[0].id,
          stamp_count: row.loyalty_cards[0].stamp_count,
        }))
    );
  }

  async function runAction(cardId: string, action: "ADD_STAMP" | "REDEEM_REWARD") {
    setActionMsg(null);
    const { error } = await supabase.rpc("stamp_action", {
      p_card_id: cardId,
      p_action: action,
      p_branch_location: branch,
    });

    if (error) {
      setActionMsg(error.message);
      return;
    }

    setActionMsg(action === "ADD_STAMP" ? "Stamp added." : "Reward redeemed.");
    setResults((prev) =>
      prev.map((r) =>
        r.card_id === cardId
          ? { ...r, stamp_count: action === "ADD_STAMP" ? Math.min(r.stamp_count + 1, 10) : 0 }
          : r
      )
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="font-serif text-3xl text-[#2D5A27]">Stamp Management</h1>
      <p className="mt-1 text-sm text-stone-600">Look up a customer to add or redeem a stamp.</p>

      <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, phone number, or scanned QR ID"
          className="input flex-1"
        />
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="input sm:w-48">
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={searching}
          className="rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      <p className="mt-2 text-xs text-stone-500">
        Tip: wire a QR scanner (e.g. <code>html5-qrcode</code>) to fill this field automatically
        with the scanned loyalty ID.
      </p>

      {actionMsg && <p className="mt-4 text-sm text-[#2D5A27]">{actionMsg}</p>}

      <div className="mt-8 flex flex-col gap-4">
        {results.map((customer) => (
          <div
            key={customer.id}
            className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-stone-900">{customer.full_name}</p>
              <p className="text-sm text-stone-500">{customer.phone_number ?? "—"}</p>
              <p className="mt-1 text-sm text-[#2D5A27]">{customer.stamp_count} / 10 stamps</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => runAction(customer.card_id, "ADD_STAMP")}
                disabled={customer.stamp_count >= 10}
                className="rounded-full bg-[#2D5A27] px-4 py-2 text-sm text-[#F9F6F0] disabled:opacity-40"
              >
                + Add Digital Stamp
              </button>
              <button
                onClick={() => runAction(customer.card_id, "REDEEM_REWARD")}
                disabled={customer.stamp_count < 10}
                className="rounded-full border border-[#2D5A27] px-4 py-2 text-sm text-[#2D5A27] disabled:opacity-40"
              >
                Redeem Reward
              </button>
            </div>
          </div>
        ))}

        {!searching && results.length === 0 && query && (
          <p className="text-sm text-stone-500">No verified customers matched that search.</p>
        )}
      </div>
    </main>
  );
}
