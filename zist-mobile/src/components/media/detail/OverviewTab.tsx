import React from "react";
import { View } from "react-native";
import {
  BookOpen,
  Brain,
  Info,
  Lightbulb,
  Plus,
  Quote,
} from "lucide-react-native";

import { useTheme } from "@/theme";
import { Button, Text } from "@/components/ui";
import type { MediaItem, MediaStats, QuoteItem, ThemeConcept, VocabItem } from "@/types";
import { DetailSection, ProgressBar, StatCard, TagRow } from "./primitives";
import type { DetailTab } from "./types";

/** Overview tab — learning snapshot, progress and quick-add shortcuts. */
export function OverviewTab({
  media,
  stats,
  themes,
  facts,
  vocab,
  quotes,
  onQuickAdd,
}: {
  media: MediaItem;
  stats: MediaStats | null;
  themes: ThemeConcept[];
  facts: number;
  vocab: VocabItem[];
  quotes: QuoteItem[];
  onQuickAdd: (tab: DetailTab) => void;
}) {
  const { colors } = useTheme();

  const topThemes = themes.slice(0, 3);
  const recentVocab = vocab.slice(0, 3);
  const latestQuote = quotes[0];
  const learnedCount = vocab.filter((v) => v.isLearned).length;
  const bookmarkedCount = quotes.filter((q) => q.isBookmarked).length;

  const quickAdds: { label: string; tab: DetailTab }[] = [
    { label: "Theme", tab: "themes" },
    { label: "Word", tab: "vocab" },
    { label: "Quote", tab: "quotes" },
    { label: "Fact", tab: "facts" },
  ];

  return (
    <View style={{ gap: 16 }}>
      {/* Stat cards */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <StatCard
          icon={<Lightbulb size={20} color="#fbbf24" />}
          label="Themes"
          value={stats?.themes ?? themes.length}
        />
        <StatCard
          icon={<Info size={20} color="#38bdf8" />}
          label="Facts"
          value={stats?.facts ?? facts}
        />
        <StatCard
          icon={<BookOpen size={20} color="#34d399" />}
          label="Vocabulary"
          value={stats?.vocab ?? vocab.length}
        />
        <StatCard
          icon={<Quote size={20} color="#a78bfa" />}
          label="Quotes"
          value={stats?.quotes ?? quotes.length}
        />
        <StatCard
          icon={<Brain size={20} color={colors.primary} />}
          label="Quizzes"
          value={stats?.quizzes ?? 0}
        />
      </View>

      {/* Notes / description */}
      <DetailSection title="Notes & Description">
        {media.description ? (
          <Text variant="small">{media.description}</Text>
        ) : (
          <Text variant="small" color="mutedForeground" style={{ fontStyle: "italic" }}>
            No description or notes added yet.
          </Text>
        )}
        <TagRow tags={media.tags} />
      </DetailSection>

      {/* Quick add */}
      <DetailSection title="Quick Add">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {quickAdds.map((item) => (
            <Button
              key={item.tab}
              size="sm"
              variant="outline"
              icon={<Plus size={16} color={colors.foreground} />}
              label={item.label}
              onPress={() => onQuickAdd(item.tab)}
            />
          ))}
        </View>
      </DetailSection>

      {/* Learning Snapshot */}
      <DetailSection title="Learning Snapshot">
        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text variant="label" color="mutedForeground">
              Top Themes
            </Text>
            {topThemes.length > 0 ? (
              topThemes.map((theme) => (
                <Text key={theme.id} variant="small" numberOfLines={1}>
                  {theme.title}
                </Text>
              ))
            ) : (
              <Text variant="small" color="mutedForeground" style={{ fontStyle: "italic" }}>
                No themes yet
              </Text>
            )}
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="label" color="mutedForeground">
              Recent Vocabulary
            </Text>
            {recentVocab.length > 0 ? (
              recentVocab.map((v) => (
                <Text key={v.id} variant="small" numberOfLines={1}>
                  {v.word}
                </Text>
              ))
            ) : (
              <Text variant="small" color="mutedForeground" style={{ fontStyle: "italic" }}>
                No vocabulary yet
              </Text>
            )}
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="label" color="mutedForeground">
              Latest Quote
            </Text>
            {latestQuote ? (
              <Text variant="small" numberOfLines={3} style={{ fontStyle: "italic" }}>
                “{latestQuote.text}”
              </Text>
            ) : (
              <Text variant="small" color="mutedForeground" style={{ fontStyle: "italic" }}>
                No quotes yet
              </Text>
            )}
          </View>
        </View>
      </DetailSection>

      {/* Progress Summary */}
      <DetailSection title="Progress Summary">
        <View style={{ gap: 16 }}>
          <ProgressBar label="Themes Captured" value={themes.length} max={10} />
          <ProgressBar
            label="Words Learned"
            value={learnedCount}
            max={vocab.length || 1}
          />
          <ProgressBar
            label="Quotes Saved"
            value={bookmarkedCount}
            max={quotes.length || 1}
          />
        </View>
      </DetailSection>
    </View>
  );
}
