"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function useIdleLogout(timeout = 5 * 60 * 1000) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
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

    resetTimer();

    const refreshInterval = setInterval(() => {
      const activeRecently = Date.now() - lastActivityRef.current < timeout;
      if (activeRecently) {
        void fetch("/api/refresh-session", { method: "POST" });
      }
    }, 60_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(refreshInterval);
    };
  }, [timeout]);
}