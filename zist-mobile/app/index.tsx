import React from "react";
import { Redirect } from "expo-router";
import { View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { Spinner } from "@/components/ui";

/**
 * Root index route: forwards to the tabs dashboard if authenticated,
 * or the marketing welcome screen if signed out.
 */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <Spinner />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/welcome" />;
}
