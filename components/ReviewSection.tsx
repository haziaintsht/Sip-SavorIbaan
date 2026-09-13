"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import StarRatingInput from "@/components/StarRatingInput";
import CoffeeLoader from "@/components/CoffeeLoader";

type Review = {
  id: string;
  branch: "Palindan" | "Uptown" | null;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
};

const STATUS_LABEL: Record<Review["status"], string> = {
  pending: "Pending review",
  approved: "Published on our site",
  rejected: "Not published",
};

const STATUS_STYLE: Record<Review["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-[#2D5A27]/10 text-[#2D5A27]",
  rejected: "bg-stone-200 text-stone-600",
};

export default function ReviewSection({ userId, fullName }: { userId: string; fullName: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Review | null>(null);
  const [editing, setEditing] = useState(false);

  const [branch, setBranch] = useState<"Palindan" | "Uptown" | "">("");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("id, branch, rating, body, status")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setReview(data ?? null);
        if (data) {
          setBranch(data.branch ?? "");
          setRating(data.rating);
          setBody(data.body);
        }
        setLoading(false);
      });
  }, [supabase, userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (rating === 0) {
      setMessage({ type: "error", text: "Please pick a star rating." });
      return;
    }
    if (body.trim().length < 5) {
      setMessage({ type: "error", text: "Please write a bit more about your visit." });
      return;
    }

    setSaving(true);
    const payload = { branch: branch || null, rating, body: body.trim() };

    const { data, error } = review
      ? await supabase.from("reviews").update(payload).eq("id", review.id).select("id, branch, rating, body, status").single()
      : await supabase
          .from("reviews")
          .insert({ ...payload, user_id: userId, full_name: fullName })
          .select("id, branch, rating, body, status")
          .single();

    setSaving(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setReview(data);
    setEditing(false);
  }

  if (loading) {
    return (
      <section className="mt-10">
        <h2 className="font-serif text-lg text-[#2D5A27]">Leave a review</h2>
        <CoffeeLoader size={32} label={null} />
      </section>
    );
  }

  const showForm = editing || !review;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-lg text-[#2D5A27]">
        {review ? "Your review" : "Leave a review"}
      </h2>

      {!showForm && review && (
        <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[review.status]}`}>
              {STATUS_LABEL[review.status]}
            </span>
            <button onClick={() => setEditing(true)} className="text-sm font-medium text-[#2D5A27] hover:underline">
              Edit
            </button>
          </div>
          <div className="mt-3 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={16}
                className={n <= review.rating ? "fill-[#2D5A27] text-[#2D5A27]" : "fill-transparent text-stone-300"}
              />
            ))}
          </div>
          {review.branch && <p className="mt-1 text-xs text-stone-500">{review.branch} Branch</p>}
          <p className="mt-2 text-sm text-stone-700">{review.body}</p>
          {review.status === "pending" && (
            <p className="mt-3 text-xs text-stone-500">We&apos;ll publish this on our site once it&apos;s reviewed.</p>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5">
          <div>
            <p className="mb-1.5 text-sm text-stone-700">Your rating</p>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>

          <label className="flex flex-col gap-1.5 text-sm text-stone-700">
            Branch (optional)
            <select value={branch} onChange={(e) => setBranch(e.target.value as "Palindan" | "Uptown" | "")} className="input">
              <option value="">Not specific</option>
              <option value="Palindan">Palindan Branch</option>
              <option value="Uptown">Uptown Branch</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-stone-700">
            Your review
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Tell us about your visit..."
              className="input resize-none"
            />
          </label>

          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-[#2D5A27]" : "text-red-600"}`}>{message.text}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-[#2D5A27] px-6 py-3 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
            >
              {saving ? "Submitting..." : review ? "Save changes" : "Submit review"}
            </button>
            {review && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-stone-300 px-5 py-3 text-sm text-stone-600"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
