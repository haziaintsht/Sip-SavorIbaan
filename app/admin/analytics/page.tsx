"use client";

import { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";
import CoffeeLoader from "@/components/CoffeeLoader";
import { Download } from "lucide-react";
import AnalyticsReportPdf, { type ReportSection } from "@/components/AnalyticsReportPdf";

type RangeKey = "7d" | "30d";

type DayRow = { date: string; Palindan: number; Uptown: number };
type ItemRow = { name: string; quantity: number; line_total: number; orders: { created_at: string } | null };
type TopItem = { name: string; quantity: number; revenue: number };
type BarangayCount = { label: string; count: number };

// Local-time date key (not toISOString, which is UTC and can shift the
// date by a day relative to the local-midnight bucket boundaries below).
function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminAnalyticsPage() {
  const supabase = createClient();
  const access = useAdminAccess();

  const [range, setRange] = useState<RangeKey>("7d");
  const [rows, setRows] = useState<{ branch: string; total: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [barangayRows, setBarangayRows] = useState<{ location: string | null }[]>([]);
  const [barangayLoading, setBarangayLoading] = useState(true);
  const [showAllItems, setShowAllItems] = useState(false);
  const [showAllBarangays, setShowAllBarangays] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<"all" | ReportSection | null>(null);

  useEffect(() => {
    if (access.role !== "super_admin") return;
    setLoading(true);
    setItemsLoading(true);
    const days = range === "7d" ? 7 : 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    supabase
      .from("orders")
      .select("branch, total, created_at")
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });

    supabase
      .from("order_items")
      .select("name, quantity, line_total, orders!inner(created_at, status)")
      .eq("orders.status", "completed")
      .gte("orders.created_at", start.toISOString())
      .then(({ data }) => {
        setItemRows((data as unknown as ItemRow[]) ?? []);
        setItemsLoading(false);
      });
  }, [supabase, range, access.role]);

  // Customer base by barangay — a standing demographic picture, not scoped
  // to the revenue-period toggle above.
  useEffect(() => {
    if (access.role !== "super_admin") return;
    supabase
      .from("profiles")
      .select("location")
      .eq("role", "customer")
      .then(({ data }) => {
        setBarangayRows(data ?? []);
        setBarangayLoading(false);
      });
  }, [supabase, access.role]);

  const { days, totals } = useMemo(() => {
    const dayCount = range === "7d" ? 7 : 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (dayCount - 1));

    const byDay = new Map<string, DayRow>();
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      byDay.set(dateKey(d), { date: dateKey(d), Palindan: 0, Uptown: 0 });
    }
    const totals = { Palindan: { revenue: 0, orders: 0 }, Uptown: { revenue: 0, orders: 0 } };
    for (const r of rows) {
      const key = dateKey(new Date(r.created_at));
      const bucket = byDay.get(key);
      if (bucket && (r.branch === "Palindan" || r.branch === "Uptown")) {
        bucket[r.branch] += Number(r.total);
      }
      if (r.branch === "Palindan" || r.branch === "Uptown") {
        totals[r.branch].revenue += Number(r.total);
        totals[r.branch].orders += 1;
      }
    }
    return { days: [...byDay.values()], totals };
  }, [rows, range]);

  const maxDay = Math.max(...days.map((d) => Math.max(d.Palindan, d.Uptown)), 0);

  const topItems = useMemo(() => {
    const byName = new Map<string, TopItem>();
    for (const r of itemRows) {
      const existing = byName.get(r.name) ?? { name: r.name, quantity: 0, revenue: 0 };
      existing.quantity += r.quantity;
      existing.revenue += Number(r.line_total);
      byName.set(r.name, existing);
    }
    return [...byName.values()].sort((a, b) => b.quantity - a.quantity);
  }, [itemRows]);
  const maxItemQty = Math.max(...topItems.map((i) => i.quantity), 0);
  const visibleItems = showAllItems ? topItems : topItems.slice(0, 5);

  // Hour-of-day distribution reuses the same order rows already fetched for
  // the revenue chart above — local time, same reasoning as dateKey().
  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
    for (const r of rows) {
      buckets[new Date(r.created_at).getHours()].orders += 1;
    }
    return buckets;
  }, [rows]);
  const maxHour = Math.max(...hourly.map((h) => h.orders), 0);
  const busiestHour = hourly.reduce((best, h) => (h.orders > best.orders ? h : best), hourly[0]);

  function formatHour(h: number) {
    const period = h < 12 ? "AM" : "PM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}${period}`;
  }

  const barangays = useMemo(() => {
    const byLabel = new Map<string, BarangayCount>();
    for (const r of barangayRows) {
      const raw = r.location?.trim();
      const key = raw ? raw.toLowerCase() : "__unspecified__";
      const existing = byLabel.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        byLabel.set(key, { label: raw || "Not specified", count: 1 });
      }
    }
    return [...byLabel.values()].sort((a, b) => b.count - a.count);
  }, [barangayRows]);
  const maxBarangay = Math.max(...barangays.map((b) => b.count), 0);
  const visibleBarangays = showAllBarangays ? barangays : barangays.slice(0, 5);

  const SECTION_FILE_SLUG: Record<ReportSection, string> = {
    revenue: "revenue",
    items: "best-selling-items",
    hourly: "busiest-hour",
    barangay: "customers-by-barangay",
  };

  async function handleDownloadPdf(sections?: ReportSection[]) {
    setDownloadingPdf(sections && sections.length === 1 ? sections[0] : "all");
    try {
      const blob = await pdf(
        <AnalyticsReportPdf
          range={range}
          generatedAt={new Date()}
          logoSrc={`${window.location.origin}/logo_sns.jpg`}
          sections={sections}
          days={days}
          totals={totals}
          topItems={topItems}
          hourly={hourly}
          barangays={barangays}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 10);
      const slug = sections && sections.length === 1 ? SECTION_FILE_SLUG[sections[0]] : "analytics";
      a.href = url;
      a.download = `sip-savor-spot-${slug}-${range}-${dateStamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingPdf(null);
    }
  }

  function SectionDownloadButton({ section, label }: { section: ReportSection; label: string }) {
    return (
      <button
        onClick={() => handleDownloadPdf([section])}
        disabled={downloadingPdf !== null || loading || itemsLoading || barangayLoading}
        title={`Download ${label} as PDF`}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#2D5A27]/20 px-3 py-1.5 text-xs font-medium text-[#2D5A27] hover:bg-[#2D5A27]/5 disabled:opacity-50"
      >
        <Download size={12} strokeWidth={2} />
        {downloadingPdf === section ? "Preparing..." : "PDF"}
      </button>
    );
  }

  if (!access.loading && access.role !== "super_admin") {
    return (
      <div>
        <h2 className="font-serif text-2xl text-[#2D5A27]">Analytics</h2>
        <p className="mt-3 text-sm text-stone-600">Only the owner account can view branch trends.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-[#2D5A27]">Analytics</h2>
          <p className="mt-1 text-sm text-stone-600">Revenue trends, Palindan vs. Uptown.</p>
        </div>
        <button
          onClick={() => handleDownloadPdf()}
          disabled={downloadingPdf !== null || loading || itemsLoading || barangayLoading}
          className="flex items-center gap-2 rounded-full bg-[#2D5A27] px-4 py-2.5 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
        >
          <Download size={16} strokeWidth={2} />
          {downloadingPdf === "all" ? "Preparing PDF..." : "Download PDF Report"}
        </button>
      </div>

      <div className="mt-5 flex gap-2">
        {(["7d", "30d"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`chip ${range === r ? "chip-active" : ""}`}
          >
            {r === "7d" ? "Last 7 days" : "Last 30 days"}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#2D5A27]" /> Palindan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#2D5A27]/35" /> Uptown
          </span>
        </div>
        <SectionDownloadButton section="revenue" label="Revenue Summary" />
      </div>

      <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        {loading ? (
          <CoffeeLoader size={56} />
        ) : maxDay === 0 ? (
          <p className="text-sm text-stone-500">No completed orders in this period.</p>
        ) : (
          <div className="flex items-end gap-1 overflow-x-auto pb-1">
            {days.map((d) => (
              <div key={d.date} className="flex min-w-[18px] flex-1 flex-col items-center">
                <div className="flex h-32 w-full items-end justify-center gap-0.5">
                  <div
                    className="w-1/2 rounded-t bg-[#2D5A27]"
                    style={{ height: `${maxDay ? Math.max((d.Palindan / maxDay) * 100, d.Palindan > 0 ? 3 : 0) : 0}%` }}
                    title={`Palindan: ₱${d.Palindan.toFixed(2)}`}
                  />
                  <div
                    className="w-1/2 rounded-t bg-[#2D5A27]/35"
                    style={{ height: `${maxDay ? Math.max((d.Uptown / maxDay) * 100, d.Uptown > 0 ? 3 : 0) : 0}%` }}
                    title={`Uptown: ₱${d.Uptown.toFixed(2)}`}
                  />
                </div>
                <span className="mt-1.5 whitespace-nowrap text-[9px] text-stone-400">
                  {new Date(d.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="mt-8 font-serif text-lg text-[#2D5A27]">
        Period Totals — {range === "7d" ? "Last 7 days" : "Last 30 days"}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(["Palindan", "Uptown"] as const).map((branch) => {
          const t = totals[branch];
          const aov = t.orders > 0 ? t.revenue / t.orders : 0;
          return (
            <div key={branch} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h4 className="font-serif text-base text-[#2D5A27]">{branch}</h4>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-semibold text-[#2D5A27]">₱{t.revenue.toFixed(2)}</p>
                  <p className="text-xs text-stone-500">Revenue</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#2D5A27]">{t.orders}</p>
                  <p className="text-xs text-stone-500">Orders</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#2D5A27]">₱{aov.toFixed(2)}</p>
                  <p className="text-xs text-stone-500">Avg. order</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg text-[#2D5A27]">
          Best-Selling Items — {range === "7d" ? "Last 7 days" : "Last 30 days"}
        </h3>
        <SectionDownloadButton section="items" label="Best-Selling Items" />
      </div>
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        {itemsLoading ? (
          <CoffeeLoader size={56} />
        ) : topItems.length === 0 ? (
          <p className="text-sm text-stone-500">No completed orders in this period.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {visibleItems.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-stone-700" title={item.name}>
                    {item.name}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-[#2D5A27]"
                      style={{ width: `${maxItemQty ? (item.quantity / maxItemQty) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-sm font-semibold text-[#2D5A27]">
                    {item.quantity}×
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs text-stone-500">
                    ₱{item.revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            {topItems.length > 5 && (
              <button
                onClick={() => setShowAllItems((v) => !v)}
                className="mt-4 text-sm font-medium text-[#2D5A27] hover:underline"
              >
                {showAllItems ? "Show top 5" : `See all ${topItems.length} items`}
              </button>
            )}
          </>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg text-[#2D5A27]">
          Busiest Hour of Day — {range === "7d" ? "Last 7 days" : "Last 30 days"}
        </h3>
        <SectionDownloadButton section="hourly" label="Busiest Hour of Day" />
      </div>
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        {loading ? (
          <CoffeeLoader size={56} />
        ) : maxHour === 0 ? (
          <p className="text-sm text-stone-500">No completed orders in this period.</p>
        ) : (
          <>
            <p className="text-sm text-stone-600">
              Busiest hour: <span className="font-semibold text-[#2D5A27]">{formatHour(busiestHour.hour)}</span> ({busiestHour.orders} order{busiestHour.orders === 1 ? "" : "s"})
            </p>
            <div className="mt-4 flex items-end gap-0.5 overflow-x-auto pb-1">
              {hourly.map((h) => (
                <div key={h.hour} className="flex min-w-[16px] flex-1 flex-col items-center">
                  <div className="flex h-24 w-full items-end justify-center">
                    <div
                      className="w-full rounded-t bg-[#2D5A27]"
                      style={{ height: `${maxHour ? Math.max((h.orders / maxHour) * 100, h.orders > 0 ? 3 : 0) : 0}%` }}
                      title={`${formatHour(h.hour)}: ${h.orders} order${h.orders === 1 ? "" : "s"}`}
                    />
                  </div>
                  {h.hour % 3 === 0 && (
                    <span className="mt-1.5 whitespace-nowrap text-[9px] text-stone-400">{formatHour(h.hour)}</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg text-[#2D5A27]">Customers by Barangay</h3>
        <SectionDownloadButton section="barangay" label="Customers by Barangay" />
      </div>
      <p className="mt-1 text-sm text-stone-600">Where the loyalty program's members live — all-time, not scoped to the period above.</p>
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        {barangayLoading ? (
          <CoffeeLoader size={56} />
        ) : barangays.length === 0 ? (
          <p className="text-sm text-stone-500">No verified customers yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {visibleBarangays.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-stone-700" title={b.label}>
                    {b.label}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-[#2D5A27]"
                      style={{ width: `${maxBarangay ? (b.count / maxBarangay) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-semibold text-[#2D5A27]">
                    {b.count} {b.count === 1 ? "customer" : "customers"}
                  </span>
                </div>
              ))}
            </div>
            {barangays.length > 5 && (
              <button
                onClick={() => setShowAllBarangays((v) => !v)}
                className="mt-4 text-sm font-medium text-[#2D5A27] hover:underline"
              >
                {showAllBarangays ? "Show top 5" : `See all ${barangays.length} barangays`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
