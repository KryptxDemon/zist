import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  Sparkles,
  Target,
  Flame,
  Layers,
  Activity,
  MessageSquareQuote,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  mediaService,
  quoteService,
  themeService,
  vocabService,
} from "@/services/mediaService";
import { storage, STORAGE_KEYS } from "@/services/storage";
import {
  MediaItem,
  QuizAttempt,
  QuoteItem,
  ThemeConcept,
  VocabItem,
} from "@/types";
import { toLocalDayKey } from "@/lib/time";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b",
  "#6366f1",
  "#ec4899",
  "#8b5cf6",
];

function toDayKey(iso: string): string {
  return toLocalDayKey(iso);
}

export default function Insights() {
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
        const mediaData = await mediaService.getAll();
        const [allThemesByMedia, allVocabByMedia, allQuotesByMedia] =
          await Promise.all([
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

  // Library status breakdown
  const mediaStatusData = useMemo(() => {
    const counts: Record<string, number> = {
      Completed: 0,
      "In Progress": 0,
      Planned: 0,
    };
    media.forEach((m) => {
      const s = String(m.status || "").toLowerCase();
      if (s === "completed") counts["Completed"]++;
      else if (s === "in-progress" || s === "in_progress") counts["In Progress"]++;
      else counts["Planned"]++;
    });
    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({ name, value }));
  }, [media]);

  // Themes grouped by media type
  const themesPerMediaTypeData = useMemo(() => {
    const map = new Map<string, number>();
    media.forEach((m) => {
      const value = themes.filter((t) => t.mediaId === m.id).length;
      map.set(
        m.type.toUpperCase(),
        (map.get(m.type.toUpperCase()) || 0) + value,
      );
    });
    return [...map.entries()].map(([type, themesCount]) => ({
      type,
      themes: themesCount,
    }));
  }, [media, themes]);

  // 14-day vocabulary growth
  const vocabGrowthData = useMemo(() => {
    const today = new Date();
    const out: { day: string; words: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
      const dayKey = toDayKey(d.toISOString());
      const words = vocab.filter(
        (v) => toDayKey(v.createdAt) === dayKey,
      ).length;
      out.push({ day: dayLabel, words });
    }
    return out;
  }, [vocab]);

  // Knowledge density per media
  const knowledgePerMedia = useMemo(() => {
    const map = new Map<
      string,
      {
        title: string;
        count: number;
        themeCount: number;
        vocabCount: number;
        quoteCount: number;
        quizCount: number;
      }
    >();

    const getOrCreate = (mediaId: string, title: string) => {
      if (!map.has(mediaId)) {
        map.set(mediaId, {
          title,
          count: 0,
          themeCount: 0,
          vocabCount: 0,
          quoteCount: 0,
          quizCount: 0,
        });
      }
      return map.get(mediaId)!;
    };

    themes.forEach((item) => {
      const mediaItem = media.find((m) => m.id === item.mediaId);
      if (!mediaItem) return;
      const b = getOrCreate(mediaItem.id, mediaItem.title);
      b.themeCount += 1;
      b.count += 1;
    });
    vocab.forEach((item) => {
      const mediaItem = media.find((m) => m.id === item.mediaId);
      if (!mediaItem) return;
      const b = getOrCreate(mediaItem.id, mediaItem.title);
      b.vocabCount += 1;
      b.count += 1;
    });
    quotes.forEach((item) => {
      const mediaItem = media.find((m) => m.id === item.mediaId);
      if (!mediaItem) return;
      const b = getOrCreate(mediaItem.id, mediaItem.title);
      b.quoteCount += 1;
      b.count += 1;
    });
    quizAttempts.forEach((item) => {
      const mediaItem = media.find((m) => m.id === item.mediaId);
      if (!mediaItem) return;
      const b = getOrCreate(mediaItem.id, mediaItem.title);
      b.quizCount += 1;
      b.count += 1;
    });

    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [media, themes, vocab, quotes, quizAttempts]);

  const totalKnowledgeItems = useMemo(
    () => themes.length + vocab.length + quotes.length,
    [themes, vocab, quotes],
  );

  const topKnowledgeMedia = knowledgePerMedia[0];

  const learnedVocab = useMemo(
    () => vocab.filter((v) => v.isLearned).length,
    [vocab],
  );

  const avgQuizScore = useMemo(() => {
    if (quizAttempts.length === 0) return null;
    const ratio =
      quizAttempts.reduce(
        (sum, attempt) =>
          sum +
          (attempt.totalQuestions ? attempt.score / attempt.totalQuestions : 0),
        0,
      ) / quizAttempts.length;
    return Math.round(ratio * 100);
  }, [quizAttempts]);

  const activityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const bump = (iso: string) => {
      const key = toDayKey(iso);
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
    if (!activityCounts[toDayKey(cursor.toISOString())])
      cursor.setDate(cursor.getDate() - 1);
    while (activityCounts[toDayKey(cursor.toISOString())]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [activityCounts]);

  const activeDays = useMemo(
    () => Object.values(activityCounts).filter((c) => c > 0).length,
    [activityCounts],
  );

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto pb-20 md:pb-0 space-y-6 animate-fade-in">
        <section className="rounded-3xl border border-border/40 bg-card/75 backdrop-blur-md p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.16em] text-primary/90 font-medium">
            Insights
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-foreground mt-2">
            Your Learning Analytics
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            A genuine view of what you’ve spent time learning, what you’ve
            saved, and which media has captured the most knowledge.
          </p>
        </section>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-accent animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Primary Stat Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm">Media in Library</span>
                  <BookOpen className="h-4 w-4" />
                </div>
                <p className="font-display text-3xl font-semibold text-foreground">
                  {media.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Titles across your collection
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm">Knowledge Captured</span>
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <p className="font-display text-3xl font-semibold text-foreground">
                  {totalKnowledgeItems}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total themes, vocabulary words, and quotes saved
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm">Top Explored Media</span>
                  <Target className="h-4 w-4" />
                </div>
                <p className="font-display text-2xl font-semibold text-foreground truncate">
                  {topKnowledgeMedia?.title || "No media yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {topKnowledgeMedia
                    ? `${topKnowledgeMedia.count} items recorded`
                    : "Add media and start capturing concepts"}
                </p>
              </div>
            </section>

            {/* Secondary Metric Cards */}
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Flame className="h-3.5 w-3.5 text-primary" /> Streak
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  {studyStreak}d
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Sparkles className="h-3.5 w-3.5" /> Themes
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  {themes.length}
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Layers className="h-3.5 w-3.5" /> Vocab
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  {learnedVocab} / {vocab.length}
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <MessageSquareQuote className="h-3.5 w-3.5" /> Quotes
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  {quotes.length}
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Activity className="h-3.5 w-3.5" /> Quizzes
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  {quizAttempts.length}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {avgQuizScore !== null ? `Avg ${avgQuizScore}%` : "No attempts"}
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Activity className="h-3.5 w-3.5" /> Active Days
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  {activeDays}
                </p>
              </div>
            </section>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Knowledge Depth Per Media */}
              <section className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
                <h3 className="font-display font-semibold text-foreground">
                  Knowledge Depth Per Media
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Themes, vocabulary, and quotes recorded
                </p>
                {knowledgePerMedia.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">
                    Add themes, vocabulary, quotes, or quizzes to see this breakdown.
                  </p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={knowledgePerMedia} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          opacity={0.35}
                        />
                        <XAxis
                          type="number"
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="title"
                          width={140}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value, _name, entry) => [
                            `${value} items`,
                            entry.payload.title,
                          ]}
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="hsl(var(--primary))"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              {/* Library Progress (Status Distribution) */}
              <section className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
                <h3 className="font-display font-semibold text-foreground">
                  Library Progress
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Watchlist & reading status breakdown
                </p>
                {mediaStatusData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">
                    Add media to your library to see your reading/watch status.
                  </p>
                ) : (
                  <div className="h-72 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mediaStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                          paddingAngle={4}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {mediaStatusData.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              {/* Vocabulary Added (14 Days) */}
              <section className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
                <h3 className="font-display font-semibold text-foreground">
                  Vocabulary Added
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Last 14 days growth
                </p>
                {vocab.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">
                    Add vocabulary to track your growth.
                  </p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={vocabGrowthData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          opacity={0.35}
                        />
                        <XAxis
                          dataKey="day"
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="words"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              {/* Themes by Media Type */}
              <section className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
                <h3 className="font-display font-semibold text-foreground">
                  Themes by Media Type
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Distribution across movies, series, books & podcasts
                </p>
                {themesPerMediaTypeData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">
                    No themes saved yet.
                  </p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={themesPerMediaTypeData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          opacity={0.35}
                        />
                        <XAxis
                          dataKey="type"
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="themes"
                          fill="#10b981"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
