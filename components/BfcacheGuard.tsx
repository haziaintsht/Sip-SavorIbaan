"use client";

import { useEffect } from "react";

// After logging out, pressing the browser's back button can restore the
// previous page straight from bfcache — the DOM as it looked while still
// logged in — without re-running middleware or re-checking the session.
// Forcing a reload when a page is restored this way guarantees auth state
// (and the nav/admin gate) is always freshly checked, never stale.
//
// The reload itself isn't instant — there's a real network round-trip
// before the fresh page paints — so the stale, still-logged-in-looking DOM
// would otherwise be visible on screen for that entire gap. Blanking the
// page synchronously, in the same tick the restore is detected, closes
// that window: nothing stale ever gets a chance to paint.
export default function BfcacheGuard() {
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        document.documentElement.style.visibility = "hidden";
        window.location.reload();
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
