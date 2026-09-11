"use client";

import { useEffect } from "react";

// After logging out, pressing the browser's back button can restore the
// previous page straight from bfcache — the DOM as it looked while still
// logged in — without re-running middleware or re-checking the session.
// Forcing a reload when a page is restored this way guarantees auth state
// (and the nav/admin gate) is always freshly checked, never stale.
export default function BfcacheGuard() {
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        window.location.reload();
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
