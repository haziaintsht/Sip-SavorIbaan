"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Coffee, PartyPopper } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LoyaltyCard from "@/components/LoyaltyCard";
import Toast, { type ToastData } from "@/components/Toast";
import CoffeeLoader from "@/components/CoffeeLoader";

type LoyaltyCardRow = {
  id: string;
  stamp_count: number;
  total_earned_rewards: number;
};

type StampLog = {
  id: string;
  action: "ADD_STAMP" | "REDEEM_REWARD";
  branch_location: string | null;
  created_at: string;
};

type OrderHistoryRow = {
  id: string;
  created_at: string;
  branch: string;
  total: number;
  status: "completed" | "voided";
  item_summary: string;
};

export default function DashboardPage() {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<LoyaltyCardRow | null>(null);
  const [logs, setLogs] = useState<StampLog[]>([]);
  const [orders, setOrders] = useState<OrderHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);
  const prevCardRef = useRef<LoyaltyCardRow | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fireToast(message: string, icon: LucideIcon) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, icon });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setFullName(profile?.full_name ?? "");

      const { data: cardRow } = await supabase
        .from("loyalty_cards")
        .select("id, stamp_count, total_earned_rewards")
        .eq("user_id", user.id)
        .single();
      setCard(cardRow);
      prevCardRef.current = cardRow ?? null;

      const { data: orderRows } = await supabase
        .from("orders")
        .select("id, created_at, branch, total, status, order_items(name, quantity)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15);
      setOrders(
        (orderRows ?? []).map((o: any) => ({
          id: o.id,
          created_at: o.created_at,
          branch: o.branch,
          total: o.total,
          status: o.status,
          item_summary: (o.order_items ?? []).map((i: any) => `${i.quantity}x ${i.name}`).join(", "),
        }))
      );

      if (cardRow) {
        const { data: logRows } = await supabase
          .from("stamp_logs")
          .select("id, action, branch_location, created_at")
          .eq("card_id", cardRow.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setLogs(logRows ?? []);

        // In dev, React Strict Mode mounts this effect twice; if the first
        // instance's cleanup already ran by the time we get here, skip
        // subscribing — otherwise two channels with the same topic collide
        // ("cannot add postgres_changes callbacks... after subscribe()").
        if (cancelled) return;

        // Realtime: reflect stamps the moment an admin adds/redeems them
        channel = supabase
          .channel(`loyalty-card-${cardRow.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "loyalty_cards",
              filter: `id=eq.${cardRow.id}`,
            },
            (payload) => {
              const updated = payload.new as LoyaltyCardRow;
              const prev = prevCardRef.current;
              if (prev) {
                if (updated.total_earned_rewards > prev.total_earned_rewards) {
                  fireToast("Reward redeemed — enjoy your free drink!", PartyPopper);
                } else if (updated.stamp_count > prev.stamp_count) {
                  fireToast("You've received a stamp!", Coffee);
                }
              }
              prevCardRef.current = updated;
              setCard(updated);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "stamp_logs",
              filter: `card_id=eq.${cardRow.id}`,
            },
            (payload) => setLogs((prev) => [payload.new as StampLog, ...prev].slice(0, 10))
          )
          .subscribe();
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [supabase]);

  if (loading) {
    return (
      <main className="px-6 py-24">
        <CoffeeLoader label="Loading your card..." />
      </main>
    );
  }

  if (!card || !userId) {
    return (
      <main className="px-6 py-24 text-center text-sm text-stone-500">
        We couldn&apos;t find a loyalty card for your account.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <h1 className="font-serif text-3xl text-[#2D5A27]">Hi, {fullName || "there"}</h1>
      <p className="mt-1 text-sm text-stone-600">
        Show your QR code at the counter to earn a stamp with every qualifying order.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-[#2D5A27]/15 bg-white p-6">
        <QRCodeSVG value={userId} size={160} fgColor="#2D5A27" />
        <p className="text-xs text-stone-500">Loyalty ID: {userId.slice(0, 8)}</p>
      </div>

      <div className="mt-6">
        <LoyaltyCard stampCount={card.stamp_count} />
      </div>

      <p className="mt-4 text-center text-xs text-stone-500">
        Rewards redeemed so far: {card.total_earned_rewards}
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-lg text-[#2D5A27]">Recent activity</h2>
        <ul className="mt-3 divide-y divide-stone-100">
          {logs.length === 0 && (
            <li className="py-3 text-sm text-stone-500">No stamps yet — your first order starts the card.</li>
          )}
          {logs.map((log) => (
            <li key={log.id} className="flex items-center justify-between py-3 text-sm">
              <span className="text-stone-700">
                {log.action === "ADD_STAMP" ? "Stamp added" : "Reward redeemed"}
                {log.branch_location ? ` · ${log.branch_location}` : ""}
              </span>
              <span className="text-stone-400">
                {new Date(log.created_at).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-lg text-[#2D5A27]">Your orders</h2>
        <ul className="mt-3 divide-y divide-stone-100">
          {orders.length === 0 && (
            <li className="py-3 text-sm text-stone-500">No orders yet — your first visit will show up here.</li>
          )}
          {orders.map((o) => (
            <li key={o.id} className="py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-stone-700">
                  {o.item_summary || "—"}
                  {o.status === "voided" && <span className="text-stone-400"> · Voided</span>}
                </p>
                <span className="shrink-0 font-medium text-[#2D5A27]">₱{Number(o.total).toFixed(2)}</span>
              </div>
              <p className="mt-0.5 text-xs text-stone-400">
                {o.branch} ·{" "}
                {new Date(o.created_at).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
