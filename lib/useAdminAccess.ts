"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AdminAccess = {
  loading: boolean;
  role: "admin" | "super_admin" | null;
  /** null for super_admin (sees both branches) or while loading */
  branch: "Palindan" | "Uptown" | null;
  /** true once we know this admin is locked to a single branch */
  isBranchLocked: boolean;
};

// Cashiers (role "admin") are locked to the branch on their profile;
// the owner (role "super_admin") sees both branches. Pages that show
// branch-specific data use this to hide the branch switcher and force
// the locked branch instead of trusting a client-side default/URL param.
export function useAdminAccess(): AdminAccess {
  const supabase = createClient();
  const [state, setState] = useState<AdminAccess>({
    loading: true,
    role: null,
    branch: null,
    isBranchLocked: false,
  });

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, branch")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      const role = (profile?.role as "admin" | "super_admin" | undefined) ?? null;
      const branch = (profile?.branch as "Palindan" | "Uptown" | null | undefined) ?? null;
      setState({
        loading: false,
        role,
        branch,
        isBranchLocked: role === "admin" && branch !== null,
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
