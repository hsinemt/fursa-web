"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";

/** A failed call is retried once, and only when the server or the network was at fault. */
export function shouldRetry(count: number, error: unknown): boolean {
  if (count >= 1) return false;
  return !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
}

/** What the signed-in screens share: the data cache (TanStack Query) and the toasts. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: shouldRetry },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
