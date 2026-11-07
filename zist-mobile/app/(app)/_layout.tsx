import React from "react";
import { Redirect, Stack } from "expo-router";
import { View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { Spinner } from "@/components/ui";

/**
 * Protected area of the app — the native equivalent of the web
 * `<ProtectedRoute />` wrapper around every `/app/*` route.
 */
export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Spinner />
      </View>
    );
  }

  if (!isAuthenticated) {
    // Signed out, every protected route lands on the marketing page — the
    // native equivalent of the web's public "/" (Landing) being the entry point.
    return <Redirect href="/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add" />
      <Stack.Screen name="friends" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="profile-edit" />
      <Stack.Screen name="media/[id]" />
      <Stack.Screen name="quiz/[mediaId]" />
      <Stack.Screen name="user/[userId]" />
    </Stack>
  );
}
