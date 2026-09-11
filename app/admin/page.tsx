import { createClient } from "@/lib/supabase/server";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const todayISO = startOfTodayISO();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = user
    ? await supabase.from("profiles").select("role, branch").eq("id", user.id).single()
    : { data: null };
  const isBranchLocked = myProfile?.role === "admin" && !!myProfile.branch;

  const [{ count: customerCount }, { count: rewardsRedeemedTotal }, { data: todayLogs }, { data: todayOrders }, { data: todayItems }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
      supabase
        .from("stamp_logs")
        .select("*", { count: "exact", head: true })
        .eq("action", "REDEEM_REWARD"),
      supabase
        .from("stamp_logs")
        .select("action, branch_location")
        .gte("created_at", todayISO),
      supabase
        .from("orders")
        .select("branch, total")
        .eq("status", "completed")
        .gte("created_at", todayISO),
      supabase
        .from("order_items")
        .select("name, quantity, orders!inner(status, created_at)")
        .eq("orders.status", "completed")
        .gte("orders.created_at", todayISO),
    ]);

  const bestSellers = (() => {
    const byName = new Map<string, number>();
    for (const row of todayItems ?? []) {
      byName.set(row.name, (byName.get(row.name) ?? 0) + row.quantity);
    }
    return [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  const logs = todayLogs ?? [];
  const stampsToday = logs.filter((l) => l.action === "ADD_STAMP").length;
  const redeemsToday = logs.filter((l) => l.action === "REDEEM_REWARD").length;

  const orders = todayOrders ?? [];
  const revenueToday = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const ordersToday = orders.length;

  const byBranch = new Map<string, { stamps: number; redeems: number; orders: number; revenue: number }>();
  function entryFor(branch: string) {
    const existing = byBranch.get(branch);
    if (existing) return existing;
    const fresh = { stamps: 0, redeems: 0, orders: 0, revenue: 0 };
    byBranch.set(branch, fresh);
    return fresh;
  }
  for (const log of logs) {
    const branch = (log.branch_location ?? "Unspecified").replace(/ Branch$/, "");
    const entry = entryFor(branch);
    if (log.action === "ADD_STAMP") entry.stamps += 1;
    else entry.redeems += 1;
  }
  for (const o of orders) {
    const entry = entryFor(o.branch);
    entry.orders += 1;
    entry.revenue += Number(o.total);
  }

  const stats = [
    { label: "Revenue today", value: `₱${revenueToday.toFixed(2)}` },
    { label: "Orders today", value: ordersToday },
    { label: "Stamps given today", value: stampsToday },
    { label: "Total customers", value: customerCount ?? 0 },
    { label: "Rewards redeemed today", value: redeemsToday },
    { label: "Rewards redeemed (all time)", value: rewardsRedeemedTotal ?? 0 },
  ];

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#2D5A27]">Overview</h2>
      <p className="mt-1 text-sm text-stone-600">
        {isBranchLocked ? `Today at a glance — ${myProfile?.branch}.` : "Today at a glance."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-2xl font-semibold text-[#2D5A27]">{s.value}</p>
            <p className="mt-1 text-sm text-stone-500">{s.label}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-10 font-serif text-lg text-[#2D5A27]">Today&apos;s Best Sellers</h3>
      {bestSellers.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No completed orders yet today.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {bestSellers.map(([name, qty], i) => (
            <div key={name} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-5 py-3">
              <span className="text-stone-900">
                <span className="mr-2 text-stone-400">#{i + 1}</span>
                {name}
              </span>
              <span className="font-medium text-[#2D5A27]">{qty} sold</span>
            </div>
          ))}
        </div>
      )}

      {!isBranchLocked && (
        <>
      <h3 className="mt-10 font-serif text-lg text-[#2D5A27]">Today by branch</h3>
      {byBranch.size === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No activity yet today.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-stone-500">
              <tr>
                <th className="px-5 py-3 font-medium">Branch</th>
                <th className="px-5 py-3 font-medium">Orders</th>
                <th className="px-5 py-3 font-medium">Revenue</th>
                <th className="px-5 py-3 font-medium">Stamps added</th>
                <th className="px-5 py-3 font-medium">Rewards redeemed</th>
              </tr>
            </thead>
            <tbody>
              {[...byBranch.entries()].map(([branch, counts]) => (
                <tr key={branch} className="border-b border-stone-100 last:border-0">
                  <td className="px-5 py-3 text-stone-900">{branch}</td>
                  <td className="px-5 py-3 text-stone-700">{counts.orders}</td>
                  <td className="px-5 py-3 text-stone-700">₱{counts.revenue.toFixed(2)}</td>
                  <td className="px-5 py-3 text-stone-700">{counts.stamps}</td>
                  <td className="px-5 py-3 text-stone-700">{counts.redeems}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}
    </div>
  );
}
