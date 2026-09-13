import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const GREEN = "#2D5A27";
const GREEN_MID = "#6B8F66";
const GREEN_LIGHT = "#EDF2EB";
const CREAM = "#F9F6F0";
const STONE = "#57534E";
const STONE_LIGHT = "#A8A29E";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    fontSize: 9,
    color: STONE,
    paddingBottom: 48,
  },
  header: {
    backgroundColor: GREEN,
    paddingHorizontal: 32,
    paddingVertical: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 40, height: 40, borderRadius: 20 },
  brand: { fontFamily: "Times-Bold", fontSize: 18, color: CREAM },
  reportTitle: { fontSize: 9, color: CREAM, opacity: 0.85, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  periodLabel: { fontFamily: "Helvetica-Bold", fontSize: 11, color: CREAM },
  generatedAt: { fontSize: 8, color: CREAM, opacity: 0.75, marginTop: 3 },

  body: { paddingHorizontal: 32, paddingTop: 20 },
  sectionTitle: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    color: GREEN,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionSubtitle: { fontSize: 8, color: STONE_LIGHT, marginTop: -8, marginBottom: 10 },

  legendRow: { flexDirection: "row", gap: 14, marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { fontSize: 8, color: STONE },

  trendCard: { borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 6, padding: 14 },
  trendChart: { flexDirection: "row", alignItems: "flex-end", height: 70, gap: 3 },
  trendDayGroup: { flex: 1, alignItems: "center" },
  trendBarsRow: { flexDirection: "row", alignItems: "flex-end", height: 70, gap: 1, width: "100%", justifyContent: "center" },
  trendBarTrack: { width: 5, height: 70, justifyContent: "flex-end" },
  trendBarPalindan: { backgroundColor: GREEN, borderRadius: 1, width: "100%" },
  trendBarUptown: { backgroundColor: GREEN_MID, borderRadius: 1, width: "100%" },
  trendAxisLabel: { fontSize: 6, color: STONE_LIGHT, marginTop: 4 },

  table: { borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 6, overflow: "hidden" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: GREEN_LIGHT, paddingVertical: 7, paddingHorizontal: 10 },
  tableHeaderCell: { fontFamily: "Helvetica-Bold", fontSize: 8, color: GREEN, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EFED",
  },
  tableRowAlt: { backgroundColor: "#FBFAF9" },
  tableRowHighlight: { backgroundColor: GREEN, borderTopWidth: 0 },
  tableCell: { fontSize: 9, color: STONE },
  tableCellBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREEN },
  tableCellOnGreen: { fontSize: 9, fontFamily: "Helvetica-Bold", color: CREAM },
  rankCol: { width: 24 },
  nameCol: { flex: 1.4 },
  numCol: { flex: 1, textAlign: "right" },

  calloutBox: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  calloutLabel: { fontSize: 9, color: STONE },
  calloutValue: { fontFamily: "Helvetica-Bold", fontSize: 12, color: GREEN },

  hourChart: { flexDirection: "row", alignItems: "flex-end", height: 60, gap: 2 },
  hourBarTrack: { flex: 1, height: 60, justifyContent: "flex-end" },
  hourBar: { backgroundColor: GREEN, borderRadius: 1, width: "100%" },
  hourAxisRow: { flexDirection: "row", marginTop: 4 },
  hourAxisLabel: { flex: 1, fontSize: 6, color: STONE_LIGHT, textAlign: "center" },

  emptyNote: { fontSize: 9, color: STONE_LIGHT, fontStyle: "italic", padding: 10 },
  truncateNote: { fontSize: 8, color: STONE_LIGHT, marginTop: 6, fontStyle: "italic" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#E7E5E4",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: STONE_LIGHT },
});

