import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BookOpen,
  Brain,
  LayoutDashboard,
  Library,
  LineChart,
  Rss,
} from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppHeader } from "@/components/layout/AppHeader";
import { Text } from "@/components/ui";

type IconProps = { color: string; focused: boolean };

/** Navigation hands us a ColorValue; our Text primitive needs a string. */
const tint = (color: unknown): string => (typeof color === "string" ? color : "#64748b");

function TabIcon({
  icon: Icon,
  label,
  focused,
  color,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={{ alignItems: "center", gap: 3, paddingTop: 6 }}>
      <Icon size={20} color={color} strokeWidth={focused ? 2.4 : 2} />
      <Text variant="caption" tint={color} style={{ fontSize: 10, lineHeight: 12 }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Bottom tab bar mirroring the web app's mobile navigation
 * (Home · Feed · Library · Quiz · Vocab · Insights).
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // The bar floats above the home indicator on notched phones and above the
  // three-button navigation bar on Android. Without the inset, the labels end
  // up underneath the system gesture area.
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 4,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon={LayoutDashboard} label="Home" focused={focused} color={tint(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon={Rss} label="Feed" focused={focused} color={tint(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon={Library} label="Library" focused={focused} color={tint(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: "Quiz",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon={Brain} label="Quiz" focused={focused} color={tint(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: "Vocab",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon={BookOpen} label="Vocab" focused={focused} color={tint(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon={LineChart} label="Insights" focused={focused} color={tint(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
