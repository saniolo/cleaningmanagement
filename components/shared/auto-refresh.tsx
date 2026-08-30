"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Neither the employee dashboard nor the admin pages have a live-push
// channel — a Server Action only invalidates the Next.js cache, it doesn't
// reach a tab that's already open and idle (e.g. an admin on /admin/planning
// while an employee accepts an activity from their phone). This re-fetches
// the current page's data (1) whenever the tab regains focus/visibility, so
// coming back to it shows the change without a manual reload, and (2) every
// 60s while it stays visible, so a change made elsewhere while this page is
// actively on screen still shows up on its own.
const POLL_INTERVAL_MS = 60_000;

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
