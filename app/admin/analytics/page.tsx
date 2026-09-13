"use client";

import { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";
import CoffeeLoader from "@/components/CoffeeLoader";
import { Download } from "lucide-react";
import AnalyticsReportPdf, { type ReportSection } from "@/components/AnalyticsReportPdf";

type RangeMode = "7d" | "30d" | "custom";
type BranchTotals = { Palindan: { revenue: number; orders: number }; Uptown: { revenue: number; orders: number } };
type Delta = { text: string; positive: boolean } | null;

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

function computeBounds(mode: RangeMode, customStart: string, customEnd: string): { start: Date; end: Date } | null {
  if (mode === "custom") {
    if (!customStart || !customEnd) return null;
    const start = new Date(`${customStart}T00:00:00`);
    const end = new Date(`${customEnd}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
    return { start, end };
  }
  const dayCount = mode === "30d" ? 30 : 7;
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (dayCount - 1));
  return { start, end };
}

// An equal-length window immediately before the current one, so "this
// custom range" and "the same number of days before it" stay comparable.
function previousBounds(start: Date, end: Date) {
  const spanMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - spanMs);
  return { start: prevStart, end: prevEnd };
}

function computeDelta(curr: number, prev: number): Delta {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return { text: "New", positive: true };
  const pct = ((curr - prev) / prev) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`, positive: pct >= 0 };
}

function sumTotals(rows: { branch: string; total: number }[]): BranchTotals {
  const totals: BranchTotals = { Palindan: { revenue: 0, orders: 0 }, Uptown: { revenue: 0, orders: 0 } };
  for (const r of rows) {
    if (r.branch === "Palindan" || r.branch === "Uptown") {
      totals[r.branch].revenue += Number(r.total);
      totals[r.branch].orders += 1;
    }
  }
  return totals;
}

const todayStr = new Date().toISOString().slice(0, 10);

export default function AdminAnalyticsPage() {
  const supabase = createClient();
  const access = useAdminAccess();

  const [rangeMode, setRangeMode] = useState<RangeMode>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [rows, setRows] = useState<{ branch: string; total: number; created_at: string }[]>([]);
  const [prevRows, setPrevRows] = useState<{ branch: string; total: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [barangayRows, setBarangayRows] = useState<{ location: string | null }[]>([]);
  const [barangayLoading, setBarangayLoading] = useState(true);
  const [showAllItems, setShowAllItems] = useState(false);
  const [showAllBarangays, setShowAllBarangays] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<"all" | ReportSection | null>(null);

  const bounds = useMemo(() => computeBounds(rangeMode, customStart, customEnd), [rangeMode, customStart, customEnd]);

  useEffect(() => {
    if (access.role !== "super_admin" || !bounds) return;
    setLoading(true);
    setItemsLoading(true);
    const prev = previousBounds(bounds.start, bounds.end);

    supabase
      .from("orders")
      .select("branch, total, created_at")
      .eq("status", "completed")
      .gte("created_at", bounds.start.toISOString())
      .lte("created_at", bounds.end.toISOString())
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });

    supabase
      .from("orders")
      .select("branch, total, created_at")
      .eq("status", "completed")
      .gte("created_at", prev.start.toISOString())
      .lte("created_at", prev.end.toISOString())
      .then(({ data }) => setPrevRows(data ?? []));

    supabase
      .from("order_items")
      .select("name, quantity, line_total, orders!inner(created_at, status)")
      .eq("orders.status", "completed")
      .gte("orders.created_at", bounds.start.toISOString())
      .lte("orders.created_at", bounds.end.toISOString())
      .then(({ data }) => {
        setItemRows((data as unknown as ItemRow[]) ?? []);
        setItemsLoading(false);
      });
  }, [supabase, bounds, access.role]);

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
    if (!bounds) return { days: [] as DayRow[], totals: sumTotals([]) };
    const byDay = new Map<string, DayRow>();
    const cursor = new Date(bounds.start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(bounds.end);
    endDay.setHours(0, 0, 0, 0);
    while (cursor <= endDay) {
      byDay.set(dateKey(cursor), { date: dateKey(cursor), Palindan: 0, Uptown: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const r of rows) {
      const key = dateKey(new Date(r.created_at));
      const bucket = byDay.get(key);
      if (bucket && (r.branch === "Palindan" || r.branch === "Uptown")) {
        bucket[r.branch] += Number(r.total);
      }
    }
    return { days: [...byDay.values()], totals: sumTotals(rows) };
  }, [rows, bounds]);

  const prevTotals = useMemo(() => sumTotals(prevRows), [prevRows]);

  const maxDay = Math.max(...days.map((d) => Math.max(d.Palindan, d.Uptown)), 0);
  const dayLabelEvery = days.length > 14 ? Math.ceil(days.length / 10) : 1;

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

  const shortDate = (d: Date) => d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  const periodLabel =
    rangeMode === "7d"
      ? "Last 7 days"
      : rangeMode === "30d"
        ? "Last 30 days"
        : bounds
          ? `${shortDate(bounds.start)} – ${bounds.end.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`
          : "Custom range";
  const previousLabel = rangeMode === "custom" ? "the previous period" : `the previous ${rangeMode === "30d" ? 30 : 7} days`;

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
          periodLabel={periodLabel}
          previousLabel={previousLabel}
          generatedAt={new Date()}
          logoSrc={`${window.location.origin}/logo_sns.jpg`}
          sections={sections}
          days={days}
          totals={totals}
          prevTotals={prevTotals}
          topItems={topItems}
          hourly={hourly}
          barangays={barangays}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 10);
      const slug = sections && sections.length === 1 ? SECTION_FILE_SLUG[sections[0]] : "analytics";
      const rangeTag =
        rangeMode === "custom" && bounds ? `${customStart}_to_${customEnd}` : rangeMode;
      a.href = url;
      a.download = `sip-savor-spot-${slug}-${rangeTag}-${dateStamp}.pdf`;
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

  function DeltaBadge({ delta }: { delta: Delta }) {
    if (!delta) return null;
    return (
      <p className={`mt-0.5 text-[10px] font-medium ${delta.positive ? "text-[#2D5A27]" : "text-red-600"}`}>
        {delta.text} vs. {previousLabel}
      </p>
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

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["7d", "30d", "custom"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRangeMode(r)}
            className={`chip ${rangeMode === r ? "chip-active" : ""}`}
          >
            {r === "7d" ? "Last 7 days" : r === "30d" ? "Last 30 days" : "Custom range"}
          </button>
        ))}
        {rangeMode === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              max={customEnd || todayStr}
              onChange={(e) => setCustomStart(e.target.value)}
              className="input w-[9.5rem] py-1.5 text-xs"
            />
            <span className="text-xs text-stone-400">to</span>
            <input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              max={todayStr}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="input w-[9.5rem] py-1.5 text-xs"
            />
          </div>
        )}
      </div>
      {rangeMode === "custom" && (customStart || customEnd) && !bounds && (
        <p className="mt-2 text-xs text-red-600">Pick a start and end date — end must be on or after start.</p>
      )}

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
        ) : !bounds ? (
          <p className="text-sm text-stone-500">Pick a valid date range above.</p>
        ) : maxDay === 0 ? (
          <p className="text-sm text-stone-500">No completed orders in this period.</p>
        ) : (
          <div className="flex items-end gap-1 overflow-x-auto pb-1">
            {days.map((d, i) => (
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
                  {i % dayLabelEvery === 0 ? new Date(d.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="mt-8 font-serif text-lg text-[#2D5A27]">Period Totals — {periodLabel}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(["Palindan", "Uptown"] as const).map((branch) => {
          const t = totals[branch];
          const pt = prevTotals[branch];
          const aov = t.orders > 0 ? t.revenue / t.orders : 0;
          const prevAov = pt.orders > 0 ? pt.revenue / pt.orders : 0;
          return (
            <div key={branch} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h4 className="font-serif text-base text-[#2D5A27]">{branch}</h4>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-semibold text-[#2D5A27]">₱{t.revenue.toFixed(2)}</p>
                  <p className="text-xs text-stone-500">Revenue</p>
                  <DeltaBadge delta={computeDelta(t.revenue, pt.revenue)} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#2D5A27]">{t.orders}</p>
                  <p className="text-xs text-stone-500">Orders</p>
                  <DeltaBadge delta={computeDelta(t.orders, pt.orders)} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#2D5A27]">₱{aov.toFixed(2)}</p>
                  <p className="text-xs text-stone-500">Avg. order</p>
                  <DeltaBadge delta={computeDelta(aov, prevAov)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg text-[#2D5A27]">Best-Selling Items — {periodLabel}</h3>
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
        <h3 className="font-serif text-lg text-[#2D5A27]">Busiest Hour of Day — {periodLabel}</h3>
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
