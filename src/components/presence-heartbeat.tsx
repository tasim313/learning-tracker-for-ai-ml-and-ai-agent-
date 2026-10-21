"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const heartbeatMs = 30_000;
const interactionTimeoutMs = 60_000;
const learningRoutes = ["/courses", "/topics", "/videos", "/math-lab", "/diagrams", "/games", "/flashcards", "/active-exam", "/practical-exam"];

export function PresenceHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    let lastInteractionAt = Date.now();
    let sending = false;
    let disposed = false;
    const markInteraction = () => { lastInteractionAt = Date.now(); };
    const interactionEvents = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    interactionEvents.forEach((event) => window.addEventListener(event, markInteraction, { passive: true }));

    async function sendHeartbeat() {
      if (sending || disposed) return;
      sending = true;
      const learningRoute = learningRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
      const learningActive = learningRoute
        && document.visibilityState === "visible"
        && document.hasFocus()
        && Date.now() - lastInteractionAt <= interactionTimeoutMs;
      try {
        await fetch("/api/auth/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: crypto.randomUUID(),
            learningActive,
            activity: learningActive ? pathname : ""
          }),
          cache: "no-store",
          keepalive: true
        });
      } finally {
        sending = false;
      }
    }

    void sendHeartbeat();
    const interval = window.setInterval(() => { void sendHeartbeat(); }, heartbeatMs);
    const visibility = () => { if (document.visibilityState === "visible") void sendHeartbeat(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("focus", visibility);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("focus", visibility);
      interactionEvents.forEach((event) => window.removeEventListener(event, markInteraction));
    };
  }, [pathname]);

  return null;
}
