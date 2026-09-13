"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";
import CoffeeLoader from "@/components/CoffeeLoader";
import EmptyState from "@/components/EmptyState";

type ReviewRow = {
  id: string;
  full_name: string;
  branch: "Palindan" | "Uptown" | null;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Filter = "pending" | "approved" | "rejected" | "all";

export default function AdminReviewsPage() {
  const supabase = createClient();
  const access = useAdminAccess();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("id, full_name, branch, rating, body, status, created_at")
      .order("created_at", { ascending: false })
      .returns<ReviewRow[]>();
    setReviews(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (access.role !== "super_admin") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.role]);

  async function setStatus(id: string, status: ReviewRow["status"]) {
    setBusyId(id);
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    setBusyId(null);
    if (error) {
      alert(`Couldn't update review: ${error.message}`);
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  if (!access.loading && access.role !== "super_admin") {
    return (
      <div>
        <h2 className="font-serif text-2xl text-[#2D5A27]">Reviews</h2>
        <p className="mt-3 text-sm text-stone-600">Only the owner account can moderate reviews.</p>
      </div>
    );
  }

  const counts = {
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
    all: reviews.length,
  };
  const visible = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#2D5A27]">Reviews</h2>
      <p className="mt-1 text-sm text-stone-600">
        Approve a review to publish it on the landing page&apos;s testimonials.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? "chip-active" : ""}`}>
            {f[0].toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {loading ? (
          <CoffeeLoader size={48} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Star} message={`No ${filter === "all" ? "" : filter} reviews.`} />
        ) : (
          visible.map((r) => (
            <div key={r.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[#2D5A27]">{r.full_name}</p>
                  <p className="text-xs text-stone-500">
                    {r.branch ? `${r.branch} Branch · ` : ""}
                    {new Date(r.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <div className="mt-1.5 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={14}
                        className={n <= r.rating ? "fill-[#2D5A27] text-[#2D5A27]" : "fill-transparent text-stone-300"}
                      />
                    ))}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    r.status === "approved"
                      ? "bg-[#2D5A27]/10 text-[#2D5A27]"
                      : r.status === "rejected"
                      ? "bg-stone-200 text-stone-600"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {r.status[0].toUpperCase() + r.status.slice(1)}
                </span>
              </div>

              <p className="mt-3 text-sm text-stone-700">{r.body}</p>

              <div className="mt-4 flex gap-2">
                {r.status !== "approved" && (
                  <button
                    onClick={() => setStatus(r.id, "approved")}
                    disabled={busyId === r.id}
                    className="rounded-full bg-[#2D5A27] px-4 py-2 text-xs font-medium text-[#F9F6F0] disabled:opacity-60"
                  >
                    Approve
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => setStatus(r.id, "rejected")}
                    disabled={busyId === r.id}
                    className="rounded-full border border-stone-300 px-4 py-2 text-xs text-stone-600 disabled:opacity-60"
                  >
                    {r.status === "approved" ? "Unpublish" : "Reject"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
