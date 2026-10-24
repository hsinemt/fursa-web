"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, call } from "@/lib/api";
import { keys } from "@/lib/profile/hooks";

/** `POST /v1/notifications/telegram/link`: a one-time `t.me` link that expires in 15 minutes. */
export function useLinkTelegram() {
  return useMutation({
    mutationFn: () => call(api.POST("/v1/notifications/telegram/link")),
  });
}

/** `DELETE /v1/notifications/telegram`: its answer is the new preferences. */
export function useUnlinkTelegram() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => call(api.DELETE("/v1/notifications/telegram")),
    onSuccess: (preferences) => client.setQueryData(keys.preferences, preferences),
  });
}
