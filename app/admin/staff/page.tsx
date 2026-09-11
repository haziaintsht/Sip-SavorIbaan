"use client";

import { useEffect, useState } from "react";
import { useAdminAccess } from "@/lib/useAdminAccess";
import { UserPlus, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import CoffeeLoader from "@/components/CoffeeLoader";

type StaffRow = {
  id: string;
  full_name: string;
  phone_number: string | null;
  role: "admin" | "super_admin";
  branch: "Palindan" | "Uptown" | null;
  created_at: string;
  email: string | null;
  banned: boolean;
};

export default function AdminStaffPage() {
  const access = useAdminAccess();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", branch: "Palindan" as "Palindan" | "Uptown" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadStaff() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/staff");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Couldn't load staff.");
      setLoading(false);
      return;
    }
    setStaff(json.staff);
    setLoading(false);
  }

  useEffect(() => {
    if (access.role === "super_admin") loadStaff();
  }, [access.role]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setFormError(json.error ?? "Couldn't create account.");
      return;
    }
    setShowForm(false);
    setForm({ full_name: "", email: "", password: "", branch: "Palindan" });
    loadStaff();
  }

  async function updateBranch(id: string, branch: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch }),
    });
    setBusyId(null);
    if (!res.ok) {
      const json = await res.json();
      alert(json.error ?? "Couldn't update branch.");
      return;
    }
    loadStaff();
  }

  async function toggleBanned(row: StaffRow) {
    const action = row.banned ? "reactivate" : "deactivate";
    if (!confirm(`${action === "deactivate" ? "Deactivate" : "Reactivate"} ${row.full_name}'s account?`)) return;
    setBusyId(row.id);
    const res = await fetch(`/api/admin/staff/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !row.banned }),
    });
    setBusyId(null);
    if (!res.ok) {
      const json = await res.json();
      alert(json.error ?? `Couldn't ${action} account.`);
      return;
    }
    loadStaff();
  }

  async function submitPasswordReset(id: string) {
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    setBusyId(id);
    const res = await fetch(`/api/admin/staff/${id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setBusyId(null);
    if (!res.ok) {
      const json = await res.json();
      alert(json.error ?? "Couldn't reset password.");
      return;
    }
    setResetPasswordFor(null);
    setNewPassword("");
    alert("Password updated.");
  }

  if (!access.loading && access.role !== "super_admin") {
    return (
      <div>
        <h2 className="font-serif text-2xl text-[#2D5A27]">Staff</h2>
        <p className="mt-3 text-sm text-stone-600">Only the owner account can manage staff.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-[#2D5A27]">Staff</h2>
          <p className="mt-1 text-sm text-stone-600">Cashier accounts, one per branch assignment.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-[#2D5A27] px-4 py-2 text-sm font-medium text-[#F9F6F0]"
        >
          <UserPlus size={16} />
          Add Staff
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-5 grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-stone-700">
            Full name
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-stone-700">
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-stone-700">
            Temporary password
            <input
              required
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="input"
              placeholder="At least 8 characters"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-stone-700">
            Branch
            <select
              value={form.branch}
              onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value as "Palindan" | "Uptown" }))}
              className="input"
            >
              <option value="Palindan">Palindan</option>
              <option value="Uptown">Uptown</option>
            </select>
          </label>

          {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}

          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#2D5A27] px-5 py-2 text-sm font-medium text-[#F9F6F0] disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create Account"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <CoffeeLoader size={56} />
        ) : (
          staff.map((s) => (
            <div key={s.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${s.banned ? "border-red-200 opacity-70" : "border-stone-200"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-900">
                    {s.full_name}
                    {s.role === "super_admin" && (
                      <span className="ml-2 rounded-full bg-[#2D5A27]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2D5A27]">
                        Owner
                      </span>
                    )}
                    {s.banned && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                        Deactivated
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-stone-500">{s.email ?? "—"}</p>
                </div>

                {s.role === "admin" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={s.branch ?? ""}
                      onChange={(e) => updateBranch(s.id, e.target.value)}
                      disabled={busyId === s.id}
                      className="input py-1.5 text-xs"
                    >
                      <option value="Palindan">Palindan</option>
                      <option value="Uptown">Uptown</option>
                    </select>

                    <button
                      onClick={() => {
                        setResetPasswordFor(resetPasswordFor === s.id ? null : s.id);
                        setNewPassword("");
                      }}
                      className="flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:border-[#2D5A27] hover:text-[#2D5A27]"
                    >
                      <KeyRound size={13} />
                      Reset password
                    </button>

                    <button
                      onClick={() => toggleBanned(s)}
                      disabled={busyId === s.id}
                      className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs disabled:opacity-50 ${
                        s.banned
                          ? "border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27]/5"
                          : "border-red-300 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      {s.banned ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                      {s.banned ? "Reactivate" : "Deactivate"}
                    </button>
                  </div>
                )}
              </div>

              {resetPasswordFor === s.id && (
                <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-3">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (8+ characters)"
                    className="input flex-1 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => submitPasswordReset(s.id)}
                    disabled={busyId === s.id}
                    className="rounded-full bg-[#2D5A27] px-4 py-1.5 text-xs font-medium text-[#F9F6F0] disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {!loading && staff.length === 0 && !error && (
          <p className="text-sm text-stone-500">No staff accounts yet.</p>
        )}
      </div>
    </div>
  );
}
