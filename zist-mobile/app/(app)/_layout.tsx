import React from "react";
import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { Spinner } from "@/components/ui";
import { View } from "react-native";

/**
 * Protected area of the app — the native equivalent of the web
 * `<ProtectedRoute />` wrapper around every `/app/*` route.
 */
export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add" options={{ header: () => <AppHeader title="Add media" showBack /> }} />
      <Stack.Screen name="friends" options={{ header: () => <AppHeader title="Friends" showBack /> }} />
      <Stack.Screen name="profile" options={{ header: () => <AppHeader title="Profile" showBack /> }} />
      <Stack.Screen name="profile-edit" options={{ header: () => <AppHeader title="Edit profile" showBack /> }} />
      <Stack.Screen name="media/[id]" />
      <Stack.Screen name="quiz/[mediaId]" />
      <Stack.Screen name="user/[userId]" />
    </Stack>
  );
}
