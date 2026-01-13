import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { MediaCardSkeleton } from '@/components/ui/skeleton-cards';
import { MediaTypeBadge } from '@/components/ui/media-type-badge';
import { mediaService, themeService, vocabService, quoteService } from '@/services/mediaService';
import { MediaItem, ThemeConcept, VocabItem, QuoteItem } from '@/types';
import {
  Plus,
  Brain,
  BookOpen,
  Quote,
  Lightbulb,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const mockVocabGrowth = [
  { day: 'Mon', words: 12 },
  { day: 'Tue', words: 15 },
  { day: 'Wed', words: 18 },
  { day: 'Thu', words: 22 },
  { day: 'Fri', words: 28 },
  { day: 'Sat', words: 35 },
  { day: 'Sun', words: 42 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [themes, setThemes] = useState<ThemeConcept[]>([]);
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [mediaData, allThemes, allVocab, allQuotes] = await Promise.all([
          mediaService.getAll(),
          Promise.resolve([]), // Would aggregate from all media
          Promise.resolve([]),
          Promise.resolve([]),
        ]);
        setMedia(mediaData);

        // Aggregate learning data from all media
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
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const stats = [
    { label: 'Themes Learned', value: themes.length, icon: Lightbulb, color: 'text-amber-400' },
    { label: 'Vocabulary', value: vocab.length, icon: BookOpen, color: 'text-emerald-400' },
    { label: 'Quotes Saved', value: quotes.length, icon: Quote, color: 'text-violet-400' },
    { label: 'Quizzes Taken', value: 3, icon: Brain, color: 'text-primary' },
  ];

  const quickActions = [
    { label: 'Add Media', icon: Plus, href: '/app/media/new' },
    { label: 'Start Quiz', icon: Brain, href: '/app/quiz' },
    { label: 'Add Vocab', icon: BookOpen, href: '/app/library' },
    { label: 'Add Quote', icon: Quote, href: '/app/library' },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, {user?.displayName || 'Learner'}
            </h1>
            <p className="text-muted-foreground mt-1">Here's your learning overview</p>
          </div>
          <Link to="/app/media/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Media
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass grain rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm">{stat.label}</span>
              </div>
              <p className="font-display text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Vocab Growth Chart */}
          <div className="lg:col-span-2 glass grain rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Vocabulary Growth</h2>
                <p className="text-muted-foreground text-sm">Words learned this week</p>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">+42%</span>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockVocabGrowth}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="words"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass grain rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-accent/50 hover:bg-accent transition-smooth text-center"
                >
                  <action.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Media & Top Themes */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Media */}
          <div className="glass grain rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Recent Media</h2>
              <Link to="/app/library" className="text-primary text-sm hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <MediaCardSkeleton />
              </div>
            ) : media.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No media yet. Add your first!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {media.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to={`/app/media/${item.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/50 transition-smooth"
                  >
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="w-12 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-accent rounded-lg flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <MediaTypeBadge type={item.type} size="sm" showIcon={false} />
                        {item.year && (
                          <span className="text-xs text-muted-foreground">{item.year}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Top Themes */}
          <div className="glass grain rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Top Themes</h2>
              <span className="text-muted-foreground text-sm">Across all media</span>
            </div>
            {themes.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Add themes to your media to see them here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {themes.slice(0, 4).map((theme) => (
                  <div
                    key={theme.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-accent/30"
                  >
                    <div className="w-1 h-10 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{theme.title}</h4>
                      {theme.summary && (
                        <p className="text-xs text-muted-foreground truncate">{theme.summary}</p>
                      )}
                    </div>
                    {theme.savedForLater && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Saved</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
