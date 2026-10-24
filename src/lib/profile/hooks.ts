"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, call } from "@/lib/api";
import type { components } from "@/lib/api";
import type { ProfileUpdate } from "./values";

export type Preferences = components["schemas"]["PreferencesResponse"];
export type PreferencesUpdate = components["schemas"]["PreferencesUpdate"];

export const keys = {
  profile: ["profile"] as const,
  preferences: ["preferences"] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: keys.profile,
    queryFn: () => call(api.GET("/v1/profile")),
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => call(api.PATCH("/v1/profile", { body: patch })),
    onSuccess: (profile) => client.setQueryData(keys.profile, profile),
  });
}

/** `poll`: ask again every 3 seconds (used while waiting for Telegram to be linked). */
export function usePreferences({ poll = false }: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: keys.preferences,
    queryFn: () => call(api.GET("/v1/notifications/preferences")),
    refetchInterval: poll ? 3000 : false,
  });
}

export function useUpdatePreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<PreferencesUpdate>) =>
      call(api.PATCH("/v1/notifications/preferences", { body: patch as PreferencesUpdate })),
    onSuccess: (preferences) => client.setQueryData(keys.preferences, preferences),
  });
}
