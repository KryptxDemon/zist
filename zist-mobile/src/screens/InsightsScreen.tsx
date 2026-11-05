import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import {
  Activity,
  BookOpen,
  Clock,
  Flame,
  Layers,
  MessageSquareQuote,
  Sparkles,
  Target,
} from "lucide-react-native";

import { useTheme } from "@/theme";
import { mediaService, quoteService, themeService, vocabService } from "@/services/mediaService";
import { storage, STORAGE_KEYS } from "@/services/storage";
import { formatRelativeTime, toLocalDayKey } from "@/lib/time";
import type { QuizAttempt, QuoteItem, ThemeConcept, VocabItem, MediaItem } from "@/types";
import { Badge, Screen, Skeleton, Text } from "@/components/ui";
import {
  ActivityHeatmap,
  ActivityRow,
  ChartCard,
  ChartLegend,
  DonutChart,
  HorizontalBarChart,
  LineChart,
  StatCard,
  VerticalBarChart,
  useChartColors,
  type SeriesDatum,
} from "@/components/insights";

type ActivityKind = "Theme" | "Vocabulary" | "Quote";

interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  title: string;
  mediaTitle: string;
  createdAt: string;
}

function themeCategory(title: string): string {
  const t = title.toLowerCase();
  if (/(religion|faith|church|god|spiritual|moral|ethic)/.test(t)) return "Religious Concepts";
  if (/(education|learn|growth|discipline|study|self)/.test(t)) return "Self-Education";
  if (/(identity|society|culture|power|politic)/.test(t)) return "Social Dynamics";
  return "General Concepts";
}

