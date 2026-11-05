import React from "react";
import { ImageBackground, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/theme";
import { Text } from "@/components/ui";

export interface SummaryImageCardProps {
  label: string;
  title: string;
  subtitle: string;
  image: string;
  onPress: () => void;
}

/**
 * Wide photo tile with a dark scrim — the mobile port of the web Dashboard's
 * `SummaryImageCard` (Last Opened / Last Concept / Continue Quiz).
 */
export function SummaryImageCard({
  label,
  title,
  subtitle,
  image,
  onPress,
}: SummaryImageCardProps) {
  const { radius, shadow } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 150,
        borderRadius: radius["2xl"],
        overflow: "hidden",
        ...shadow("md"),
      }}
    >
      <ImageBackground
        source={{ uri: image }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.82)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.18)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          flex: 1,
          padding: 16,
          justifyContent: "flex-end",
          gap: 2,
        }}
      >
        <Text
          variant="caption"
          tint="rgba(255,255,255,0.75)"
          uppercase
          weight="medium"
          letterSpacing={1.4}
        >
          {label}
        </Text>
        <Text variant="h4" tint="#ffffff" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tint="rgba(255,255,255,0.78)" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
