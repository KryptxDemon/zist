import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BookOpen, Brain, Lightbulb, Quote, Sparkles, Trophy } from "lucide-react-native";

import { useTheme } from "@/theme";
import {
  Button,
  Card,
  EmptyState,
  QuizCardSkeleton,
  Screen,
  Text,
} from "@/components/ui";
import { QuizHubCard } from "@/components/quiz/QuizHubCard";
import {
  mediaService,
  quoteService,
  themeService,
  vocabService,
} from "@/services/mediaService";
import { apiClient } from "@/services/apiClient";
import { STORAGE_KEYS, storage } from "@/services/storage";
import type { MediaItem, QuizAttempt, QuoteItem, ThemeConcept, VocabItem } from "@/types";
import { countAvailableQuestions } from "@/lib/quiz";

interface MediaContent {
  themes: ThemeConcept[];
  vocab: VocabItem[];
  quotes: QuoteItem[];
}

interface HubStats {
  totalQuizzes: number;
  averageAccuracy: number;
  themesTested: number;
  wordsReviewed: number;
}

const EMPTY_STATS: HubStats = {
  totalQuizzes: 0,
  averageAccuracy: 0,
  themesTested: 0,
  wordsReviewed: 0,
};

/** Score as a whole-number percentage (0 when no questions were answered). */
function attemptPercentage(attempt: QuizAttempt): number {
  return attempt.totalQuestions > 0
    ? Math.round((attempt.score / attempt.totalQuestions) * 100)
    : 0;
}

function summarizeAttempts(attempts: QuizAttempt[]): {
  best: number | null;
  last: number | null;
} {
  if (attempts.length === 0) return { best: null, last: null };
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );
  const lastAttempt = sorted[sorted.length - 1];
  return {
    best: Math.max(...attempts.map(attemptPercentage)),
    last: lastAttempt ? attemptPercentage(lastAttempt) : null,
  };
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: "45%",
        minWidth: 140,
        alignItems: "center",
        gap: 6,
        padding: 20,
        borderRadius: radius["2xl"],
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      {icon}
      <Text variant="h3">{value}</Text>
      <Text variant="muted" align="center">
        {label}
      </Text>
    </View>
  );
}