/** Native port of the web `Insights` page (charts rebuilt with react-native-svg). */
export function InsightsScreen() {
  const { colors } = useTheme();
  const chartColors = useChartColors();

  const [isLoading, setIsLoading] = useState(true);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [themes, setThemes] = useState<ThemeConcept[]>([]);
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const mediaData = await mediaService.getAll(1, 100);
        const [allThemesByMedia, allVocabByMedia, allQuotesByMedia] = await Promise.all([
          Promise.all(mediaData.map((m) => themeService.getByMediaId(m.id))),
          Promise.all(mediaData.map((m) => vocabService.getByMediaId(m.id))),
          Promise.all(mediaData.map((m) => quoteService.getByMediaId(m.id))),
        ]);

        setMedia(mediaData);
        setThemes(allThemesByMedia.flat());
        setVocab(allVocabByMedia.flat());
        setQuotes(allQuotesByMedia.flat());
        setQuizAttempts(storage.get<QuizAttempt[]>(STORAGE_KEYS.QUIZZES) || []);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const mediaTitleById = useMemo(() => {
    const map = new Map<string, string>();
    media.forEach((m) => map.set(m.id, m.title));
    return map;
  }, [media]);

  // Topics / themes distribution (ports the web's unused conceptDistributionData).
  const conceptDistribution = useMemo<SeriesDatum[]>(() => {
    const map = new Map<string, number>();
    themes.forEach((t) => {
      const cat = themeCategory(t.title);
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [themes]);

  // Themes grouped by media type (ports themesPerMediaTypeData).
  const themesPerMediaType = useMemo<SeriesDatum[]>(() => {
    const map = new Map<string, number>();
    media.forEach((m) => {
      const value = themes.filter((t) => t.mediaId === m.id).length;
      map.set(m.type.toUpperCase(), (map.get(m.type.toUpperCase()) || 0) + value);
    });
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [media, themes]);

  // 14-day vocabulary growth (ports vocabGrowthData) → line chart.
  const vocabGrowth = useMemo(() => {
    const today = new Date();
    const values: number[] = [];
    const labels: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      labels.push(d.toLocaleDateString(undefined, { weekday: "narrow" }));
      const dayKey = toLocalDayKey(d);
      values.push(vocab.filter((v) => toLocalDayKey(v.createdAt) === dayKey).length);
    }
    return { values, labels };
  }, [vocab]);

  // Learning-time estimate per media (verbatim from the web page).
  const estimatedLearningTimeData = useMemo(() => {
    const minutesByMedia = new Map<
      string,
      { title: string; minutes: number; themeCount: number; vocabCount: number; quoteCount: number; quizCount: number }
    >();

    const getOrCreate = (mediaId: string, title: string) => {
      if (!minutesByMedia.has(mediaId)) {
        minutesByMedia.set(mediaId, {
          title,
          minutes: 0,
          themeCount: 0,
          vocabCount: 0,
          quoteCount: 0,
          quizCount: 0,
        });
      }
      return minutesByMedia.get(mediaId)!;
    };

    themes.forEach((item) => {
      const mediaItem = media.find((m) => m.id === item.mediaId);
      if (!mediaItem) return;
      const bucket = getOrCreate(mediaItem.id, mediaItem.title);
      bucket.themeCount += 1;
      bucket.minutes += 4;
    });
    vocab.forEach((item) => {
      const mediaItem = media.find((m) => m.id === item.mediaId);
      if (!mediaItem) return;
      const bucket = getOrCreate(mediaItem.id, mediaItem.title);
      bucket.vocabCount += 1;
      bucket.minutes += 3;
    });
    quotes.forEach((item) => {
      const mediaItem = media.find((m) => m.id === item.mediaId);
      if (!mediaItem) return;
      const bucket = getOrCreate(mediaItem.id, mediaItem.title);
      bucket.quoteCount += 1;
      bucket.minutes += 2;
    });
    quizAttempts.forEach((item) => {
      const mediaItem = media.find((m) => m.id === item.mediaId);
      if (!mediaItem) return;
      const bucket = getOrCreate(mediaItem.id, mediaItem.title);
      bucket.quizCount += 1;
      bucket.minutes += Math.max(6, Math.round(item.totalQuestions * 1.5));
    });

    return [...minutesByMedia.values()].sort((a, b) => b.minutes - a.minutes).slice(0, 8);
  }, [media, themes, vocab, quotes, quizAttempts]);

  const totalEstimatedMinutes = useMemo(
    () => estimatedLearningTimeData.reduce((sum, item) => sum + item.minutes, 0),
    [estimatedLearningTimeData],
  );

  const topLearningMedia = estimatedLearningTimeData[0];

  // Daily activity buckets power the heatmap + streak.
  const activityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const bump = (iso: string) => {
      const key = toLocalDayKey(iso);
      counts[key] = (counts[key] ?? 0) + 1;
    };
    themes.forEach((t) => bump(t.createdAt));
    vocab.forEach((v) => bump(v.createdAt));
    quotes.forEach((q) => bump(q.createdAt));
    quizAttempts.forEach((a) => bump(a.completedAt));
    return counts;
  }, [themes, vocab, quotes, quizAttempts]);

  const studyStreak = useMemo(() => {
    let streak = 0;
    const cursor = new Date();
    if (!activityCounts[toLocalDayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (activityCounts[toLocalDayKey(cursor)]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [activityCounts]);

  const activeDays = useMemo(
    () => Object.values(activityCounts).filter((count) => count > 0).length,
    [activityCounts],
  );

  const learnedVocab = useMemo(() => vocab.filter((v) => v.isLearned).length, [vocab]);

  const avgQuizScore = useMemo(() => {
    if (quizAttempts.length === 0) return null;
    const ratio =
      quizAttempts.reduce(
        (sum, attempt) =>
          sum + (attempt.totalQuestions ? attempt.score / attempt.totalQuestions : 0),
        0,
      ) / quizAttempts.length;
    return Math.round(ratio * 100);
  }, [quizAttempts]);

  // "Top vocabulary" — words saved most often across the library.
  const topVocabulary = useMemo(() => {
    const map = new Map<string, { word: string; count: number; definition?: string }>();
    vocab.forEach((v) => {
      const key = v.word.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.definition && v.definition) existing.definition = v.definition;
      } else {
        map.set(key, { word: v.word, count: 1, definition: v.definition });
      }
    });
    return [...map.values()]
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
      .slice(0, 6);
  }, [vocab]);

  const recentActivity = useMemo<ActivityEntry[]>(() => {
    const entries: ActivityEntry[] = [
      ...themes.map((t) => ({
        id: t.id,
        kind: "Theme" as const,
        title: t.title,
        mediaTitle: mediaTitleById.get(t.mediaId) ?? "Unknown media",
        createdAt: t.createdAt,
      })),
      ...vocab.map((v) => ({
        id: v.id,
        kind: "Vocabulary" as const,
        title: v.word,
        mediaTitle: mediaTitleById.get(v.mediaId) ?? "Unknown media",
        createdAt: v.createdAt,
      })),
      ...quotes.map((q) => ({
        id: q.id,
        kind: "Quote" as const,
        title: q.text.length > 80 ? `${q.text.slice(0, 80)}…` : q.text,
        mediaTitle: mediaTitleById.get(q.mediaId) ?? "Unknown media",
        createdAt: q.createdAt,
      })),
    ];
    return entries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [themes, vocab, quotes, mediaTitleById]);

  const learningTimeSeries = estimatedLearningTimeData.map((item) => ({
    label: item.title,
    value: item.minutes,
  }));

  return (
    <Screen>
      <View
        style={{
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 24,
          gap: 8,
        }}
      >
        <Text variant="caption" tint={colors.primary} uppercase letterSpacing={1.6}>
          Insights
        </Text>
        <Text variant="h1">Your Learning Analytics</Text>
        <Text variant="muted">
          A simpler view of what you’ve spent time learning, what you’ve saved, and which media has
          taken the most attention.
        </Text>
      </View>

      {isLoading ? (
        <View style={{ gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={200} rounded={20} />
          ))}
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <StatCard
              label="Media studied"
              value={media.length}
              hint="Combined themes, vocabulary, quotes, and quizzes across your library."
              icon={<BookOpen size={16} color={colors.mutedForeground} />}
            />
            <StatCard
              label="Estimated learning time"
              value={`${totalEstimatedMinutes} min`}
              hint="Based on themes, vocabulary, quotes, and quiz activity."
              icon={<Clock size={16} color={colors.mutedForeground} />}
            />
            <StatCard
              label="Most active media"
              value={topLearningMedia?.title || "No media yet"}
              hint={
                topLearningMedia
                  ? `${topLearningMedia.minutes} min estimated`
                  : "Add media and start learning."
              }
              icon={<Target size={16} color={colors.mutedForeground} />}
            />
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <StatCard
              label="Study streak"
              value={`${studyStreak} ${studyStreak === 1 ? "day" : "days"}`}
              hint="Consecutive days with saved content or a quiz."
              tint={colors.chart1}
              icon={<Flame size={16} color={colors.chart1} />}
            />
            <StatCard
              label="Themes"
              value={themes.length}
              icon={<Sparkles size={16} color={colors.mutedForeground} />}
            />
            <StatCard
              label="Vocabulary"
              value={`${learnedVocab} / ${vocab.length}`}
              hint="Learned / total words"
              icon={<Layers size={16} color={colors.mutedForeground} />}
            />
            <StatCard
              label="Quotes"
              value={quotes.length}
              icon={<MessageSquareQuote size={16} color={colors.mutedForeground} />}
            />
            <StatCard
              label="Quiz attempts"
              value={quizAttempts.length}
              hint={avgQuizScore === null ? "No quizzes yet" : `Avg score ${avgQuizScore}%`}
              icon={<Activity size={16} color={colors.mutedForeground} />}
            />
            <StatCard
              label="Active days"
              value={activeDays}
              hint="Days with any learning activity"
              icon={<Activity size={16} color={colors.mutedForeground} />}
            />
          </View>

          <ChartCard
            title="Activity"
            subtitle={`${studyStreak}-day streak · ${activeDays} active days`}
          >
            <ActivityHeatmap counts={activityCounts} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
              <Text variant="caption">Less</Text>
              {[0.25, 0.5, 0.75, 1].map((level) => (
                <View
                  key={level}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: colors.chart1,
                    opacity: level,
                  }}
                />
              ))}
              <Text variant="caption">More</Text>
            </View>
          </ChartCard>

          <ChartCard title="Vocabulary added" subtitle="Last 14 days">
            {vocab.length === 0 ? (
              <Text variant="muted">Add vocabulary to track your growth.</Text>
            ) : (
              <LineChart values={vocabGrowth.values} labels={vocabGrowth.labels} />
            )}
          </ChartCard>

          <ChartCard title="Learning Time Per Media" subtitle="Estimated minutes of engagement">
            {learningTimeSeries.length === 0 ? (
              <Text variant="muted">
                Add themes, vocabulary, quotes, or quizzes to see this breakdown.
              </Text>
            ) : (
              <HorizontalBarChart data={learningTimeSeries} valueSuffix=" min" />
            )}
          </ChartCard>

          <ChartCard title="Themes by Media Type">
            {themesPerMediaType.length === 0 ? (
              <Text variant="muted">No themes saved yet.</Text>
            ) : (
              <VerticalBarChart data={themesPerMediaType} />
            )}
          </ChartCard>

          <ChartCard title="Topic Distribution" subtitle="Themes grouped into categories">
            {conceptDistribution.length === 0 ? (
              <Text variant="muted">Generate themes to see how your topics are distributed.</Text>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <DonutChart
                  data={conceptDistribution}
                  centerValue={themes.length}
                  centerLabel="themes"
                />
                <ChartLegend data={conceptDistribution} style={{ flex: 1, minWidth: 160 }} />
              </View>
            )}
          </ChartCard>

          <ChartCard title="Top Vocabulary">
            {topVocabulary.length === 0 ? (
              <Text variant="muted">No vocabulary saved yet.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {topVocabulary.map((entry) => (
                  <View key={entry.word} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="small" weight="semibold">
                        {entry.word}
                      </Text>
                      {entry.definition ? (
                        <Text variant="caption" numberOfLines={1}>
                          {entry.definition}
                        </Text>
                      ) : null}
                    </View>
                    <Badge variant="secondary" label={`${entry.count}×`} />
                  </View>
                ))}
              </View>
            )}
          </ChartCard>

          <ChartCard title="Recent Activity" subtitle="Your latest saved ideas">
            {recentActivity.length === 0 ? (
              <Text variant="muted">Nothing saved yet — add a theme, word, or quote.</Text>
            ) : (
              <View style={{ gap: 14 }}>
                {recentActivity.map((entry) => (
                  <ActivityRow
                    key={`${entry.kind}-${entry.id}`}
                    badge={
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor:
                            entry.kind === "Theme"
                              ? chartColors[0]
                              : entry.kind === "Vocabulary"
                                ? chartColors[1]
                                : chartColors[2],
                        }}
                      />
                    }
                    title={entry.title}
                    meta={`${entry.kind} · ${entry.mediaTitle}`}
                    right={<Text variant="caption">{formatRelativeTime(entry.createdAt)}</Text>}
                  />
                ))}
              </View>
            )}
          </ChartCard>
        </>
      )}
    </Screen>
  );
}
