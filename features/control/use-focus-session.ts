import { useCallback, useEffect, useState } from "react";

import { clampMinutes } from "./model";

interface FocusSession {
  endsAt: number;
  durationMinutes: number;
}

export function useFocusSession() {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (nextNow >= session.endsAt) setSession(null);
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session]);

  const startSession = useCallback((duration: string | number) => {
    const safeDuration = clampMinutes(duration, 1, 480);
    const started = Date.now();
    setNow(started);
    setSession({
      durationMinutes: safeDuration,
      endsAt: started + safeDuration * 60_000,
    });
  }, []);

  const endSession = useCallback(() => setSession(null), []);
  const remainingSeconds = session
    ? Math.max(0, Math.ceil((session.endsAt - now) / 1000))
    : 0;

  return {
    session,
    now,
    remainingSeconds,
    startSession,
    endSession,
  } as const;
}
