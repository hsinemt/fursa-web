"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ICON_SM, iconProps } from "./icon";

/** How long a message stays on screen. */
export const TOAST_MS = 6000;

type ToastApi = { show: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** Like useToast, but null outside a ToastProvider (for parts that also render on public pages). */
export function useOptionalToast(): ToastApi | null {
  return useContext(ToastContext);
}

/** `const toast = useToast(); toast.show(t("saved"))`. One line, no exclamation mark. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast needs a ToastProvider above it.");
  return api;
}

type Entry = { id: number; message: string };

/** Messages at the bottom, centered, announced politely. Each leaves after 6 seconds. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("toast");
  const [entries, setEntries] = useState<Entry[]>([]);
  const next = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setEntries((list) => list.filter((entry) => entry.id !== id));
  }, []);

  const show = useCallback(
    (message: string) => {
      const id = (next.current += 1);
      setEntries((list) => [...list.slice(-2), { id, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 sm:bottom-6"
      >
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-panel border border-line bg-panel py-2 ps-4 pe-2 text-base text-ink shadow-menu"
          >
            <span>{entry.message}</span>
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => dismiss(entry.id)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-control text-slate hover:bg-tint hover:text-ink pointer-coarse:size-11"
            >
              <X width={ICON_SM} height={ICON_SM} {...iconProps} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
