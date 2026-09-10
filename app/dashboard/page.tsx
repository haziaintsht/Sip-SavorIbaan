"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import LoyaltyCard from "@/components/LoyaltyCard";

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

export default function DashboardPage() {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<LoyaltyCardRow | null>(null);
  const [logs, setLogs] = useState<StampLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

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

      if (cardRow) {
        const { data: logRows } = await supabase
          .from("stamp_logs")
          .select("id, action, branch_location, created_at")
          .eq("card_id", cardRow.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setLogs(logRows ?? []);

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
            (payload) => setCard(payload.new as LoyaltyCardRow)
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
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading) {
    return <main className="px-6 py-24 text-center text-sm text-stone-500">Loading your card...</main>;
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
    </main>
  );
}