function formatHour(h: number) {
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${period}`;
}

// The base-14 PDF fonts (Helvetica etc.) don't include the ₱ glyph, which
// renders as a mangled character — "Php" is also the standard fallback on
// real Philippine invoices/receipts when the peso symbol isn't available.
function peso(n: number) {
  return `Php ${n.toFixed(2)}`;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export type ReportSection = "revenue" | "items" | "hourly" | "barangay";

const SECTION_TITLES: Record<ReportSection, string> = {
  revenue: "Revenue Summary",
  items: "Best-Selling Items",
  hourly: "Busiest Hour of Day",
  barangay: "Customers by Barangay",
};

type BranchTotals = { Palindan: { revenue: number; orders: number }; Uptown: { revenue: number; orders: number } };

export type AnalyticsReportData = {
  periodLabel: string;
  previousLabel: string;
  generatedAt: Date;
  logoSrc: string;
  sections?: ReportSection[];
  days: { date: string; Palindan: number; Uptown: number }[];
  totals: BranchTotals;
  prevTotals: BranchTotals;
  topItems: { name: string; quantity: number; revenue: number }[];
  hourly: { hour: number; orders: number }[];
  barangays: { label: string; count: number }[];
};

const ALL_SECTIONS: ReportSection[] = ["revenue", "items", "hourly", "barangay"];

function combineTotals(t: BranchTotals) {
  const revenue = t.Palindan.revenue + t.Uptown.revenue;
  const orders = t.Palindan.orders + t.Uptown.orders;
  return { revenue, orders };
}

function formatDelta(curr: number, prev: number): string | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return "New";
  const pct = ((curr - prev) / prev) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

export default function AnalyticsReportPdf({
  periodLabel,
  previousLabel,
  generatedAt,
  logoSrc,
  sections = ALL_SECTIONS,
  days,
  totals,
  prevTotals,
  topItems,
  hourly,
  barangays,
}: AnalyticsReportData) {
  const reportLabel = sections.length === 1 ? SECTION_TITLES[sections[0]] : "Analytics Report";
  const show = (s: ReportSection) => sections.includes(s);

  const combined = combineTotals(totals);
  const prevCombined = combineTotals(prevTotals);
  const combinedAov = combined.orders > 0 ? combined.revenue / combined.orders : 0;
  const revenueDelta = formatDelta(combined.revenue, prevCombined.revenue);
  const maxDay = Math.max(...days.map((d) => Math.max(d.Palindan, d.Uptown)), 0);
  const dayLabelEvery = days.length > 10 ? Math.ceil(days.length / 8) : 1;

  const maxHour = Math.max(...hourly.map((h) => h.orders), 0);
  const busiestHour = hourly.reduce((best, h) => (h.orders > best.orders ? h : best), hourly[0]);
  const shownItems = topItems.slice(0, 10);
  const shownBarangays = barangays.slice(0, 12);

  function revenueRow(name: string, revenue: number, orders: number, isLast: boolean, highlight = false) {
    const aov = orders > 0 ? revenue / orders : 0;
    const rowStyle = highlight
      ? [styles.tableRow, styles.tableRowHighlight]
      : isLast
        ? styles.tableRow
        : [styles.tableRow, styles.tableRowAlt];
    const cellStyle = highlight ? styles.tableCellOnGreen : styles.tableCell;
    const nameStyle = highlight ? styles.tableCellOnGreen : styles.tableCellBold;
    return (
      <View style={rowStyle} key={name}>
        <Text style={[nameStyle, styles.nameCol]}>{name}</Text>
        <Text style={[cellStyle, styles.numCol]}>{peso(revenue)}</Text>
        <Text style={[cellStyle, styles.numCol]}>{orders}</Text>
        <Text style={[cellStyle, styles.numCol]}>{peso(aov)}</Text>
      </View>
    );
  }

  return (
    <Document title={`Sip & Savor Spot - ${reportLabel} (${periodLabel})`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logoSrc} style={styles.logo} />
            <View>
              <Text style={styles.brand}>Sip &amp; Savor Spot</Text>
              <Text style={styles.reportTitle}>{reportLabel} &middot; Ibaan, Batangas</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.periodLabel}>{periodLabel}</Text>
            <Text style={styles.generatedAt}>
              Generated {generatedAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {show("revenue") && (
            <>
              <Text style={styles.sectionTitle}>Daily Revenue Trend</Text>
              {maxDay === 0 ? (
                <Text style={styles.emptyNote}>No completed orders in this period.</Text>
              ) : (
                <View style={styles.trendCard}>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendSwatch, { backgroundColor: GREEN }]} />
                      <Text style={styles.legendLabel}>Palindan</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendSwatch, { backgroundColor: GREEN_MID }]} />
                      <Text style={styles.legendLabel}>Uptown</Text>
                    </View>
                  </View>
                  <View style={styles.trendChart}>
                    {days.map((d, i) => (
                      <View key={d.date} style={styles.trendDayGroup}>
                        <View style={styles.trendBarsRow}>
                          <View style={styles.trendBarTrack}>
                            <View
                              style={[
                                styles.trendBarPalindan,
                                { height: maxDay ? Math.max((d.Palindan / maxDay) * 70, d.Palindan > 0 ? 2 : 0) : 0 },
                              ]}
                            />
                          </View>
                          <View style={styles.trendBarTrack}>
                            <View
                              style={[
                                styles.trendBarUptown,
                                { height: maxDay ? Math.max((d.Uptown / maxDay) * 70, d.Uptown > 0 ? 2 : 0) : 0 },
                              ]}
                            />
                          </View>
                        </View>
                        <Text style={styles.trendAxisLabel}>{i % dayLabelEvery === 0 ? shortDate(d.date) : ""}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.sectionTitle}>Revenue Summary</Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, styles.nameCol]}>Branch</Text>
                  <Text style={[styles.tableHeaderCell, styles.numCol]}>Revenue</Text>
                  <Text style={[styles.tableHeaderCell, styles.numCol]}>Orders</Text>
                  <Text style={[styles.tableHeaderCell, styles.numCol]}>Avg. Order</Text>
                </View>
                {revenueRow("Palindan", totals.Palindan.revenue, totals.Palindan.orders, false)}
                {revenueRow("Uptown", totals.Uptown.revenue, totals.Uptown.orders, true)}
                {revenueRow("Combined", combined.revenue, combined.orders, true, true)}
              </View>
              {revenueDelta && (
                <View style={[styles.calloutBox, { marginTop: 12, marginBottom: 0 }]}>
                  <Text style={styles.calloutLabel}>Combined revenue:</Text>
                  <Text style={styles.calloutValue}>{revenueDelta}</Text>
                  <Text style={styles.calloutLabel}>vs. {previousLabel} (Php {prevCombined.revenue.toFixed(2)})</Text>
                </View>
              )}
            </>
          )}

          {show("items") && (
            <>
              <Text style={styles.sectionTitle}>Best-Selling Items</Text>
              {shownItems.length === 0 ? (
                <Text style={styles.emptyNote}>No completed orders in this period.</Text>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, styles.rankCol]}>#</Text>
                    <Text style={[styles.tableHeaderCell, styles.nameCol]}>Item</Text>
                    <Text style={[styles.tableHeaderCell, styles.numCol]}>Qty Sold</Text>
                    <Text style={[styles.tableHeaderCell, styles.numCol]}>Revenue</Text>
                  </View>
                  {shownItems.map((item, i) => (
                    <View
                      key={item.name}
                      style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
                    >
                      <Text style={[styles.tableCell, styles.rankCol]}>{i + 1}</Text>
                      <Text style={[styles.tableCell, styles.nameCol]}>{item.name}</Text>
                      <Text style={[styles.tableCellBold, styles.numCol]}>{item.quantity}&times;</Text>
                      <Text style={[styles.tableCell, styles.numCol]}>{peso(item.revenue)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {topItems.length > shownItems.length && (
                <Text style={styles.truncateNote}>+{topItems.length - shownItems.length} more item(s) not shown</Text>
              )}
            </>
          )}

          {show("hourly") && (
            <>
              <Text style={styles.sectionTitle}>Busiest Hour of Day</Text>
              {maxHour === 0 ? (
                <Text style={styles.emptyNote}>No completed orders in this period.</Text>
              ) : (
                <>
                  <View style={styles.calloutBox}>
                    <Text style={styles.calloutLabel}>Peak hour:</Text>
                    <Text style={styles.calloutValue}>{formatHour(busiestHour.hour)}</Text>
                    <Text style={styles.calloutLabel}>
                      ({busiestHour.orders} order{busiestHour.orders === 1 ? "" : "s"})
                    </Text>
                  </View>
                  <View style={styles.hourChart}>
                    {hourly.map((h) => (
                      <View key={h.hour} style={styles.hourBarTrack}>
                        <View
                          style={[
                            styles.hourBar,
                            { height: maxHour ? Math.max((h.orders / maxHour) * 60, h.orders > 0 ? 3 : 0) : 0 },
                          ]}
                        />
                      </View>
                    ))}
                  </View>
                  <View style={styles.hourAxisRow}>
                    {hourly.map((h) => (
                      <Text key={h.hour} style={styles.hourAxisLabel}>
                        {h.hour % 3 === 0 ? formatHour(h.hour) : ""}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {show("barangay") && (
            <>
              <Text style={styles.sectionTitle}>Customers by Barangay</Text>
              <Text style={styles.sectionSubtitle}>Where the loyalty program&apos;s members live &mdash; all-time, not scoped to the period above.</Text>
              {shownBarangays.length === 0 ? (
                <Text style={styles.emptyNote}>No verified customers yet.</Text>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, styles.nameCol]}>Barangay</Text>
                    <Text style={[styles.tableHeaderCell, styles.numCol]}>Customers</Text>
                  </View>
                  {shownBarangays.map((b, i) => (
                    <View
                      key={b.label}
                      style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
                    >
                      <Text style={[styles.tableCell, styles.nameCol]}>{b.label}</Text>
                      <Text style={[styles.tableCellBold, styles.numCol]}>{b.count}</Text>
                    </View>
                  ))}
                </View>
              )}
              {barangays.length > shownBarangays.length && (
                <Text style={styles.truncateNote}>+{barangays.length - shownBarangays.length} more not shown</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Sip &amp; Savor Spot &middot; Palindan &amp; Uptown Branches, Ibaan, Batangas</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
