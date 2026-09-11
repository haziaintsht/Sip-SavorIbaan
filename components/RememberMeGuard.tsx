"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { shouldForceSignOut, clearRememberPreference } from "@/lib/rememberMe";

export default function RememberMeGuard() {
  useEffect(() => {
    if (!shouldForceSignOut()) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      clearRememberPreference();
      supabase.auth.signOut().then(() => {
        window.location.href = "/login";
      });
    });
  }, []);

  return null;
}
