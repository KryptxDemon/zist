import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Sparkles,
  Plus,
  Play,
  BookOpen,
  Quote,
  Lightbulb,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  mediaService,
  quoteService,
  themeService,
  vocabService,
} from "@/services/mediaService";
import { MediaItem, QuoteItem, ThemeConcept, VocabItem } from "@/types";

const TYPE_FALLBACKS: Record<string, string> = {
  movie:
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
  tv: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80",
  book: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
  documentary:
    "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=900&q=80",
  podcast:
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=900&q=80",
  game: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=900&q=80",
};

function toDayCount(days: number, dateIso: string): boolean {
  const now = new Date();
  const d = new Date(dateIso);
  const ms = now.getTime() - d.getTime();
  return ms <= days * 24 * 60 * 60 * 1000;
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

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function openLibraryCover(title: string): string {
  return `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg?default=false`;
}

async function tmdbPoster(
  title: string,
  type: MediaItem["type"],
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
  if (
    !apiKey ||
    (type !== "movie" && type !== "tv" && type !== "documentary")
  ) {
    return null;
  }

  const endpoint = type === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(title)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const path = data?.results?.[0]?.poster_path as string | undefined;
    return path ? `https://image.tmdb.org/t/p/w500${path}` : null;
  } catch {
    return null;
  }
}

async function resolveCover(item: MediaItem): Promise<string> {
  if (item.coverUrl?.trim()) return item.coverUrl;

  if (item.type === "book") {
    return openLibraryCover(item.title);
  }

  const tmdb = await tmdbPoster(item.title, item.type);
  if (tmdb) return tmdb;

  return TYPE_FALLBACKS[item.type] || TYPE_FALLBACKS.movie;
}

