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

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function toDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

  const activityTrendData = useMemo(() => {
    const counts = new Map<string, number>();

    themes.forEach((t) => {
      const key = toDayKey(t.createdAt);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    vocab.forEach((v) => {
      const key = toDayKey(v.createdAt);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    quotes.forEach((q) => {
      const key = toDayKey(q.createdAt);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    quizAttempts.forEach((q) => {
      const key = toDayKey(q.completedAt);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const out: { day: string; actions: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = toDayKey(d.toISOString());
      out.push({
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        actions: counts.get(key) || 0,
      });
    }

    return out;
  }, [themes, vocab, quotes, quizAttempts]);

  const heatmapDays = useMemo(() => {
    const countByDay = new Map<string, number>();

    themes.forEach((e) => {
      const key = toDayKey(e.createdAt);
      countByDay.set(key, (countByDay.get(key) || 0) + 1);
    });
    vocab.forEach((e) => {
      const key = toDayKey(e.createdAt);
      countByDay.set(key, (countByDay.get(key) || 0) + 1);
    });
    quotes.forEach((e) => {
      const key = toDayKey(e.createdAt);
      countByDay.set(key, (countByDay.get(key) || 0) + 1);
    });
    quizAttempts.forEach((e) => {
      const key = toDayKey(e.completedAt);
      countByDay.set(key, (countByDay.get(key) || 0) + 1);
    });

    const result: { key: string; count: number; label: string }[] = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = toDayKey(d.toISOString());
      result.push({
        key,
        count: countByDay.get(key) || 0,
        label: d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      });
    }
    return result;
  }, [themes, vocab, quotes, quizAttempts]);

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
            Track growth, concept spread, streak patterns, and media influence
            from a dedicated analytics space.
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
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
              <h3 className="font-display font-semibold text-foreground mb-3">
                Concept Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={conceptDistributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={92}
                      paddingAngle={3}
                    >
                      {conceptDistributionData.map((_, idx) => (
                        <Cell
                          key={`c-${idx}`}
                          fill={CHART_COLORS[idx % CHART_COLORS.length]}
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
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
              <h3 className="font-display font-semibold text-foreground mb-3">
                Vocabulary Growth
              </h3>
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
                      allowDecimals={false}
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
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
              <h3 className="font-display font-semibold text-foreground mb-3">
                Learning Streak Graph
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityTrendData}>
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
                      allowDecimals={false}
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
                      dataKey="actions"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
              <h3 className="font-display font-semibold text-foreground mb-3">
                Themes Per Media Type
              </h3>
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
                      allowDecimals={false}
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
                      fill="hsl(var(--primary))"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5">
          <h3 className="font-display font-semibold text-foreground mb-3">
            Activity Heatmap
          </h3>
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
            {heatmapDays.map((d) => (
              <div
                key={d.key}
                title={`${d.label}: ${d.count} activity`}
                className="aspect-square rounded-md border border-border/40"
                style={{
                  background:
                    d.count === 0
                      ? "hsl(var(--accent))"
                      : `hsl(var(--primary) / ${Math.min(0.25 + d.count * 0.15, 0.9)})`,
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Darker cells indicate higher activity on that day.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
