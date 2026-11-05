import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider, useTheme } from "@/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { ToastProvider } from "@/components/ui";
import { BootScreen } from "@/components/layout/BootScreen";
import { useAppFonts } from "@/lib/fonts";
import { hydrateStorage } from "@/lib/webStorage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Keeps the light/dark status bar readable and gives the whole tree a themed
 * backdrop (avoids white flashes behind transparent screens).
 */
function ThemedStack() {
  const { colors, theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        {/* Signed-out home (the web's marketing landing page). */}
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    // The token/api layer reads synchronously from an in-memory mirror, so the
    // mirror must be populated before any provider mounts and fires a request.
    hydrateStorage().finally(() => setStorageReady(true));
  }, []);

  if (!storageReady || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <BootScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationsProvider>
              <ToastProvider>
                <ThemedStack />
              </ToastProvider>
            </NotificationsProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
