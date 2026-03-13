import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  mediaService,
  themeService,
  vocabService,
  quoteService,
} from "@/services/mediaService";
import { MediaItem, ThemeConcept, VocabItem, QuoteItem } from "@/types";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  TrendingUp,
  BookOpen,
  Bookmark,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";

const mockVocabGrowth = [
  { day: "Mon", words: 12 },
  { day: "Tue", words: 15 },
  { day: "Wed", words: 18 },
  { day: "Thu", words: 22 },
  { day: "Fri", words: 28 },
  { day: "Sat", words: 35 },
  { day: "Sun", words: 42 },
];

// Placeholder images for demo
const placeholderImages = {
  themes: [
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=400&fit=crop",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop",
    "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&h=400&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop",
  ],
  media: [
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop",
  ],
};

// Star rating component
function StarRating({
  rating,
  maxRating = 5,
}: {
  rating: number;
  maxRating?: number;
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxRating }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-yellow-400/30"}`}
        />
      ))}
    </div>
  );
}

// Media card with blurred background
function MediaCard({
  title,
  subtitle,
  description,
  rating,
  imageUrl,
  variant = "horizontal",
  colorScheme = "maroon",
}: {
  title: string;
  subtitle?: string;
  description?: string;
  rating?: number;
  imageUrl: string;
  variant?: "horizontal" | "vertical" | "square";
  colorScheme?: "maroon" | "purple" | "slate" | "rose";
}) {
  const colorClasses = {
    maroon: "from-rose-800/90 to-rose-900/80",
    purple: "from-purple-800/90 to-purple-900/80",
    slate: "from-slate-700/90 to-slate-800/80",
    rose: "from-rose-600/90 to-pink-700/80",
  };

  const sizeClasses = {
    horizontal: "h-24 sm:h-28",
    vertical: "h-40 sm:h-48",
    square: "h-28 sm:h-32",
  };

  return (
    <div
      className={`relative ${sizeClasses[variant]} rounded-2xl overflow-hidden cursor-pointer group transition-smooth hover:scale-[1.02] hover:shadow-lg`}
    >
      {/* Background image with blur */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="absolute inset-0 backdrop-blur-md" />

      {/* Gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${colorClasses[colorScheme]} opacity-80`}
      />

      {/* Content */}
      <div className="relative h-full flex items-center gap-3 p-4">
        {/* Avatar/thumbnail */}
        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-white/30 bg-white/20">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm sm:text-base truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-white/80 text-xs sm:text-sm truncate">
              {subtitle}
            </p>
          )}
          {description && (
            <p className="text-white/70 text-xs truncate mt-0.5">
              {description}
            </p>
          )}
          {rating !== undefined && (
            <div className="mt-1.5">
              <StarRating rating={rating} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Theme card with image
function ThemeCard({ title, imageUrl }: { title: string; imageUrl: string }) {
  return (
    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group transition-smooth hover:scale-[1.02] hover:shadow-lg">
      <img
        src={imageUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-white text-sm font-medium truncate">{title}</h3>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [themes, setThemes] = useState<ThemeConcept[]>([]);
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [mediaData, allThemes, allVocab, allQuotes] = await Promise.all([
          mediaService.getAll(),
          Promise.resolve([]),
          Promise.resolve([]),
          Promise.resolve([]),
        ]);
        setMedia(mediaData);

        const themesAgg: ThemeConcept[] = [];
        const vocabAgg: VocabItem[] = [];
        const quotesAgg: QuoteItem[] = [];

        for (const m of mediaData.slice(0, 3)) {
          const [t, v, q] = await Promise.all([
            themeService.getByMediaId(m.id),
            vocabService.getByMediaId(m.id),
            quoteService.getByMediaId(m.id),
          ]);
          themesAgg.push(...t);
          vocabAgg.push(...v);
          quotesAgg.push(...q);
        }

        setThemes(themesAgg);
        setVocab(vocabAgg);
        setQuotes(quotesAgg);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Sample media items for display
  const sampleMedia = [
    {
      title: "MOVIE NAME",
      subtitle: "Lorem",
      rating: 4,
      colorScheme: "slate" as const,
    },
    {
      title: "BOOK NAME",
      subtitle: "Author Name",
      description: "Lorem",
      rating: 4,
      colorScheme: "maroon" as const,
    },
    {
      title: "TV SHOW NAME",
      subtitle: "Author Name",
      description: "Lorem",
      rating: 4,
      colorScheme: "purple" as const,
    },
    {
      title: "BOOK NAME",
      subtitle: "Author Name",
      description: "Lorem",
      rating: 3,
      colorScheme: "rose" as const,
    },
    {
      title: "BOOK NAME",
      subtitle: "Author Name",
      description: "Lorem",
      rating: 4,
      colorScheme: "slate" as const,
    },
    {
      title: "BOOK NAME",
      subtitle: "Author Name",
      description: "Lorem",
      rating: 5,
      colorScheme: "maroon" as const,
    },
  ];

  const sampleThemes = [
    "Reading Adventures",
    "Just One More Chapter",
    "Books & Soul",
    "Peaceful Reading",
  ];

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto animate-fade-in pb-20 md:pb-0">
        {/* Search Bar */}
        <div className="flex justify-center mb-8 px-4">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search Your Books"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-12 rounded-full bg-card border-border/50 text-center placeholder:text-muted-foreground/70"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-6 px-4">
          {/* Left Sidebar - Saved Themes */}
          <aside className="hidden lg:block">
            <div className="glass rounded-2xl p-5 sticky top-24">
              <h2 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-primary" />
                Saved Themes
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Revisit your saved themes
              </p>

              {themes.length === 0 ? (
                <div className="text-center py-6">
                  <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No saved themes yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {themes.slice(0, 5).map((theme) => (
                    <div
                      key={theme.id}
                      className="p-2 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
                    >
                      <p className="text-sm text-foreground truncate">
                        {theme.title}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="space-y-8">
            {/* Your Recent Media */}
            <section>
              <h2 className="font-display text-lg font-semibold text-foreground mb-4 text-center">
                Your Recent Media
              </h2>

              {/* Media Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* First column - vertical */}
                <div className="space-y-4">
                  <MediaCard
                    title={media[0]?.title || sampleMedia[0].title}
                    subtitle={sampleMedia[0].subtitle}
                    rating={sampleMedia[0].rating}
                    imageUrl={placeholderImages.media[0]}
                    variant="vertical"
                    colorScheme={sampleMedia[0].colorScheme}
                  />
                </div>

                {/* Second column - two horizontal */}
                <div className="space-y-4">
                  <MediaCard
                    title={media[1]?.title || sampleMedia[1].title}
                    subtitle={sampleMedia[1].subtitle}
                    description={sampleMedia[1].description}
                    rating={sampleMedia[1].rating}
                    imageUrl={placeholderImages.media[1]}
                    colorScheme={sampleMedia[1].colorScheme}
                  />
                  <MediaCard
                    title={media[2]?.title || sampleMedia[2].title}
                    subtitle={sampleMedia[2].subtitle}
                    description={sampleMedia[2].description}
                    rating={sampleMedia[2].rating}
                    imageUrl={placeholderImages.media[2]}
                    colorScheme={sampleMedia[2].colorScheme}
                  />
                </div>

                {/* Third column - vertical */}
                <div className="hidden lg:block">
                  <MediaCard
                    title={media[3]?.title || sampleMedia[3].title}
                    subtitle={sampleMedia[3].subtitle}
                    description={sampleMedia[3].description}
                    rating={sampleMedia[3].rating}
                    imageUrl={placeholderImages.media[3]}
                    variant="vertical"
                    colorScheme={sampleMedia[3].colorScheme}
                  />
                </div>
              </div>

              {/* Bottom row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <MediaCard
                  title={media[4]?.title || sampleMedia[4].title}
                  subtitle={sampleMedia[4].subtitle}
                  description={sampleMedia[4].description}
                  rating={sampleMedia[4].rating}
                  imageUrl={placeholderImages.media[4]}
                  colorScheme={sampleMedia[4].colorScheme}
                />
                <MediaCard
                  title={media[5]?.title || sampleMedia[5].title}
                  subtitle={sampleMedia[5].subtitle}
                  description={sampleMedia[5].description}
                  rating={sampleMedia[5].rating}
                  imageUrl={placeholderImages.media[5]}
                  colorScheme={sampleMedia[5].colorScheme}
                />
              </div>
            </section>

            {/* Top Themes */}
            <section>
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                Top Themes
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {sampleThemes.map((theme, index) => (
                  <ThemeCard
                    key={index}
                    title={theme}
                    imageUrl={placeholderImages.themes[index]}
                  />
                ))}
              </div>
            </section>
          </main>

          {/* Right Sidebar */}
          <aside className="hidden lg:block space-y-6">
            {/* Vocabulary Growth */}
            <div className="glass rounded-2xl p-5">
              <h2 className="font-display font-semibold text-foreground mb-4">
                Vocabulary Growth
              </h2>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockVocabGrowth}>
                    <defs>
                      <linearGradient
                        id="vocabGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 10,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="words"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#vocabGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">+42% this week</span>
              </div>
            </div>

            {/* Graph Section */}
            <div className="glass rounded-2xl p-5">
              <h2 className="font-display font-semibold text-foreground mb-4">
                Graph
              </h2>
              <div className="h-40 flex items-center justify-center">
                <div className="relative w-32 h-32">
                  {/* Placeholder circular graph */}
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full -rotate-90"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeDasharray="200"
                      strokeDashoffset="50"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">
                      75%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Social Footer */}
        <footer className="mt-12 pt-6 border-t border-border/50">
          <div className="flex items-center justify-center gap-6">
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
