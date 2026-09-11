"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";

type BranchInfo = {
  branch: "Palindan" | "Uptown";
  address: string;
  hours: string;
  map_lat: number | null;
  map_lng: number | null;
  wifi_password: string | null;
};

export default function AdminSettingsPage() {
  const supabase = createClient();
  const access = useAdminAccess();

  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBranch, setSavingBranch] = useState<string | null>(null);
  const [savedBranch, setSavedBranch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("branch_info")
      .select("branch, address, hours, map_lat, map_lng, wifi_password")
      .order("branch")
      .then(({ data }) => {
        setBranches(data ?? []);
        setLoading(false);
      });
  }, [supabase]);

  function updateField(branch: string, field: keyof BranchInfo, value: string) {
    setBranches((prev) =>
      prev.map((b) =>
        b.branch === branch
          ? { ...b, [field]: field === "map_lat" || field === "map_lng" ? (value === "" ? null : Number(value)) : value }
          : b
      )
    );
  }

  async function saveBranch(b: BranchInfo) {
    setSavingBranch(b.branch);
    setSavedBranch(null);
    setError(null);
    const { error } = await supabase
      .from("branch_info")
      .update({ address: b.address, hours: b.hours, map_lat: b.map_lat, map_lng: b.map_lng, wifi_password: b.wifi_password })
      .eq("branch", b.branch);
    setSavingBranch(null);
    if (error) {
      setError(error.message);
      return;
    }
    setSavedBranch(b.branch);
    setTimeout(() => setSavedBranch(null), 2500);
  }

  if (!access.loading && access.role !== "super_admin") {
    return (
      <div>
        <h2 className="font-serif text-2xl text-[#2D5A27]">Settings</h2>
        <p className="mt-3 text-sm text-stone-600">Only the owner account can change branch settings.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#2D5A27]">Settings</h2>
      <p className="mt-1 text-sm text-stone-600">
        Branch address, hours, and map location — shown on the public homepage and footer.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-stone-500">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {branches.map((b) => (
            <div key={b.branch} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="font-serif text-lg text-[#2D5A27]">{b.branch} Branch</h3>

              <label className="mt-4 flex flex-col gap-1.5 text-sm text-stone-700">
                Address
                <input
                  value={b.address}
                  onChange={(e) => updateField(b.branch, "address", e.target.value)}
                  className="input"
                />
              </label>

              <label className="mt-3 flex flex-col gap-1.5 text-sm text-stone-700">
                Hours
                <input
                  value={b.hours}
                  onChange={(e) => updateField(b.branch, "hours", e.target.value)}
                  className="input"
                  placeholder="10:00 AM – 12:00 MN"
                />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm text-stone-700">
                  Map latitude
                  <input
                    value={b.map_lat ?? ""}
                    onChange={(e) => updateField(b.branch, "map_lat", e.target.value)}
                    inputMode="decimal"
                    className="input"
                    placeholder="13.825266"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm text-stone-700">
                  Map longitude
                  <input
                    value={b.map_lng ?? ""}
                    onChange={(e) => updateField(b.branch, "map_lng", e.target.value)}
                    inputMode="decimal"
                    className="input"
                    placeholder="121.132656"
                  />
                </label>
              </div>
              <p className="mt-1.5 text-xs text-stone-400">
                Leave blank to fall back to a text search on the address instead of an exact pin.
              </p>

              <label className="mt-3 flex flex-col gap-1.5 text-sm text-stone-700">
                WiFi password
                <input
                  value={b.wifi_password ?? ""}
                  onChange={(e) => updateField(b.branch, "wifi_password", e.target.value)}
                  className="input"
                  placeholder="Shown at the bottom of every receipt"
                />
              </label>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => saveBranch(b)}
                  disabled={savingBranch === b.branch}
                  className="rounded-full bg-[#2D5A27] px-5 py-2 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
                >
                  {savingBranch === b.branch ? "Saving…" : "Save"}
                </button>
                {savedBranch === b.branch && <span className="text-sm text-[#2D5A27]">Saved ✓</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
