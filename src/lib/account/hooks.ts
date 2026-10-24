"use client";

import { useMutation } from "@tanstack/react-query";
import { api, call } from "@/lib/api";

/**
 * `GET /v1/account/export`. A mutation, not a query: the answer holds personal data, so it is
 * never cached, shared between screens or fetched again by itself.
 */
export function useExportData() {
  return useMutation({
    mutationFn: () => call(api.GET("/v1/account/export")),
    gcTime: 0,
  });
}

/** `DELETE /v1/account` (204). The caller then ends the session. */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => call(api.DELETE("/v1/account")),
  });
}
