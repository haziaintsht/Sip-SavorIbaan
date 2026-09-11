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

type CardWithStamps = {
  cardId: string;
  fullName: string;
  phoneNumber: string | null;
  stampCount: number;
  stampDates: string[];
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

  const [cardsWithStamps, setCardsWithStamps] = useState<CardWithStamps[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  async function loadCardsWithStamps() {
    setLoadingCards(true);
    const { data: cards } = await supabase
      .from("loyalty_cards")
      .select("id, stamp_count, profiles(full_name, phone_number)")
      .gt("stamp_count", 0)
      .order("stamp_count", { ascending: false });

    const cardRows = cards ?? [];
    const cardIds = cardRows.map((c: any) => c.id);

    const datesByCard = new Map<string, string[]>();
    if (cardIds.length > 0) {
      const { data: logs } = await supabase
        .from("stamp_logs")
        .select("card_id, created_at")
        .eq("action", "ADD_STAMP")
        .in("card_id", cardIds)
        .order("created_at", { ascending: true });

      for (const log of logs ?? []) {
        const list = datesByCard.get(log.card_id) ?? [];
        list.push(log.created_at);
        datesByCard.set(log.card_id, list);
      }
    }

    setCardsWithStamps(
      cardRows.map((c: any) => ({
        cardId: c.id,
        fullName: c.profiles?.full_name ?? "Unknown",
        phoneNumber: c.profiles?.phone_number ?? null,
        stampCount: c.stamp_count,
        stampDates: datesByCard.get(c.id) ?? [],
      }))
    );
    setLoadingCards(false);
  }

  useEffect(() => {
    if (access.role === "super_admin") loadCardsWithStamps();
  }, [access.role]);

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
    if (access.role === "super_admin") loadCardsWithStamps();
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
        <div className="mt-4 max-w-sm rounded-2xl border border-stone-200 bg-white shadow-sm p-4">
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
            className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white shadow-sm p-5 sm:flex-row sm:items-center sm:justify-between"
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

      {access.role === "super_admin" && (
        <div className="mt-10">
          <h3 className="font-serif text-lg text-[#2D5A27]">Customers with Stamps</h3>
          <p className="mt-1 text-sm text-stone-500">
            Every customer who has earned at least one stamp, with the date of each qualifying order.
          </p>

          {loadingCards ? (
            <p className="mt-4 text-sm text-stone-500">Loading…</p>
          ) : cardsWithStamps.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No customer has earned a stamp yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {cardsWithStamps.map((c) => (
                <div key={c.cardId} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-900">{c.fullName}</p>
                      <p className="text-sm text-stone-500">{c.phoneNumber ?? "—"}</p>
                    </div>
                    <span className="text-sm font-medium text-[#2D5A27]">{c.stampCount} / 10 stamps</span>
                  </div>

                  <div className="mt-3 grid grid-cols-10 gap-1.5">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className={`flex aspect-square items-center justify-center rounded-full text-[10px] font-medium ${
                          i < c.stampCount
                            ? "bg-[#2D5A27] text-[#F9F6F0]"
                            : "border border-dashed border-stone-300 text-stone-300"
                        }`}
                      >
                        {i < c.stampCount ? "☕" : i + 1}
                      </div>
                    ))}
                  </div>

                  {c.stampDates.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-stone-100 pt-3">
                      {c.stampDates.map((d, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-600"
                          title={`Stamp #${i + 1}`}
                        >
                          {new Date(d).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