function CoverRailCard({
  item,
  cover,
  themes,
  quotes,
}: {
  item: MediaItem;
  cover: string;
  themes: number;
  quotes: number;
}) {
  const isNew = toDayCount(7, item.createdAt);
  const inProgress = item.status === "in-progress";

  return (
    <Link
      to={`/app/media/${item.id}`}
      className="group snap-start min-w-[172px] w-[172px] sm:min-w-[196px] sm:w-[196px]"
    >
      <article className="relative overflow-hidden rounded-[1.15rem] bg-black/15 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.55)] transition-all duration-300 group-hover:shadow-[0_24px_50px_-18px_rgba(0,0,0,0.75)] group-hover:-translate-y-1.5">
        <div className="aspect-[2/3] overflow-hidden bg-accent/50">
          <img
            src={cover}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
            loading="lazy"
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3">
          <p className="line-clamp-1 text-sm font-semibold text-white">
            {item.title}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-white/75">
            {item.type}
          </p>
        </div>

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {isNew && (
            <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              New
            </span>
          )}
          {inProgress && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              In Progress
            </span>
          )}
          {themes > 0 && (
            <span className="rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white">
              {themes} Concepts
            </span>
          )}
          {quotes > 0 && (
            <span className="rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white">
              {quotes} Quotes
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}

function HorizontalRail({
  title,
  subtitle,
  items,
  coverById,
  themesByMedia,
  quotesByMedia,
}: {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  coverById: Record<string, string>;
  themesByMedia: Record<string, number>;
  quotesByMedia: Record<string, number>;
}) {
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground/90 mt-1">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
          <div className="flex gap-3 sm:gap-4 px-1">
            {items.map((item) => (
              <CoverRailCard
                key={item.id}
                item={item}
                cover={coverById[item.id] || TYPE_FALLBACKS[item.type]}
                themes={themesByMedia[item.id] || 0}
                quotes={quotesByMedia[item.id] || 0}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryImageCard({
  label,
  title,
  subtitle,
  href,
  image,
}: {
  label: string;
  title: string;
  subtitle: string;
  href: string;
  image: string;
}) {
  return (
    <Link to={href} className="group block">
      <article className="relative overflow-hidden rounded-2xl aspect-[16/7] shadow-[0_16px_36px_-18px_rgba(0,0,0,0.75)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_22px_44px_-16px_rgba(0,0,0,0.85)]">
        <img
          src={image}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15" />
        <div className="relative h-full p-4 sm:p-5 flex flex-col justify-end">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/75">{label}</p>
          <p className="mt-1 text-base sm:text-lg font-display font-semibold text-white line-clamp-1">
            {title}
          </p>
          <p className="mt-1 text-xs text-white/75 line-clamp-1">{subtitle}</p>
        </div>
      </article>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [themes, setThemes] = useState<ThemeConcept[]>([]);
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);

  const [coverById, setCoverById] = useState<Record<string, string>>({});

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
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCovers() {
      if (!media.length) {
        setCoverById({});
        return;
      }

      const items = await Promise.all(
        media.map(async (item) => ({
          id: item.id,
          src: await resolveCover(item),
        })),
      );

      if (cancelled) return;

      const next: Record<string, string> = {};
      items.forEach((x) => {
        next[x.id] = x.src;
      });
      setCoverById(next);
    }

    loadCovers();

    return () => {
      cancelled = true;
    };
  }, [media]);

  const lowerQuery = query.trim().toLowerCase();

  const filteredMedia = useMemo(() => {
    if (!lowerQuery) return media;
    return media.filter((m) => {
      const inTitle = m.title.toLowerCase().includes(lowerQuery);
      const inCreator = (m.creator || "").toLowerCase().includes(lowerQuery);
      const inTags = m.tags.some((t) => t.toLowerCase().includes(lowerQuery));
      return inTitle || inCreator || inTags;
    });
  }, [media, lowerQuery]);

  const sortedByRecent = useMemo(
    () =>
      [...filteredMedia].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [filteredMedia],
  );

  const recentlyAdded = useMemo(
    () =>
      [...filteredMedia]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 14),
    [filteredMedia],
  );

  const continueLearning = useMemo(() => {
    const inProgress = sortedByRecent.filter((m) => m.status === "in-progress");
    const planned = sortedByRecent.filter((m) => m.status === "planned");
    const completed = sortedByRecent.filter((m) => m.status === "completed");
    return [...inProgress, ...planned, ...completed].slice(0, 10);
  }, [sortedByRecent]);

  const topTheme = useMemo(() => {
    const map = new Map<string, number>();
    themes.forEach((t) => {
      map.set(t.title, (map.get(t.title) || 0) + 1);
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

    const scored = filteredMedia
      .map((m) => {
        const bag =
          `${m.title} ${m.creator || ""} ${m.tags.join(" ")}`.toLowerCase();
        const hit = tokens.reduce(
          (acc, token) => acc + (bag.includes(token) ? 1 : 0),
          0,
        );
        const categoryBoost = themes
          .filter((t) => t.mediaId === m.id)
          .reduce(
            (acc, t) =>
              acc +
              (themeCategory(t.title) === themeCategory(topTheme) ? 1 : 0),
            0,
          );
        return { media: m, score: hit + categoryBoost };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          new Date(b.media.updatedAt).getTime() -
            new Date(a.media.updatedAt).getTime(),
      )
      .map((x) => x.media);

    return scored.slice(0, 8);
  }, [filteredMedia, themes, topTheme]);

  const themesByMedia = useMemo(() => {
    const map: Record<string, number> = {};
    themes.forEach((t) => {
      map[t.mediaId] = (map[t.mediaId] || 0) + 1;
    });
    return map;
  }, [themes]);

  const quotesByMedia = useMemo(() => {
    const map: Record<string, number> = {};
    quotes.forEach((q) => {
      map[q.mediaId] = (map[q.mediaId] || 0) + 1;
    });
    return map;
  }, [quotes]);

  const savedThemeTags = useMemo(() => {
    const unique = new Set(
      themes.filter((t) => t.savedForLater).map((t) => t.title),
    );
    return [...unique].slice(0, 24);
  }, [themes]);

  const lastOpened = sortedByRecent[0];
  const featuredMedia =
    sortedByRecent[0] || recentlyAdded[0] || continueLearning[0];
  const featuredCover = featuredMedia
    ? coverById[featuredMedia.id] || TYPE_FALLBACKS[featuredMedia.type]
    : TYPE_FALLBACKS.movie;
  const lastConcept = useMemo(
    () =>
      [...themes].sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime(),
      )[0],
    [themes],
  );
  const lastConceptMedia = lastConcept
    ? media.find((m) => m.id === lastConcept.mediaId)
    : undefined;
  const quizMedia = continueLearning.find((m) => m.status === "in-progress") || lastOpened;

  const lastOpenedCover = lastOpened
    ? coverById[lastOpened.id] || TYPE_FALLBACKS[lastOpened.type]
    : TYPE_FALLBACKS.movie;
  const lastConceptCover = lastConceptMedia
    ? coverById[lastConceptMedia.id] || TYPE_FALLBACKS[lastConceptMedia.type]
    : TYPE_FALLBACKS.book;
  const quizCover = quizMedia
    ? coverById[quizMedia.id] || TYPE_FALLBACKS[quizMedia.type]
    : TYPE_FALLBACKS.tv;

  const continueQuizHref = lastOpened
    ? `/app/quiz/${lastOpened.id}`
    : "/app/quiz";
  const conceptHref = lastConceptMedia
    ? `/app/media/${lastConceptMedia.id}`
    : "/app/library";
  const quizHref = quizMedia ? `/app/quiz/${quizMedia.id}` : "/app/quiz";

  return (
    <AppLayout>
      <div className="relative max-w-[1600px] mx-auto pb-20 md:pb-0 space-y-9 animate-fade-in">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-55 bg-[radial-gradient(circle_at_15%_10%,hsl(var(--primary)/0.22),transparent_35%),radial-gradient(circle_at_90%_0%,hsl(var(--secondary)/0.2),transparent_35%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_58%)]" />

        <section className="relative overflow-hidden rounded-[1.8rem] min-h-[360px] sm:min-h-[430px]">
          <img
            src={featuredCover}
            alt={featuredMedia?.title || "Featured media"}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-secondary/30 blur-3xl" />

          <div className="relative h-full grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end p-6 sm:p-8 lg:p-10">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/80 font-medium">
                Welcome back
              </p>
              <h1 className="font-display mt-2 text-3xl sm:text-5xl lg:text-6xl leading-[1.03] font-semibold text-white drop-shadow-sm">
                {user?.displayName ? user.displayName.split(" ")[0] : "Learner"}
                ,
                <span className="block text-white/90">
                  find your next idea.
                </span>
              </h1>
              <p className="mt-3 text-white/80 max-w-2xl text-sm sm:text-base">
                A visual learning space inspired by the best streaming
                experiences: continue instantly, explore deeply, and keep
                momentum.
              </p>
              {featuredMedia ? (
                <p className="mt-3 text-xs sm:text-sm text-white/70">
                  Featured now:{" "}
                  <span className="text-white font-medium">
                    {featuredMedia.title}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 text-white/70 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles, creators, tags..."
                  className="pl-9 h-11 rounded-xl bg-white/10 text-white placeholder:text-white/65 border-white/20 focus-visible:ring-white/40"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/app/media/new">
                  <Button className="gap-2 bg-white text-black hover:bg-white/90">
                    <Plus className="h-4 w-4" />
                    Add Media
                  </Button>
                </Link>
                <Link to={continueQuizHref}>
                  <Button
                    variant="outline"
                    className="gap-2 border-white/30 text-white hover:bg-white/15"
                  >
                    <Play className="h-4 w-4" />
                    Start Learning
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryImageCard
            label="Last Opened Media"
            title={lastOpened?.title || "No media yet"}
            subtitle="Continue from where you left off"
            href={lastOpened ? `/app/media/${lastOpened.id}` : "/app/library"}
            image={lastOpenedCover}
          />
          <SummaryImageCard
            label="Last Concept Viewed"
            title={lastConcept?.title || "No concepts yet"}
            subtitle={lastConceptMedia ? `From ${lastConceptMedia.title}` : "Keep developing your understanding"}
            href={conceptHref}
            image={lastConceptCover}
          />
          <SummaryImageCard
            label="Continue Quiz"
            title={quizMedia?.title || "Resume challenge"}
            subtitle="Practice vocabulary and key themes"
            href={quizHref}
            image={quizCover}
          />
        </section>

        {isLoading ? (
          <section className="space-y-3">
            <div className="h-6 w-48 rounded bg-accent animate-pulse" />
            <div className="flex gap-4 overflow-x-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="min-w-[180px] w-[180px] aspect-[2/3] rounded-2xl bg-accent animate-pulse"
                />
              ))}
            </div>
          </section>
        ) : (
          <>
            <HorizontalRail
              title="Continue Learning"
              subtitle="Pick up from your latest in-progress titles"
              items={continueLearning}
              coverById={coverById}
              themesByMedia={themesByMedia}
              quotesByMedia={quotesByMedia}
            />

            <HorizontalRail
              title="Recently Added"
              subtitle="Fresh entries in your knowledge library"
              items={recentlyAdded}
              coverById={coverById}
              themesByMedia={themesByMedia}
              quotesByMedia={quotesByMedia}
            />

            <HorizontalRail
              title={`Because You Explored \"${topTheme}\"`}
              subtitle="Recommendations inferred from your current concept focus"
              items={recommendedForTheme}
              coverById={coverById}
              themesByMedia={themesByMedia}
              quotesByMedia={quotesByMedia}
            />
          </>
        )}

        <section className="rounded-2xl bg-card/70 backdrop-blur-sm p-5 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Saved Themes
            </h2>
            <Link
              to="/app/library"
              className="text-sm text-primary hover:underline"
            >
              Open in Library
            </Link>
          </div>

          {savedThemeTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved themes yet. Save themes in your media detail pages.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {savedThemeTags.map((tag) => (
                <Link
                  key={tag}
                  to={`/app/library?theme=${encodeURIComponent(tag)}`}
                  className="group rounded-full bg-background/70 px-4 py-2 text-sm text-foreground hover:bg-primary/10 transition-all shadow-sm"
                >
                  <span className="inline-flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-primary/90" />
                    {tag}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card/70 backdrop-blur-sm p-5 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.7)]">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Continue Learning Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/app/library"
              className="rounded-xl bg-background/70 p-4 hover:bg-primary/10 transition-colors"
            >
              <BookOpen className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Add a Concept
              </p>
            </Link>
            <Link
              to="/app/feed"
              className="rounded-xl bg-background/70 p-4 hover:bg-primary/10 transition-colors"
            >
              <Quote className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Save a Quote
              </p>
            </Link>
            <Link
              to="/app/vocabulary"
              className="rounded-xl bg-background/70 p-4 hover:bg-primary/10 transition-colors"
            >
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Grow Vocabulary
              </p>
            </Link>
          </div>
        </section>

        <footer className="pt-2 text-center text-xs text-muted-foreground">
          {user?.displayName ? `${user.displayName}'s` : "Your"} visual
          knowledge home
        </footer>
      </div>
    </AppLayout>
  );
}
