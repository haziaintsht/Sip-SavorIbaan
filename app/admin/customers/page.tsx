import { createClient } from "@/lib/supabase/server";

type CustomerRow = {
  id: string;
  full_name: string;
  phone_number: string | null;
  location: string | null;
  created_at: string;
  // loyalty_cards.user_id is unique, so PostgREST embeds this as a single
  // object (or null), not an array.
  loyalty_cards: { stamp_count: number; total_earned_rewards: number } | null;
};

export default async function AdminCustomersPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, location, created_at, loyalty_cards(stamp_count, total_earned_rewards)")
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<CustomerRow[]>();

  const customers = data ?? [];

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#2D5A27]">Customers</h2>
      <p className="mt-1 text-sm text-stone-600">
        {customers.length} verified {customers.length === 1 ? "customer" : "customers"}. The loyalty program is
        shared across both branches.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">Couldn&apos;t load customers.</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-stone-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Stamps</th>
              <th className="px-5 py-3 font-medium">Rewards earned</th>
              <th className="px-5 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const card = c.loyalty_cards;
              return (
                <tr key={c.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-5 py-3 text-stone-900">{c.full_name}</td>
                  <td className="px-5 py-3 text-stone-700">{c.phone_number ?? "—"}</td>
                  <td className="px-5 py-3 text-stone-700">{c.location ?? "—"}</td>
                  <td className="px-5 py-3 text-stone-700">{card ? `${card.stamp_count} / 10` : "—"}</td>
                  <td className="px-5 py-3 text-stone-700">{card?.total_earned_rewards ?? 0}</td>
                  <td className="px-5 py-3 text-stone-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}

            {customers.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-stone-500">
                  No verified customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
