import React, { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, LogOut, Moon, Sun, User as UserIcon, Users } from "lucide-react-native";

import { useTheme } from "@/theme";
import { useAuth } from "@/contexts/AuthContext";
import { ActionSheet, Avatar, IconButton, Text } from "@/components/ui";
import { NotificationsBell } from "./NotificationsBell";

export interface AppHeaderProps {
  /** Screen title; omit on the root chrome to show the Zist wordmark. */
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  /** Render the bell + avatar cluster (defaults to the root chrome). */
  showChrome?: boolean;
  right?: React.ReactNode;
}

/**
 * Top navigation bar. Mirrors the web `AppLayout` header: logo/wordmark on the
 * left, theme toggle + notifications + user menu on the right.
 */
export function AppHeader({
  title,
  subtitle,
  showBack,
  showChrome = !title,
  right,
}: AppHeaderProps) {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  const isRoot = !title;

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.background,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
        }}
      >
        {showBack ? (
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginLeft: -4 }}>
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        ) : null}

        {isRoot ? (
          <Pressable
            onPress={() => router.push("/")}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <Image
              source={require("@/../assets/brand/zist-logo.png")}
              style={{ height: 34, width: 34, borderRadius: 10 }}
              resizeMode="contain"
            />
            <Text variant="h3" weight="semibold">
              Zist
            </Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1, marginLeft: 2 }}>
            <Text variant="h4" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}

        {isRoot ? <View style={{ flex: 1 }} /> : null}

        {right}

        {showChrome ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <IconButton
              onPress={toggleTheme}
              accessibilityLabel={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? (
                <Moon size={20} color={colors.mutedForeground} />
              ) : (
                <Sun size={20} color={colors.mutedForeground} />
              )}
            </IconButton>

            <NotificationsBell />

            <Pressable onPress={() => setMenuOpen(true)} hitSlop={6} style={{ marginLeft: 4 }}>
              <Avatar
                name={user?.displayName}
                avatarUrl={user?.avatar}
                size="sm"
                clickable={false}
              />
            </Pressable>
          </View>
        ) : null}
      </View>

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={user?.displayName}
        actions={[
          {
            label: "Profile",
            icon: <UserIcon size={18} color={colors.foreground} />,
            onPress: () => router.push("/profile"),
          },
          {
            label: "Friends",
            icon: <Users size={18} color={colors.foreground} />,
            onPress: () => router.push("/friends"),
          },
          {
            label: "Log out",
            destructive: true,
            icon: <LogOut size={18} color={colors.destructive} />,
            onPress: async () => {
              await logout();
              router.replace("/login");
            },
          },
        ]}
      />
    </View>
  );
}

/** In-content page title block used by dashboard-style screens. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="h2">{title}</Text>
        {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}
