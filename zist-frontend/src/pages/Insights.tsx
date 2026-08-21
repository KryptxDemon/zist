import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  "hsl(var(--secondary))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function toDayKey(iso: string): string {
  return toLocalDayKey(iso);
}

function themeCategory(title: string): string {
  const t = title.toLowerCase();
  if (/(religion|faith|church|god|spiritual|moral|ethic)/.test(t))
    return "Religious Concepts";
  if (/(education|learn|growth|discipline|study|self)/.test(t))
    return "Self-Education";
  if (/(identity|society|culture|power|politic)/.test(t))
    return "Social Dynamics";
  return "General Concepts";
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

  const conceptDistributionData = useMemo(() => {
    const map = new Map<string, number>();
    themes.forEach((t) => {
      const cat = themeCategory(t.title);
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [themes]);

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

  const estimatedLearningTimeData = useMemo(() => {
    const minutesByMedia = new Map<
      string,
      {
        title: string;
        minutes: number;
        themeCount: number;
        vocabCount: number;
        quoteCount: number;
        quizCount: number;
      }
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

    return [...minutesByMedia.values()]
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8);
  }, [media, themes, vocab, quotes, quizAttempts]);

  const totalEstimatedMinutes = useMemo(
    () =>
      estimatedLearningTimeData.reduce((sum, item) => sum + item.minutes, 0),
    [estimatedLearningTimeData],
  );

  const topLearningMedia = estimatedLearningTimeData[0];

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
            A simpler view of what you’ve spent time learning, what you’ve
            saved, and which media has taken the most attention.
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
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
                <p className="text-sm text-muted-foreground">Media studied</p>
                <p className="mt-2 font-display text-3xl font-semibold text-foreground">
                  {media.length}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Combined themes, vocabulary, quotes, and quizzes across your
                  library.
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
                <p className="text-sm text-muted-foreground">
                  Estimated learning time
                </p>
                <p className="mt-2 font-display text-3xl font-semibold text-foreground">
                  {totalEstimatedMinutes} min
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Based on themes, vocabulary, quotes, and quiz activity.
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
                <p className="text-sm text-muted-foreground">
                  Most active media
                </p>
                <p className="mt-2 font-display text-2xl font-semibold text-foreground line-clamp-2">
                  {topLearningMedia?.title || "No media yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {topLearningMedia
                    ? `${topLearningMedia.minutes} min estimated`
                    : "Add media and start learning."}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
              <h3 className="font-display font-semibold text-foreground mb-3">
                Learning Time Per Media
              </h3>
              {estimatedLearningTimeData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add themes, vocabulary, quotes, or quizzes to see this
                  breakdown.
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={estimatedLearningTimeData}
                      layout="vertical"
                    >
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
                        formatter={(value, name, entry) => [
                          `${value} min`,
                          entry.payload.title,
                        ]}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar
                        dataKey="minutes"
                        fill="hsl(var(--primary))"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
