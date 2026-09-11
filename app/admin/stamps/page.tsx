"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CustomerResult = {
  id: string;
  full_name: string;
  phone_number: string | null;
  card_id: string;
  stamp_count: number;
};

const BRANCHES = ["Palindan Branch", "Uptown Branch"];
const SCANNER_ELEMENT_ID = "qr-reader";

export default function AdminStampsPage() {
  const supabase = createClient();
  const access = useAdminAccess();
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState(BRANCHES[0]);

  useEffect(() => {
    if (access.isBranchLocked && access.branch) setBranch(`${access.branch} Branch`);
  }, [access.isBranchLocked, access.branch]);
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;
      const scanner = new Html5QrcodeScanner(
        SCANNER_ELEMENT_ID,
        { fps: 10, qrbox: 250 },
        false
      );
      scannerRef.current = scanner;
      scanner.render(
        (decodedText) => {
          setQuery(decodedText);
          setScanning(false);
          runSearch(decodedText);
        },
        () => {
          // fires continuously while no QR is in frame — not a real error, ignore
        }
      );
    });

    return () => {
      cancelled = true;
      scannerRef.current?.clear().catch(() => {});
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  async function runSearch(rawQuery: string) {
    const q = rawQuery.trim();
    setSearching(true);
    setActionMsg(null);
    setScanError(null);

    // Look up by name or phone number; a QR scan populates `q` with the
    // customer's loyalty ID (their auth.users.id) directly.
    const filters = [`full_name.ilike.%${q}%`, `phone_number.ilike.%${q}%`];
    if (UUID_RE.test(q)) filters.push(`id.eq.${q}`);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone_number, loyalty_cards(id, stamp_count)")
      .or(filters.join(","))
      .eq("role", "customer")
      .limit(10);

    setSearching(false);

    if (error) {
      console.error("Customer search failed:", error);
      setActionMsg("Search failed. Try again.");
      return;
    }
    if (!data) {
      setActionMsg("Search failed. Try again.");
      return;
    }

    setResults(
      data
        // loyalty_cards.user_id is unique, so PostgREST embeds it as a
        // single object (not an array) — treat it that way, not row[0].
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
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
    <div>
      <h2 className="font-serif text-2xl text-[#2D5A27]">Stamp Management</h2>
      <p className="mt-1 text-sm text-stone-600">Look up a customer to add or redeem a stamp.</p>

      <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, phone number, or scanned QR ID"
          className="input flex-1"
        />
        {access.isBranchLocked ? (
          <span className="input flex items-center sm:w-48">{branch}</span>
        ) : (
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="input sm:w-48">
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={searching}
          className="rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          {searching ? "Searching..." : "Search"}
        </button>
        <button
          type="button"
          onClick={() => {
            setScanError(null);
            setScanning((v) => !v);
          }}
          className="rounded-full border border-[#2D5A27] px-6 py-3 text-sm font-medium text-[#2D5A27]"
        >
          {scanning ? "Cancel Scan" : "Scan QR"}
        </button>
      </form>

      {scanning && (
        <div className="mt-4 max-w-sm rounded-2xl border border-stone-200 bg-white p-4">
          <div id={SCANNER_ELEMENT_ID} />
          <p className="mt-2 text-xs text-stone-500">
            Point the camera at the customer&apos;s loyalty QR code.
          </p>
        </div>
      )}
      {scanError && <p className="mt-2 text-sm text-red-600">{scanError}</p>}

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
    </div>
  );
}
