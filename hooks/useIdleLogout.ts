"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function useIdleLogout(timeout = 15 * 60 * 1000) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  const bestEffortLogoutOnClose = () => {
    try {
      const blob = new Blob([], { type: "application/octet-stream" });
      navigator.sendBeacon("/api/logout/beacon", blob);
    } catch {
      fetch("/api/logout/beacon", {
        method: "POST",
        keepalive: true,
      }).catch(() => {});
    }
  };

  const resetTimer = () => {
    lastActivityRef.current = Date.now();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void logout();
    }, timeout);
  };

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    window.addEventListener("pagehide", bestEffortLogoutOnClose);

    resetTimer();

    const refreshInterval = setInterval(async () => {
      const activeRecently = Date.now() - lastActivityRef.current < timeout;

      if (!activeRecently) {
        return;
      }

      const res = await fetch("/api/refresh-session", { method: "POST" });

      if (!res.ok) {
        await logout();
      }
    }, 60_000);

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );

      window.removeEventListener("pagehide", bestEffortLogoutOnClose);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      clearInterval(refreshInterval);
    };
  }, [timeout, router]);
}