/** Native port of the web `QuizHub` page. */
export function QuizHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [contentByMedia, setContentByMedia] = useState<Record<string, MediaContent>>({});
  const [stats, setStats] = useState<HubStats>(EMPTY_STATS);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reloadAttempts = useCallback(() => {
    setAttempts(storage.get<QuizAttempt[]>(STORAGE_KEYS.QUIZZES) ?? []);
  }, []);

  // Refresh best/last scores whenever the hub regains focus (e.g. after a quiz).
  useFocusEffect(reloadAttempts);

  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      try {
        const data = await mediaService.getAll();
        if (cancelled) return;
        setMedia(data);

        const [quizStats, themesByMedia, vocabByMedia, quotesByMedia] = await Promise.all([
          apiClient
            .get<{ total_quizzes?: number; average_accuracy?: number }>("/quiz/stats")
            .catch(() => ({ total_quizzes: 0, average_accuracy: 0 })),
          Promise.all(data.map((item) => themeService.getByMediaId(item.id).catch(() => []))),
          Promise.all(data.map((item) => vocabService.getByMediaId(item.id).catch(() => []))),
          Promise.all(data.map((item) => quoteService.getByMediaId(item.id).catch(() => []))),
        ]);
        if (cancelled) return;

        const byMedia: Record<string, MediaContent> = {};
        data.forEach((item, index) => {
          byMedia[item.id] = {
            themes: themesByMedia[index] ?? [],
            vocab: vocabByMedia[index] ?? [],
            quotes: quotesByMedia[index] ?? [],
          };
        });

        setContentByMedia(byMedia);
        setStats({
          totalQuizzes: quizStats.total_quizzes || 0,
          averageAccuracy: Math.round(quizStats.average_accuracy || 0),
          themesTested: themesByMedia.flat().length,
          wordsReviewed: vocabByMedia.flat().length,
        });
      } catch (error) {
        console.error("Failed to load media:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadMedia();
    return () => {
      cancelled = true;
    };
  }, []);

  const hubMedia = useMemo(
    () =>
      media.map((item) => {
        const content = contentByMedia[item.id];
        const questionCount = content
          ? countAvailableQuestions(content.themes, content.vocab, content.quotes)
          : 0;
        const { best, last } = summarizeAttempts(
          attempts.filter((attempt) => attempt.mediaId === item.id),
        );
        return { media: item, questionCount, bestScore: best, lastScore: last };
      }),
    [media, contentByMedia, attempts],
  );

  const collectiveSummary = useMemo(
    () => summarizeAttempts(attempts.filter((attempt) => attempt.mediaId === "collective")),
    [attempts],
  );

  const collectiveQuestionCount = useMemo(() => {
    const all = Object.values(contentByMedia);
    return countAvailableQuestions(
      all.flatMap((content) => content.themes),
      all.flatMap((content) => content.vocab),
      all.flatMap((content) => content.quotes),
    );
  }, [contentByMedia]);

  const startQuiz = (mediaId: string) => {
    router.push({ pathname: "/quiz/[mediaId]", params: { mediaId } });
  };

  return (
    <Screen bottomInset={62}>
      <View style={{ gap: 6 }}>
        <Text variant="h1">Quiz Hub</Text>
        <Text variant="muted">Test your knowledge from what you've learned</Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <StatTile
          icon={<Trophy size={22} color="#fbbf24" />}
          value={stats.totalQuizzes}
          label="Quizzes Taken"
        />
        <StatTile
          icon={<Brain size={22} color={colors.primary} />}
          value={`${stats.averageAccuracy}%`}
          label="Avg. Score"
        />
        <StatTile
          icon={<Lightbulb size={22} color="#a78bfa" />}
          value={stats.themesTested}
          label="Themes Tested"
        />
        <StatTile
          icon={<BookOpen size={22} color="#34d399" />}
          value={stats.wordsReviewed}
          label="Words Reviewed"
        />
      </View>

      {/* Collective quiz */}
      <Card style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text variant="h4">Combined Quiz: Quotes, Themes, and Vocabulary</Text>
          <Text variant="muted">
            Pull questions from all saved media and mix vocabulary, themes, and quotes into
            one session with AI-curated distractors.
          </Text>
        </View>
        <Button
          label="Start Combined Quiz"
          disabled={collectiveQuestionCount === 0}
          icon={<Sparkles size={16} color={colors.primaryForeground} />}
          onPress={() => startQuiz("collective")}
        />
      </Card>

      {/* Content stats */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <StatTile
          icon={<BookOpen size={22} color="#34d399" />}
          value={stats.wordsReviewed}
          label="Vocabulary prompts"
        />
        <StatTile
          icon={<Lightbulb size={22} color="#a78bfa" />}
          value={stats.themesTested}
          label="Theme prompts"
        />
        <StatTile
          icon={<Quote size={22} color="#38bdf8" />}
          value={media.length}
          label="Media sources"
        />
      </View>

      {/* Per-media quizzes */}
      {isLoading ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[0, 1, 2].map((index) => (
            <Card key={index} variant="glass" style={{ flexGrow: 1, flexBasis: "45%", minWidth: 140 }}>
              <QuizCardSkeleton />
            </Card>
          ))}
        </View>
      ) : hubMedia.length === 0 ? (
        <EmptyState
          icon={<Brain size={28} color={colors.mutedForeground} />}
          title="No media to quiz"
          description="Add media to your library first, then come back to test yourself."
          action={<Button label="Add Media" onPress={() => router.push("/add")} />}
        />
      ) : (
        <View style={{ gap: 12 }}>
          <Text variant="h3">Your media</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {hubMedia.map(({ media: item, questionCount, bestScore, lastScore }) => (
              <QuizHubCard
                key={item.id}
                media={item}
                questionCount={questionCount}
                bestScore={bestScore}
                lastScore={lastScore}
                onStart={() => startQuiz(item.id)}
                style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150 }}
              />
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}
