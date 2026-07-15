import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";

import { useAuth } from "../../AuthContext";
import api from "../../services/api";

const DEFAULT_IDLE_WARNING_MS = 15 * 60 * 1000;
const DEFAULT_COUNTDOWN_MS = 60 * 1000;
const KEEPALIVE_INTERVAL_MS = 5 * 60 * 1000;

const readPositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "mousedown",
  "scroll",
  "touchstart",
  "pointerdown",
] as const;

export default function InactivityTimeout() {
  const { user, logout } = useAuth();
  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const warningTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const lastKeepAliveRef = useRef(0);
  const loggingOutRef = useRef(false);
  const warningOpenRef = useRef(false);

  const warningMs = useMemo(
    () => readPositiveNumber(import.meta.env.VITE_IDLE_WARNING_MS, DEFAULT_IDLE_WARNING_MS),
    [],
  );

  const countdownMs = useMemo(
    () => readPositiveNumber(import.meta.env.VITE_IDLE_COUNTDOWN_MS, DEFAULT_COUNTDOWN_MS),
    [],
  );

  const clearTimer = (timerRef: MutableRefObject<number | null>) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearIntervalTimer = (timerRef: MutableRefObject<number | null>) => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearAllTimers = useCallback(() => {
    clearTimer(warningTimerRef);
    clearTimer(logoutTimerRef);
    clearIntervalTimer(countdownTimerRef);
  }, []);

  const performLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    clearAllTimers();
    setWarningOpen(false);
    await logout();
  }, [clearAllTimers, logout]);

  const startWarningCountdown = useCallback(() => {
    setWarningOpen(true);
    warningOpenRef.current = true;
    setRemainingSeconds(Math.ceil(countdownMs / 1000));

    clearTimer(logoutTimerRef);
    clearIntervalTimer(countdownTimerRef);

    const startedAt = Date.now();
    countdownTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRemainingSeconds(Math.max(0, Math.ceil((countdownMs - elapsed) / 1000)));
    }, 1000);

    logoutTimerRef.current = window.setTimeout(() => {
      void performLogout();
    }, countdownMs);
  }, [countdownMs, performLogout]);

  const resetIdleTimer = useCallback(() => {
    if (!user || warningOpenRef.current || loggingOutRef.current) return;

    const now = Date.now();
    if (now - lastKeepAliveRef.current > KEEPALIVE_INTERVAL_MS) {
      lastKeepAliveRef.current = now;
      void api.get("/erp/refresh", {
        headers: { "Cache-Control": "no-cache" },
      }).catch(() => {
        // El interceptor global se encarga de limpiar la sesion si el backend responde 401.
      });
    }

    clearTimer(warningTimerRef);
    warningTimerRef.current = window.setTimeout(() => {
      startWarningCountdown();
    }, warningMs);
  }, [startWarningCountdown, user, warningMs]);

  const continueWorking = async () => {
    try {
      await api.get("/erp/refresh", {
        headers: { "Cache-Control": "no-cache" },
      });
      lastKeepAliveRef.current = Date.now();
    } catch {
      await performLogout();
      return;
    }

    warningOpenRef.current = false;
    setWarningOpen(false);
    clearTimer(logoutTimerRef);
    clearIntervalTimer(countdownTimerRef);
    resetIdleTimer();
  };

  useEffect(() => {
    warningOpenRef.current = warningOpen;
  }, [warningOpen]);

  useEffect(() => {
    if (!user) {
      clearAllTimers();
      setWarningOpen(false);
      warningOpenRef.current = false;
      loggingOutRef.current = false;
      return;
    }

    resetIdleTimer();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
      clearAllTimers();
    };
  }, [clearAllTimers, resetIdleTimer, user]);

  if (!user || !warningOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Sesion inactiva
          </p>
          <h2 className="text-2xl font-bold text-slate-900">Sigues alli?</h2>
          <p className="text-sm leading-6 text-slate-600">
            Por seguridad cerraremos tu sesion si no confirmas que sigues trabajando.
          </p>
        </div>

        <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Cierre automatico en {remainingSeconds} segundos.
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void performLogout()}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cerrar sesion
          </button>
          <button
            type="button"
            onClick={() => void continueWorking()}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            Continuar trabajando
          </button>
        </div>
      </div>
    </div>
  );
}
