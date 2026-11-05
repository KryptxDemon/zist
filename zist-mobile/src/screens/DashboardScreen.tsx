import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  CheckCircle2,
  Clock,
  Film,
  Languages,
  Library,
  Lightbulb,
  Play,
  Plus,
  Quote,
  Search,
  TrendingUp,
} from "lucide-react-native";

import { useTheme } from "@/theme";
import { useAuth } from "@/contexts/AuthContext";
import { RadialGlow } from "@/components/layout/RadialGlow";
import {
  Button,
  Card,
  EmptyState,
  MediaCardSkeleton,
  Progress,
  Screen,
  SearchInput,
  Section,
  Segmented,
  Skeleton,
  Text,
  useToast,
} from "@/components/ui";
import { MediaPoster } from "@/components/media/MediaCard";
import {
  DashboardRail,
  QuickActions,
  StatCard,
  SummaryImageCard,
  TrendingRail,
  fallbackCover,
  resolveCover,
  type QuickAction,
} from "@/components/dashboard";
import {
  mediaService,
  quoteService,
  themeService,
  vocabService,
} from "@/services/mediaService";
import type { MediaItem, QuoteItem, ThemeConcept, VocabItem } from "@/types";
import { isWithinLastDays, parseTimestamp } from "@/lib/time";

/** "Recently added" window filter. */
type RangeValue = "7" | "30" | "90" | "all";

const RANGE_ITEMS: { value: RangeValue; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All" },
];

/** Sortable epoch for a backend timestamp (`0` when unparseable). */
function epoch(value: string | null | undefined): number {
  return parseTimestamp(value)?.getTime() ?? 0;
}

/** Coarse concept bucketing used to boost theme recommendations. */
function themeCategory(title: string): string {
  const t = title.toLowerCase();
  if (/(religion|faith|church|god|spiritual|moral|ethic)/.test(t)) {
    return "Religious Concepts";
  }
  if (/(education|learn|growth|discipline|study|self)/.test(t)) {
    return "Self-Education";
  }
  if (/(identity|society|culture|power|politic)/.test(t)) {
    return "Social Dynamics";
  }
  return "General Concepts";
}

