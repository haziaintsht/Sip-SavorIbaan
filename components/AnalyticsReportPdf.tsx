import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const GREEN = "#2D5A27";
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

  cardsRow: { flexDirection: "row", gap: 10 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    borderRadius: 6,
    padding: 12,
  },
  cardHighlight: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: 6,
    padding: 12,
  },
  cardLabel: { fontFamily: "Helvetica-Bold", fontSize: 10, color: GREEN, marginBottom: 8 },
  cardLabelOnGreen: { fontFamily: "Helvetica-Bold", fontSize: 10, color: CREAM, marginBottom: 8 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statBlock: { alignItems: "center", flex: 1 },
  statValue: { fontFamily: "Helvetica-Bold", fontSize: 12, color: GREEN },
  statValueOnGreen: { fontFamily: "Helvetica-Bold", fontSize: 12, color: CREAM },
  statLabel: { fontSize: 7, color: STONE_LIGHT, marginTop: 3 },
  statLabelOnGreen: { fontSize: 7, color: CREAM, opacity: 0.8, marginTop: 3 },

  table: { borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 6, overflow: "hidden" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: GREEN_LIGHT, paddingVertical: 7, paddingHorizontal: 10 },
  tableHeaderCell: { fontFamily: "Helvetica-Bold", fontSize: 8, color: GREEN, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EFED",
  },
  tableRowAlt: { backgroundColor: "#FBFAF9" },
  tableCell: { fontSize: 9, color: STONE },
  tableCellBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREEN },
  rankCol: { width: 24 },
  nameCol: { flex: 1 },
  numCol: { width: 70, textAlign: "right" },

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

export type AnalyticsReportData = {
  range: "7d" | "30d";
  generatedAt: Date;
  logoSrc: string;
  totals: {
    Palindan: { revenue: number; orders: number };
    Uptown: { revenue: number; orders: number };
  };
  topItems: { name: string; quantity: number; revenue: number }[];
  hourly: { hour: number; orders: number }[];
  barangays: { label: string; count: number }[];
};

export default function AnalyticsReportPdf({
  range,
  generatedAt,
  logoSrc,
  totals,
  topItems,
  hourly,
  barangays,
}: AnalyticsReportData) {
  const periodLabel = range === "7d" ? "Last 7 Days" : "Last 30 Days";
  const combined = {
    revenue: totals.Palindan.revenue + totals.Uptown.revenue,
    orders: totals.Palindan.orders + totals.Uptown.orders,
  };
  const combinedAov = combined.orders > 0 ? combined.revenue / combined.orders : 0;
  const maxHour = Math.max(...hourly.map((h) => h.orders), 0);
  const busiestHour = hourly.reduce((best, h) => (h.orders > best.orders ? h : best), hourly[0]);
  const shownItems = topItems.slice(0, 10);
  const shownBarangays = barangays.slice(0, 12);

  function branchCard(name: "Palindan" | "Uptown") {
    const t = totals[name];
    const aov = t.orders > 0 ? t.revenue / t.orders : 0;
    return (
      <View style={styles.card} key={name}>
        <Text style={styles.cardLabel}>{name} Branch</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{peso(t.revenue)}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{t.orders}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{peso(aov)}</Text>
            <Text style={styles.statLabel}>Avg. Order</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Document title={`Sip & Savor Spot - Analytics Report (${periodLabel})`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logoSrc} style={styles.logo} />
            <View>
              <Text style={styles.brand}>Sip &amp; Savor Spot</Text>
              <Text style={styles.reportTitle}>Analytics Report &middot; Ibaan, Batangas</Text>
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
          <Text style={styles.sectionTitle}>Revenue Summary</Text>
          <View style={styles.cardsRow}>
            {branchCard("Palindan")}
            {branchCard("Uptown")}
            <View style={styles.cardHighlight}>
              <Text style={styles.cardLabelOnGreen}>Combined</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statValueOnGreen}>{peso(combined.revenue)}</Text>
                  <Text style={styles.statLabelOnGreen}>Revenue</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={styles.statValueOnGreen}>{combined.orders}</Text>
                  <Text style={styles.statLabelOnGreen}>Orders</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={styles.statValueOnGreen}>{peso(combinedAov)}</Text>
                  <Text style={styles.statLabelOnGreen}>Avg. Order</Text>
                </View>
              </View>
            </View>
          </View>

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
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Sip &amp; Savor Spot &middot; Palindan &amp; Uptown Branches, Ibaan, Batangas</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
