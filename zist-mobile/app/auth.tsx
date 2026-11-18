import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { Spinner, Text, useToast } from "@/components/ui";

function firstString(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
    return value[0].trim();
  }
  return null;
}

/**
 * OAuth deep-link landing route (`zist://auth?access_token=...` or
 * `exp://.../--/auth?access_token=...`).
 *
 * When Google sign-in redirects back to the native app, Expo Router resolves
 * the deep link to `/auth`. Without this route it fell through to `+not-found`.
 */
export default function AuthCallbackRoute() {
  const params = useLocalSearchParams<{
    access_token?: string | string[];
    error?: string | string[];
  }>();
  const incomingUrl = Linking.useURL();
  const { isAuthenticated, isLoading, completeTokenLogin } = useAuth();
  const { colors } = useTheme();
  const { toast } = useToast();
  const router = useRouter();

  const handledTokenRef = useRef<string | null>(null);
  const wasAuthenticatedRef = useRef(isAuthenticated);

  let accessToken = firstString(params.access_token);
  let errorParam = firstString(params.error);

  if ((!accessToken || !errorParam) && incomingUrl) {
    const parsed = Linking.parse(incomingUrl);
    const qp = parsed.queryParams ?? {};
    if (!accessToken && typeof qp.access_token === "string" && qp.access_token.trim()) {
      accessToken = qp.access_token.trim();
    }
    if (!errorParam && typeof qp.error === "string" && qp.error.trim()) {
      errorParam = qp.error.trim();
    }
  }

  useEffect(() => {
    if (errorParam) {
      toast({
        title: "Google sign-in failed",
        description: errorParam,
        variant: "destructive",
      });
      router.replace("/login");
      return;
    }

    if (accessToken) {
      if (handledTokenRef.current === accessToken) return;
      handledTokenRef.current = accessToken;

      let active = true;
      (async () => {
        try {
          await completeTokenLogin(accessToken);
          if (!active) return;
          if (!wasAuthenticatedRef.current) {
            toast({
              title: "Welcome back!",
              description: "You have successfully logged in.",
            });
          }
          router.replace("/");
        } catch (err) {
          if (!active) return;
          toast({
            title: "Sign-in failed",
            description: err instanceof Error ? err.message : "Could not complete Google sign-in.",
            variant: "destructive",
          });
          router.replace("/login");
        }
      })();

      return () => {
        active = false;
      };
    }

    if (!isLoading) {
      router.replace(isAuthenticated ? "/" : "/login");
    }
  }, [accessToken, errorParam, isAuthenticated, isLoading, completeTokenLogin, router, toast]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor: colors.background,
      }}
    >
      <Spinner />
      <Text variant="muted">Signing you in…</Text>
    </View>
  );
}
