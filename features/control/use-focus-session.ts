import { useAccountValue } from '../../hooks/useAccountValue';
import { useCallback, useEffect, useRef, useState } from "react";

import { clampMinutes } from "./model";

interface FocusSession {
  kind: "focus" | "rest";
  endsAt: number;
  durationMinutes: number;
}

export function useFocusSession(onFocusComplete?: () => void) {
  const { value: session, save: setSession, saveAsync, error, retry } = useAccountValue<FocusSession | null>("control-session", null);
  const [now, setNow] = useState(Date.now);
  const onFocusCompleteRef = useRef(onFocusComplete);
  onFocusCompleteRef.current = onFocusComplete;

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (nextNow >= session.endsAt) {
        clearInterval(timer);
        void saveAsync(null).then(() => { if (session.kind === "focus") onFocusCompleteRef.current?.(); }).catch(() => undefined);
      }
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session, saveAsync]);

  const startSession = useCallback((duration: string | number) => {
    const safeDuration = clampMinutes(duration, 1, 480);
    const started = Date.now();
    setNow(started);
    setSession({
      kind: "focus",
      durationMinutes: safeDuration,
      endsAt: started + safeDuration * 60_000,
    });
  }, [setSession]);

  const startRestSession = useCallback((duration: string | number) => {
    const safeDuration = clampMinutes(duration, 1, 120);
    const started = Date.now();
    setNow(started);
    setSession({
      kind: "rest",
      durationMinutes: safeDuration,
      endsAt: started + safeDuration * 60_000,
    });
  }, [setSession]);

  const endSession = useCallback(() => setSession(null), [setSession]);
  const remainingSeconds = session
    ? Math.max(0, Math.ceil((session.endsAt - now) / 1000))
    : 0;

  return {
    session, error, retry,
    now,
    remainingSeconds,
    startSession,
    startRestSession,
    endSession,
  } as const;
}