/** Native port of the web `Dashboard` page. */
export function DashboardScreen() {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<RangeValue>("all");

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [totalMedia, setTotalMedia] = useState(0);
  const [themes, setThemes] = useState<ThemeConcept[]>([]);
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [coverById, setCoverById] = useState<Record<string, string>>({});

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const page = await mediaService.getAllWithMeta(1, 50);
        const mediaData = page.items;

        const [themesByMedia, vocabByMedia, quotesByMedia] = await Promise.all([
          Promise.all(mediaData.map((m) => themeService.getByMediaId(m.id))),
          Promise.all(mediaData.map((m) => vocabService.getByMediaId(m.id))),
          Promise.all(mediaData.map((m) => quoteService.getByMediaId(m.id))),
        ]);

        setMedia(mediaData);
        setTotalMedia(page.total);
        setThemes(themesByMedia.flat());
        setVocab(vocabByMedia.flat());
        setQuotes(quotesByMedia.flat());
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Please try again in a moment.";
        setError(message);
        toast({
          title: "Couldn't load your dashboard",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Resolve the best cover for every media item (own art → OpenLibrary → TMDb
  // → type fallback). Cancelled on unmount / media change.
  useEffect(() => {
    let cancelled = false;

    if (!media.length) {
      setCoverById({});
      return;
    }

    (async () => {
      const resolved = await Promise.all(
        media.map(async (item) => ({ id: item.id, src: await resolveCover(item) })),
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      resolved.forEach((entry) => {
        next[entry.id] = entry.src;
      });
      setCoverById(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [media]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData(true);
  }, [loadData]);

  // ---------------------------------------------------------------- derived

  const sortedByRecent = useMemo(
    () => [...media].sort((a, b) => epoch(b.updatedAt) - epoch(a.updatedAt)),
    [media],
  );

  const recentlyAdded = useMemo(
    () =>
      [...media]
        .sort((a, b) => epoch(b.createdAt) - epoch(a.createdAt))
        .slice(0, 14),
    [media],
  );

  const recentlyAddedFiltered = useMemo(() => {
    if (range === "all") return recentlyAdded;
    const days = Number(range);
    return recentlyAdded.filter((m) => isWithinLastDays(m.createdAt, days));
  }, [recentlyAdded, range]);

  const continueLearning = useMemo(() => {
    const inProgress = sortedByRecent.filter((m) => m.status === "in-progress");
    const planned = sortedByRecent.filter((m) => m.status === "planned");
    const completed = sortedByRecent.filter((m) => m.status === "completed");
    return [...inProgress, ...planned, ...completed].slice(0, 10);
  }, [sortedByRecent]);

  const themesByMedia = useMemo(() => {
    const map: Record<string, number> = {};
    themes.forEach((t) => {
      map[t.mediaId] = (map[t.mediaId] ?? 0) + 1;
    });
    return map;
  }, [themes]);

  const quotesByMedia = useMemo(() => {
    const map: Record<string, number> = {};
    quotes.forEach((q) => {
      map[q.mediaId] = (map[q.mediaId] ?? 0) + 1;
    });
    return map;
  }, [quotes]);

  const topTheme = useMemo(() => {
    const map = new Map<string, number>();
    themes.forEach((t) => {
      map.set(t.title, (map.get(t.title) ?? 0) + 1);
    });
    return (
      [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Faith vs Doubt"
    );
  }, [themes]);

  const recommendedForTheme = useMemo(() => {
    const tokens = topTheme
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored = media
      .map((m) => {
        const bag = `${m.title} ${m.creator ?? ""} ${m.tags.join(" ")}`.toLowerCase();
        const hit = tokens.reduce(
          (acc, token) => acc + (bag.includes(token) ? 1 : 0),
          0,
        );
        const categoryBoost = themes
          .filter((t) => t.mediaId === m.id)
          .reduce(
            (acc, t) =>
              acc + (themeCategory(t.title) === themeCategory(topTheme) ? 1 : 0),
            0,
          );
        return { media: m, score: hit + categoryBoost };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          epoch(b.media.updatedAt) - epoch(a.media.updatedAt),
      )
      .map((x) => x.media);

    return scored.slice(0, 8);
  }, [media, themes, topTheme]);

  const savedThemeTags = useMemo(() => {
    const unique = new Set(
      themes.filter((t) => t.savedForLater).map((t) => t.title),
    );
    return [...unique].slice(0, 24);
  }, [themes]);

  const counts = useMemo(
    () => ({
      total: totalMedia || media.length,
      inProgress: media.filter((m) => m.status === "in-progress").length,
      completed: media.filter((m) => m.status === "completed").length,
      concepts: themes.length,
      vocab: vocab.length,
      quotes: quotes.length,
    }),
    [media, totalMedia, themes, vocab, quotes],
  );

  const lastOpened = sortedByRecent[0];
  const featuredMedia = lastOpened ?? recentlyAdded[0] ?? continueLearning[0];
  const featuredCover = featuredMedia
    ? coverById[featuredMedia.id] || fallbackCover(featuredMedia.type)
    : fallbackCover("movie");

  const lastConcept = useMemo(
    () =>
      [...themes].sort(
        (a, b) =>
          epoch(b.updatedAt || b.createdAt) - epoch(a.updatedAt || a.createdAt),
      )[0],
    [themes],
  );

  const lastConceptMedia = lastConcept
    ? media.find((m) => m.id === lastConcept.mediaId)
    : undefined;

  const quizMedia =
    continueLearning.find((m) => m.status === "in-progress") ?? lastOpened;

  const currentReading = sortedByRecent.find((m) => m.status === "in-progress");

  const currentReadingVocab = useMemo(
    () => (currentReading ? vocab.filter((v) => v.mediaId === currentReading.id) : []),
    [vocab, currentReading],
  );
  const currentReadingLearned = currentReadingVocab.filter((v) => v.isLearned).length;
  const currentReadingProgress = currentReadingVocab.length
    ? Math.round((currentReadingLearned / currentReadingVocab.length) * 100)
    : 0;

  const lastOpenedCover = lastOpened
    ? coverById[lastOpened.id] || fallbackCover(lastOpened.type)
    : fallbackCover("movie");
  const lastConceptCover = lastConceptMedia
    ? coverById[lastConceptMedia.id] || fallbackCover(lastConceptMedia.type)
    : fallbackCover("book");
  const quizCover = quizMedia
    ? coverById[quizMedia.id] || fallbackCover(quizMedia.type)
    : fallbackCover("tv");

  const firstName = user?.displayName ? user.displayName.split(" ")[0] : "Learner";

  // --------------------------------------------------------------- actions

  const goToMedia = useCallback(
    (id: string) => router.push({ pathname: "/media/[id]", params: { id } }),
    [router],
  );

  const goToAdd = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed) {
      router.push({ pathname: "/add", params: { q: trimmed } });
    } else {
      router.push("/add");
    }
  }, [query, router]);

  const goToQuiz = useCallback(() => {
    if (quizMedia) {
      router.push({ pathname: "/quiz/[mediaId]", params: { mediaId: quizMedia.id } });
    } else {
      router.push("/quiz");
    }
  }, [quizMedia, router]);

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        label: "Add Media",
        description: "Search TMDb & OpenLibrary",
        icon: <Plus size={18} color={colors.primary} />,
        onPress: goToAdd,
      },
      {
        label: "Open Library",
        description: "Browse everything you've saved",
        icon: <Library size={18} color={colors.primary} />,
        onPress: () => router.push("/library"),
      },
      {
        label: "Continue Quiz",
        description: "Practice themes, vocab and quotes",
        icon: <Play size={18} color={colors.primary} />,
        onPress: goToQuiz,
      },
      {
        label: "Grow Vocabulary",
        description: "Review and mark words as learned",
        icon: <Languages size={18} color={colors.primary} />,
        onPress: () => router.push("/vocabulary"),
      },
      {
        label: "See Insights",
        description: "Track your learning momentum",
        icon: <TrendingUp size={18} color={colors.primary} />,
        onPress: () => router.push("/insights"),
      },
    ],
    [colors.primary, goToAdd, goToQuiz, router],
  );

  // ---------------------------------------------------------------- render

  if (isLoading) {
    return (
      <Screen contentContainerStyle={{ gap: 24 }}>
        <DashboardSkeleton />
      </Screen>
    );
  }

  return (
    <Screen
      contentContainerStyle={{ gap: 24 }}
      backdrop={
        <>
          {/* The web's page wash:
              `radial-gradient(circle at 15% 10%, primary/.22, transparent 35%)`
              plus the secondary at 90%/0%, applied at 55% opacity. */}
          <RadialGlow color={colors.primary} opacity={0.12} cx="15%" cy="10%" r="50%" />
          <RadialGlow color={colors.secondary} opacity={0.11} cx="90%" cy="0%" r="50%" />
        </>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Hero */}
      <View
        style={{
          borderRadius: radius["2xl"],
          overflow: "hidden",
          minHeight: 340,
          justifyContent: "flex-end",
        }}
      >
        <ImageBackground
          source={{ uri: featuredCover }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.68)", "rgba(0,0,0,0.88)"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* The web's hero ornaments:
            `-right-12 -top-12 h-56 w-56 bg-primary/30 blur-3xl` and
            `-left-10 bottom-0 h-44 w-44 bg-secondary/30 blur-3xl`. */}
        <RadialGlow color={colors.primary} opacity={0.3} cx="100%" cy="0%" r="45%" />
        <RadialGlow color={colors.secondary} opacity={0.3} cx="0%" cy="100%" r="38%" />
        <View style={{ padding: 20, gap: 10 }}>
          <Text
            variant="caption"
            tint="rgba(255,255,255,0.8)"
            uppercase
            weight="medium"
            letterSpacing={2}
          >
            Welcome back
          </Text>
          <View>
            <Text variant="h1" tint="#ffffff">
              {firstName},
            </Text>
            <Text variant="h2" tint="rgba(255,255,255,0.92)">
              find your next idea.
            </Text>
          </View>
          <Text variant="small" tint="rgba(255,255,255,0.82)">
            A visual learning space inspired by the best streaming experiences:
            continue instantly, explore deeply, and keep momentum.
          </Text>
          {featuredMedia ? (
            <Text variant="caption" tint="rgba(255,255,255,0.72)">
              Featured now:{" "}
              <Text variant="caption" tint="#ffffff" weight="semibold">
                {featuredMedia.title}
              </Text>
            </Text>
          ) : null}

          <View style={{ gap: 10, marginTop: 4 }}>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search movies, books, TV shows…"
              icon={<Search size={18} color={colors.mutedForeground} />}
            />
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button
                icon={<Plus size={18} color={colors.primaryForeground} />}
                label={query.trim() ? `Add "${query.trim()}"` : "Add Media"}
                onPress={goToAdd}
                style={{ flexGrow: 1 }}
              />
              <Button
                variant="secondary"
                icon={<Play size={18} color={colors.secondaryForeground} />}
                label="Start Learning"
                onPress={goToQuiz}
                style={{ flexGrow: 1 }}
              />
            </View>
          </View>
        </View>
      </View>

      {error && !media.length ? (
        <EmptyState
          icon={<TrendingUp size={26} color={colors.destructive} />}
          title="Couldn't load your library"
          description={error}
          action={<Button label="Try again" onPress={() => void loadData()} />}
        />
      ) : media.length === 0 ? (
        <>
          <EmptyState
            icon={<Library size={26} color={colors.primary} />}
            title="Your library is empty"
            description="Add your first movie, book, show, or podcast and Zist will start building your learning space."
            action={
              <Button
                icon={<Plus size={18} color={colors.primaryForeground} />}
                label="Add your first media"
                onPress={() => router.push("/add")}
              />
            }
          />
          <Section title="Continue learning actions">
            <QuickActions actions={quickActions} />
          </Section>
        </>
      ) : (
        <>
          {/* Learning snapshot */}
          <Section title="Your learning snapshot">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <StatCard
                label="Total media"
                value={counts.total}
                icon={<Film size={18} color={colors.primary} />}
              />
              <StatCard
                label="In progress"
                value={counts.inProgress}
                icon={<Clock size={18} color="#d97706" />}
                tint="#f59e0b"
              />
              <StatCard
                label="Completed"
                value={counts.completed}
                icon={<CheckCircle2 size={18} color="#16a34a" />}
                tint="#22c55e"
              />
              <StatCard
                label="Concepts"
                value={counts.concepts}
                icon={<Lightbulb size={18} color={colors.primary} />}
              />
              <StatCard
                label="Vocabulary"
                value={counts.vocab}
                icon={<Languages size={18} color={colors.primary} />}
              />
              <StatCard
                label="Quotes"
                value={counts.quotes}
                icon={<Quote size={18} color={colors.primary} />}
              />
            </View>
          </Section>

          {/* Last opened / last concept / continue quiz */}
          <View style={{ gap: 12 }}>
            <SummaryImageCard
              label="Last Opened Media"
              title={lastOpened?.title ?? "No media yet"}
              subtitle="Continue from where you left off"
              image={lastOpenedCover}
              onPress={() =>
                lastOpened ? goToMedia(lastOpened.id) : router.push("/library")
              }
            />
            <SummaryImageCard
              label="Last Concept Viewed"
              title={lastConcept?.title ?? "No concepts yet"}
              subtitle={
                lastConceptMedia
                  ? `From ${lastConceptMedia.title}`
                  : "Keep developing your understanding"
              }
              image={lastConceptCover}
              onPress={() =>
                lastConceptMedia
                  ? goToMedia(lastConceptMedia.id)
                  : router.push("/library")
              }
            />
            <SummaryImageCard
              label="Continue Quiz"
              title={quizMedia?.title ?? "Resume challenge"}
              subtitle="Practice vocabulary and key themes"
              image={quizCover}
              onPress={goToQuiz}
            />
          </View>

          {/* Currently reading progress */}
          {currentReading ? (
            <Section title="Currently reading">
              <Card>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <MediaPoster
                    coverUrl={coverById[currentReading.id] || fallbackCover(currentReading.type)}
                    type={currentReading.type}
                    title={currentReading.title}
                    height={104}
                    style={{ width: 76, flexGrow: 0 }}
                  />
                  <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
                    <View style={{ gap: 2 }}>
                      <Text variant="label" weight="semibold" numberOfLines={1}>
                        {currentReading.title}
                      </Text>
                      <Text variant="caption" numberOfLines={1}>
                        {currentReading.creator ?? currentReading.type}
                      </Text>
                    </View>
                    <Progress value={currentReadingProgress} height={6} />
                    <Text variant="caption">
                      {currentReadingVocab.length
                        ? `${currentReadingLearned} of ${currentReadingVocab.length} vocabulary learned`
                        : "No vocabulary saved yet"}
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      label="Continue"
                      onPress={() => goToMedia(currentReading.id)}
                      style={{ alignSelf: "flex-start" }}
                    />
                  </View>
                </View>
              </Card>
            </Section>
          ) : null}

          {/* Rails */}
          <DashboardRail
            title="Continue Learning"
            subtitle="Pick up from your latest in-progress titles"
            items={continueLearning}
            coverById={coverById}
            themesByMedia={themesByMedia}
            quotesByMedia={quotesByMedia}
          />

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, paddingHorizontal: 2 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="h3">Recently Added</Text>
                <Text variant="muted">Fresh entries in your knowledge library</Text>
              </View>
            </View>
            <Segmented value={range} onChange={setRange} items={RANGE_ITEMS} />
            {recentlyAddedFiltered.length ? (
              <DashboardRail
                title=""
                items={recentlyAddedFiltered}
                coverById={coverById}
                themesByMedia={themesByMedia}
                quotesByMedia={quotesByMedia}
              />
            ) : (
              <Text variant="muted" style={{ paddingHorizontal: 2 }}>
                Nothing added in the last {range} days.
              </Text>
            )}
          </View>

          <DashboardRail
            title={`Because You Explored "${topTheme}"`}
            subtitle="Recommendations inferred from your current concept focus"
            items={recommendedForTheme}
            coverById={coverById}
            themesByMedia={themesByMedia}
            quotesByMedia={quotesByMedia}
          />

          {/* Saved themes */}
          <Section
            title="Saved Themes"
            action={
              <Pressable onPress={() => router.push("/library")} hitSlop={8}>
                <Text variant="small" tint={colors.primary} weight="medium">
                  Open in Library
                </Text>
              </Pressable>
            }
          >
            <Card>
              {savedThemeTags.length === 0 ? (
                <Text variant="muted">
                  No saved themes yet. Save themes in your media detail pages.
                </Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {savedThemeTags.map((tag) => (
                    <Pressable
                      key={tag}
                      onPress={() =>
                        router.push({ pathname: "/library", params: { theme: tag } })
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: radius.full,
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Lightbulb size={14} color={colors.primary} />
                      <Text variant="small">{tag}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Card>
          </Section>

          {/* Trending (only when a TMDb key is configured) */}
          <TrendingRail />

          {/* Quick actions */}
          <Section title="Continue learning actions">
            <QuickActions actions={quickActions} />
          </Section>

          <Text variant="caption" align="center" style={{ paddingTop: 4 }}>
            {user?.displayName ? `${user.displayName}'s` : "Your"} visual knowledge home
          </Text>
        </>
      )}
    </Screen>
  );
}

/** First-paint placeholder — mirrors the dashboard's real block rhythm. */
function DashboardSkeleton() {
  const { radius } = useTheme();
  const half = { flexGrow: 1, flexBasis: "47%" as const };

  return (
    <View style={{ gap: 24 }}>
      <Skeleton height={320} rounded={radius["2xl"]} />

      <View style={{ gap: 12 }}>
        <Skeleton height={22} width="45%" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={110} rounded={radius["2xl"]} style={half} />
          ))}
        </View>
      </View>

      <Skeleton height={150} rounded={radius["2xl"]} />
      <Skeleton height={150} rounded={radius["2xl"]} />
      <Skeleton height={150} rounded={radius["2xl"]} />

      <View style={{ gap: 12 }}>
        <Skeleton height={22} width="40%" />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <MediaCardSkeleton />
          <MediaCardSkeleton />
        </View>
      </View>
    </View>
  );
}
