import React from "react";
import { View } from "react-native";
import { Play, Trophy } from "lucide-react-native";

import { useTheme } from "@/theme";
import type { MediaItem } from "@/types";
import { Button, Card, Text } from "@/components/ui";
import { MediaPoster } from "@/components/media/MediaCard";

function ScorePill({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        gap: 2,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: radius.md,
        backgroundColor: colors.muted,
      }}
    >
      <Text variant="caption">{label}</Text>
      <Text
        variant="label"
        weight="semibold"
        tint={value == null ? colors.mutedForeground : colors.foreground}
      >
        {value == null ? "—" : `${value}%`}
      </Text>
    </View>
  );
}

/**
 * Per-media quiz tile for the hub: poster, the number of questions the media
 * can generate, best/last scores from local attempts, and a start action.
 */
export function QuizHubCard({
  media,
  questionCount,
  bestScore,
  lastScore,
  onStart,
  style,
}: {
  media: MediaItem;
  questionCount: number;
  bestScore: number | null;
  lastScore: number | null;
  onStart: () => void;
  style?: import("react-native").ViewStyle;
}) {
  const { colors } = useTheme();
  const hasQuestions = questionCount > 0;

  return (
    <Card variant="glass" style={[{ gap: 12 }, ...(style ? [style] : [])]}>
      <MediaPoster
        coverUrl={media.coverUrl}
        type={media.type}
        title={media.title}
        height={140}
      />

      <View style={{ gap: 4 }}>
        <Text variant="label" weight="semibold" numberOfLines={2}>
          {media.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Trophy size={13} color={colors.mutedForeground} />
          <Text variant="caption">
            {hasQuestions
              ? `${questionCount} question${questionCount === 1 ? "" : "s"} available`
              : "No questions yet"}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <ScorePill label="Best" value={bestScore} />
        <ScorePill label="Last" value={lastScore} />
      </View>

      <Button
        size="sm"
        fullWidth
        label="Start quiz"
        disabled={!hasQuestions}
        icon={<Play size={14} color={colors.primaryForeground} />}
        onPress={onStart}
      />
    </Card>
  );
}
