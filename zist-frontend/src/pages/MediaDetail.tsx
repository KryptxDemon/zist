import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaTypeBadge } from "@/components/ui/media-type-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ThemeCardSkeleton } from "@/components/ui/skeleton-cards";
import { useToast } from "@/hooks/use-toast";
import {
  mediaService,
  themeService,
  factService,
  vocabService,
  quoteService,
} from "@/services/mediaService";
import {
  wikiService,
  dictionaryService,
  aiService,
} from "@/services/externalServices";
import {
  MediaItem,
  ThemeConcept,
  FactItem,
  VocabItem,
  QuoteItem,
  MediaStats,
} from "@/types";
import {
  ArrowLeft,
  Plus,
  Lightbulb,
  BookOpen,
  Quote,
  Info,
  Brain,
  ExternalLink,
  Sparkles,
  Check,
  Bookmark,
  Copy,
  Trash2,
  Edit2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function MediaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [themes, setThemes] = useState<ThemeConcept[]>([]);
  const [facts, setFacts] = useState<FactItem[]>([]);
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [
          mediaData,
          statsData,
          themesData,
          factsData,
          vocabData,
          quotesData,
        ] = await Promise.all([
          mediaService.getById(id),
          mediaService.getStats(id),
          themeService.getByMediaId(id),
          factService.getByMediaId(id),
          vocabService.getByMediaId(id),
          quoteService.getByMediaId(id),
        ]);

        if (!mediaData) {
          navigate("/app/library");
          return;
        }

        setMedia(mediaData);
        setStats(statsData);
        setThemes(themesData);
        setFacts(factsData);
        setVocab(vocabData);
        setQuotes(quotesData);
      } catch (error) {
        console.error("Failed to load media:", error);
        toast({ title: "Failed to load media", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id, navigate, toast]);

  const handleDeleteMedia = async () => {
    if (!media) return;
    const confirmed = window.confirm(
      `Delete "${media.title}"? This will remove its themes, vocab, facts, and quotes.`,
    );
    if (!confirmed) return;

    try {
      await mediaService.delete(media.id);
      toast({ title: "Media deleted" });
      navigate("/app/library");
    } catch (error) {
      toast({
        title: "Failed to delete media",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !media) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="flex items-center gap-4 mb-8">
            <div className="skeleton-shimmer h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <div className="skeleton-shimmer h-6 w-48" />
              <div className="skeleton-shimmer h-4 w-32" />
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="skeleton-shimmer aspect-[2/3] rounded-2xl" />
            <div className="lg:col-span-2 space-y-4">
              <ThemeCardSkeleton />
              <ThemeCardSkeleton />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto pb-20 md:pb-0 animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/library")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground truncate">
                {media.title}
              </h1>
              <MediaTypeBadge type={media.type} size="sm" />
              <StatusBadge status={media.status} size="sm" />
            </div>
            <p className="text-muted-foreground">
              {media.creator && `${media.creator} • `}
              {media.year}
            </p>
          </div>
          <Link to={`/app/quiz/${media.id}`}>
            <Button variant="outline" className="gap-2">
              <Brain className="h-4 w-4" />
              Quiz
            </Button>
          </Link>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDeleteMedia}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>

        {/* Media Header with Cover */}
        <div className="glass grain rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Cover */}
            <div className="shrink-0">
              {media.coverUrl ? (
                <img
                  src={media.coverUrl}
                  alt={media.title}
                  className="w-32 h-48 object-cover rounded-xl"
                />
              ) : (
                <div className="w-32 h-48 bg-accent rounded-xl flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  icon={Lightbulb}
                  label="Themes"
                  value={stats?.themes || 0}
                  color="text-amber-400"
                />
                <StatCard
                  icon={Info}
                  label="Facts"
                  value={stats?.facts || 0}
                  color="text-sky-400"
                />
                <StatCard
                  icon={BookOpen}
                  label="Vocabulary"
                  value={stats?.vocab || 0}
                  color="text-emerald-400"
                />
                <StatCard
                  icon={Quote}
                  label="Quotes"
                  value={stats?.quotes || 0}
                  color="text-violet-400"
                />
              </div>

              {/* Tags */}
              {media.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {media.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-sm px-3 py-1 bg-accent rounded-full text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto glass mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="themes">Themes</TabsTrigger>
            <TabsTrigger value="vocab">Vocabulary</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              media={media}
              stats={stats}
              themes={themes}
              vocab={vocab}
              quotes={quotes}
            />
          </TabsContent>

          <TabsContent value="themes">
            <ThemesTab
              mediaId={media.id}
              mediaTitle={media.title}
              themes={themes}
              setThemes={setThemes}
            />
          </TabsContent>

          <TabsContent value="vocab">
            <VocabTab mediaId={media.id} vocab={vocab} setVocab={setVocab} />
          </TabsContent>

          <TabsContent value="quotes">
            <QuotesTab
              mediaId={media.id}
              quotes={quotes}
              setQuotes={setQuotes}
              themes={themes}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="text-center p-3 rounded-xl bg-accent/30">
      <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function OverviewTab({
  media,
  stats,
  themes,
  vocab,
  quotes,
}: {
  media: MediaItem;
  stats: MediaStats | null;
  themes: ThemeConcept[];
  vocab: VocabItem[];
  quotes: QuoteItem[];
}) {
  return (
    <div className="space-y-6">
      {/* Learning Snapshot */}
      <div className="glass grain rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">
          Learning Snapshot
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Top Themes
            </h4>
            {themes.length > 0 ? (
              themes.slice(0, 3).map((theme) => (
                <p key={theme.id} className="text-sm text-foreground truncate">
                  {theme.title}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No themes yet
              </p>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Recent Vocabulary
            </h4>
            {vocab.length > 0 ? (
              vocab.slice(0, 3).map((v) => (
                <p key={v.id} className="text-sm text-foreground truncate">
                  {v.word}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No vocabulary yet
              </p>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Latest Quote
            </h4>
            {quotes.length > 0 ? (
              <p className="text-sm text-foreground line-clamp-3 italic">
                "{quotes[0].text}"
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No quotes yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="glass grain rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">
          Progress Summary
        </h3>
        <div className="space-y-4">
          <ProgressBar label="Themes Captured" value={themes.length} max={10} />
          <ProgressBar
            label="Words Learned"
            value={vocab.filter((v) => v.isLearned).length}
            max={vocab.length || 1}
          />
          <ProgressBar
            label="Quotes Saved"
            value={quotes.filter((q) => q.isBookmarked).length}
            max={quotes.length || 1}
          />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 bg-accent rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ThemesTab({
  mediaId,
  mediaTitle,
  themes,
  setThemes,
}: {
  mediaId: string;
  mediaTitle: string;
  themes: ThemeConcept[];
  setThemes: (themes: ThemeConcept[]) => void;
}) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTheme, setNewTheme] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [examples, setExamples] = useState<string[]>([]);
  const [isLoadingExamples, setIsLoadingExamples] = useState(false);

  useEffect(() => {
    let canceled = false;

    const loadExamples = async () => {
      setIsLoadingExamples(true);
      try {
        const items = await wikiService.suggestThemes(mediaTitle);
        if (canceled) return;
        const existing = new Set(
          themes.map((theme) => theme.title.toLowerCase()),
        );
        const unique = Array.from(
          new Set(items.map((item) => item.trim()).filter(Boolean)),
        ).filter((item) => !existing.has(item.toLowerCase()));
        setExamples(unique.slice(0, 8));
      } catch {
        if (!canceled) {
          setExamples([]);
        }
      } finally {
        if (!canceled) {
          setIsLoadingExamples(false);
        }
      }
    };

    void loadExamples();
    return () => {
      canceled = true;
    };
  }, [mediaTitle, themes]);

  const createThemeWithSummary = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const exists = themes.some(
      (theme) => theme.title.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      toast({ title: "Theme already exists" });
      return;
    }

    setIsAdding(true);
    try {
      const { summary, sourceUrl } =
        await wikiService.getSummaryByTopic(trimmed);
      const created = await themeService.create({
        mediaId,
        title: trimmed,
        summary,
        sourceUrl,
        savedForLater: false,
      });

      setThemes([created, ...themes]);
      setExamples((prev) =>
        prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
      );
      toast({ title: "Theme added with summary" });
    } catch (error) {
      toast({
        title: "Failed to add theme",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddTheme = async () => {
    const title = newTheme.trim();
    if (!title) return;
    await createThemeWithSummary(title);
    setNewTheme("");
    setIsAddOpen(false);
  };

  const handleGenerateThemes = async () => {
    setIsGenerating(true);
    try {
      const result = await themeService.generateForMedia(mediaId, 5);
      const byId = new Map(themes.map((item) => [item.id, item]));
      for (const item of result.updated) {
        byId.set(item.id, item);
      }
      for (const item of result.created) {
        byId.set(item.id, item);
      }

      setThemes(
        Array.from(byId.values()).sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      );

      toast({
        title: "Themes generated",
        description: result.usedAi
          ? "Generated using TMDb + Gemini"
          : "Generated using TMDb keyword fallback",
      });
    } catch (error) {
      toast({
        title: "Failed to generate themes",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Themes & Concepts
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={handleGenerateThemes}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate 5 Themes
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Theme
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Theme</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Theme Title</Label>
                  <Input
                    placeholder="e.g., Religious Extremism"
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAddTheme}
                  disabled={isAdding}
                  className="w-full"
                >
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Add Theme
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-background/40 p-3">
        <p className="text-sm font-medium text-foreground">
          Wikipedia examples for this title
        </p>
        {isLoadingExamples ? (
          <p className="text-xs text-muted-foreground mt-2">
            Loading suggestions...
          </p>
        ) : examples.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {examples.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => void createThemeWithSummary(item)}
                disabled={isAdding}
              >
                {item}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            No clear themes found automatically. You can add a theme manually
            and we will fetch its summary from Wikipedia.
          </p>
        )}
      </div>

      {themes.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No themes yet"
          description="Add themes and concepts you've learned from this media."
          action={
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Theme
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              themes={themes}
              setThemes={setThemes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  themes,
  setThemes,
}: {
  theme: ThemeConcept;
  themes: ThemeConcept[];
  setThemes: (themes: ThemeConcept[]) => void;
}) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [userUnderstanding, setUserUnderstanding] = useState(
    theme.userUnderstanding || "",
  );

  const handleFetchSummary = async () => {
    setIsFetching(true);
    try {
      const { summary, sourceUrl } = await wikiService.getSummaryByTopic(
        theme.title,
      );
      const updated = await themeService.update(theme.id, {
        summary,
        sourceUrl,
      });
      setThemes(themes.map((t) => (t.id === theme.id ? updated : t)));
      toast({ title: "Summary fetched!" });
    } catch (error) {
      toast({ title: "Failed to fetch summary", variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveUnderstanding = async () => {
    try {
      const updated = await themeService.update(theme.id, {
        userUnderstanding,
      });
      setThemes(themes.map((t) => (t.id === theme.id ? updated : t)));
      toast({ title: "Saved!" });
    } catch (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleToggleSave = async () => {
    try {
      const updated = await themeService.update(theme.id, {
        savedForLater: !theme.savedForLater,
      });
      setThemes(themes.map((t) => (t.id === theme.id ? updated : t)));
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleDeleteTheme = async () => {
    const confirmed = window.confirm(`Delete theme "${theme.title}"?`);
    if (!confirmed) return;

    try {
      await themeService.delete(theme.id);
      setThemes(themes.filter((t) => t.id !== theme.id));
      toast({ title: "Theme deleted" });
    } catch (error) {
      toast({
        title: "Failed to delete theme",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="glass grain rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-display font-semibold text-foreground">
              {theme.title}
            </h4>
            {theme.savedForLater && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                Saved
              </span>
            )}
          </div>
          {theme.summary ? (
            <p className="text-sm text-muted-foreground">{theme.summary}</p>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchSummary}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              Fetch Summary
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleDeleteTheme}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleToggleSave}>
            <Bookmark
              className={cn(
                "h-4 w-4",
                theme.savedForLater && "fill-primary text-primary",
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {theme.sourceUrl && (
            <a
              href={theme.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </a>
          )}
          <div className="space-y-2">
            <Label>My Understanding</Label>
            <Textarea
              placeholder="Write your understanding of this theme..."
              value={userUnderstanding}
              onChange={(e) => setUserUnderstanding(e.target.value)}
              rows={3}
            />
            <Button size="sm" onClick={handleSaveUnderstanding}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FactsTab({
  mediaId,
  facts,
  setFacts,
}: {
  mediaId: string;
  facts: FactItem[];
  setFacts: (facts: FactItem[]) => void;
}) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newFact, setNewFact] = useState({
    content: "",
    category: "context" as FactItem["category"],
    source: "",
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddFact = async () => {
    if (!newFact.content.trim()) return;
    setIsAdding(true);
    try {
      const fact = await factService.create({
        mediaId,
        content: newFact.content.trim(),
        category: newFact.category,
        source: newFact.source.trim() || undefined,
        order: facts.length,
      });
      setFacts([...facts, fact]);
      setNewFact({ content: "", category: "context", source: "" });
      setIsAddOpen(false);
      toast({ title: "Fact added!" });
    } catch (error) {
      toast({ title: "Failed to add fact", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const categoryLabels = {
    misconception: "Common Misconception",
    reference: "Reference/Influence",
    context: "Context & Background",
  };

  const groupedFacts = {
    misconception: facts.filter((f) => f.category === "misconception"),
    reference: facts.filter((f) => f.category === "reference"),
    context: facts.filter((f) => f.category === "context"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Facts & Context
        </h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Fact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Fact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newFact.category}
                  onValueChange={(v) =>
                    setNewFact({
                      ...newFact,
                      category: v as FactItem["category"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="misconception">
                      Common Misconception
                    </SelectItem>
                    <SelectItem value="reference">
                      Reference/Influence
                    </SelectItem>
                    <SelectItem value="context">
                      Context & Background
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  placeholder="Enter the fact..."
                  value={newFact.content}
                  onChange={(e) =>
                    setNewFact({ ...newFact, content: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Source (optional)</Label>
                <Input
                  placeholder="e.g., Wikipedia"
                  value={newFact.source}
                  onChange={(e) =>
                    setNewFact({ ...newFact, source: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={handleAddFact}
                disabled={isAdding}
                className="w-full"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Add Fact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {facts.length === 0 ? (
        <EmptyState
          icon={Info}
          title="No facts yet"
          description="Add facts, misconceptions, and context about this media."
          action={
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Fact
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFacts).map(
            ([category, categoryFacts]) =>
              categoryFacts.length > 0 && (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h4>
                  {categoryFacts.map((fact) => (
                    <div key={fact.id} className="glass rounded-xl p-4">
                      <p className="text-foreground">{fact.content}</p>
                      {fact.source && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Source: {fact.source}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}

function VocabTab({
  mediaId,
  vocab,
  setVocab,
}: {
  mediaId: string;
  vocab: VocabItem[];
  setVocab: (vocab: VocabItem[]) => void;
}) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newWord, setNewWord] = useState({
    word: "",
    whereFound: "",
    tags: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "learned" | "unlearned">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddWord = async () => {
    if (!newWord.word.trim()) return;
    setIsAdding(true);
    try {
      // Fetch definition
      const { definition, example } =
        await dictionaryService.getDefinitionAndExample(newWord.word);

      const word = await vocabService.create({
        mediaId,
        word: newWord.word.trim(),
        definition,
        exampleSentence: example,
        whereFound: newWord.whereFound.trim() || undefined,
        tags: newWord.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isLearned: false,
      });
      setVocab([...vocab, word]);
      setNewWord({ word: "", whereFound: "", tags: "" });
      setIsAddOpen(false);
      toast({ title: "Word added with definition!" });
    } catch (error) {
      toast({
        title: "Failed to add word",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const filteredVocab = vocab
    .filter((v) => {
      if (filter === "learned") return v.isLearned;
      if (filter === "unlearned") return !v.isLearned;
      return true;
    })
    .filter((v) => {
      if (!searchQuery) return true;
      return v.word.toLowerCase().includes(searchQuery.toLowerCase());
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Vocabulary Tracker
        </h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Word
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Word</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Word</Label>
                <Input
                  placeholder="e.g., apostate"
                  value={newWord.word}
                  onChange={(e) =>
                    setNewWord({ ...newWord, word: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Where Found (optional)</Label>
                <Input
                  placeholder="e.g., Chapter 3, Scene 5"
                  value={newWord.whereFound}
                  onChange={(e) =>
                    setNewWord({ ...newWord, whereFound: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  placeholder="religious, philosophy"
                  value={newWord.tags}
                  onChange={(e) =>
                    setNewWord({ ...newWord, tags: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={handleAddWord}
                disabled={isAdding}
                className="w-full"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Add & Fetch Definition
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Search words..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Words</SelectItem>
            <SelectItem value="learned">Learned</SelectItem>
            <SelectItem value="unlearned">Unlearned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {vocab.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No vocabulary yet"
          description="Add new words you encounter while consuming this media."
          action={
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Word
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredVocab.map((word) => (
            <VocabCard
              key={word.id}
              word={word}
              vocab={vocab}
              setVocab={setVocab}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VocabCard({
  word,
  vocab,
  setVocab,
}: {
  word: VocabItem;
  vocab: VocabItem[];
  setVocab: (vocab: VocabItem[]) => void;
}) {
  const { toast } = useToast();

  const handleToggleLearned = async () => {
    try {
      const updated = await vocabService.update(word.id, {
        isLearned: !word.isLearned,
      });
      setVocab(vocab.map((v) => (v.id === word.id ? updated : v)));
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleDeleteWord = async () => {
    const confirmed = window.confirm(`Delete word "${word.word}"?`);
    if (!confirmed) return;

    try {
      await vocabService.delete(word.id);
      setVocab(vocab.filter((v) => v.id !== word.id));
      toast({ title: "Word deleted" });
    } catch (error) {
      toast({
        title: "Failed to delete word",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className={cn(
        "glass rounded-2xl p-5",
        word.isLearned && "border-emerald-500/30",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-display font-semibold text-foreground text-lg">
          {word.word}
        </h4>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleDeleteWord}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <button
            onClick={handleToggleLearned}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              word.isLearned
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
      {word.definition && (
        <p className="text-sm text-muted-foreground mb-2">{word.definition}</p>
      )}
      {word.exampleSentence && (
        <p className="text-sm text-foreground italic mb-3">
          "{word.exampleSentence}"
        </p>
      )}
      {word.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {word.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-accent rounded-full text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function QuotesTab({
  mediaId,
  quotes,
  setQuotes,
  themes,
}: {
  mediaId: string;
  quotes: QuoteItem[];
  setQuotes: (quotes: QuoteItem[]) => void;
  themes: ThemeConcept[];
}) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newQuote, setNewQuote] = useState({
    text: "",
    speaker: "",
    reference: "",
    themeId: "",
    userMeaning: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddQuote = async () => {
    if (!newQuote.text.trim()) return;
    setIsAdding(true);
    try {
      const quote = await quoteService.create({
        mediaId,
        text: newQuote.text.trim(),
        speaker: newQuote.speaker.trim() || undefined,
        reference: newQuote.reference.trim() || undefined,
        relatedThemeId: newQuote.themeId || undefined,
        userMeaning: newQuote.userMeaning.trim() || undefined,
        isBookmarked: false,
      });
      setQuotes([...quotes, quote]);
      setNewQuote({
        text: "",
        speaker: "",
        reference: "",
        themeId: "",
        userMeaning: "",
      });
      setIsAddOpen(false);
      toast({ title: "Quote added!" });
    } catch (error) {
      toast({ title: "Failed to add quote", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleGenerateQuotes = async () => {
    setIsGenerating(true);
    try {
      const result = await quoteService.generateForMedia(mediaId, 5);
      const byId = new Map(quotes.map((item) => [item.id, item]));
      for (const item of result.updated) {
        byId.set(item.id, item);
      }
      for (const item of result.created) {
        byId.set(item.id, item);
      }

      setQuotes(
        Array.from(byId.values()).sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );

      toast({
        title: "Quotes generated",
        description:
          result.created.length > 0
            ? `${result.created.length} quotes added from TMDb + Gemini`
            : "No verified quotes found for this title",
      });
    } catch (error) {
      toast({
        title: "Failed to generate quotes",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Quotes & Meaning
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={handleGenerateQuotes}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate 5 Quotes
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Quote</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Quote</Label>
                  <Textarea
                    placeholder="Enter the quote..."
                    value={newQuote.text}
                    onChange={(e) =>
                      setNewQuote({ ...newQuote, text: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Speaker/Character</Label>
                    <Input
                      placeholder="Who said it?"
                      value={newQuote.speaker}
                      onChange={(e) =>
                        setNewQuote({ ...newQuote, speaker: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference</Label>
                    <Input
                      placeholder="Chapter, scene..."
                      value={newQuote.reference}
                      onChange={(e) =>
                        setNewQuote({ ...newQuote, reference: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Related Theme</Label>
                  <Select
                    value={newQuote.themeId}
                    onValueChange={(v) =>
                      setNewQuote({ ...newQuote, themeId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme..." />
                    </SelectTrigger>
                    <SelectContent>
                      {themes.map((theme) => (
                        <SelectItem key={theme.id} value={theme.id}>
                          {theme.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>What I Think It Means</Label>
                  <Textarea
                    placeholder="Your interpretation..."
                    value={newQuote.userMeaning}
                    onChange={(e) =>
                      setNewQuote({ ...newQuote, userMeaning: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleAddQuote}
                  disabled={isAdding}
                  className="w-full"
                >
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Add Quote
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          icon={Quote}
          title="No quotes yet"
          description="Save meaningful quotes and your interpretations."
          action={
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Quote
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              quotes={quotes}
              setQuotes={setQuotes}
              themes={themes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuoteCard({
  quote,
  quotes,
  setQuotes,
  themes,
}: {
  quote: QuoteItem;
  quotes: QuoteItem[];
  setQuotes: (quotes: QuoteItem[]) => void;
  themes: ThemeConcept[];
}) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const relatedTheme = themes.find((t) => t.id === quote.relatedThemeId);

  const handleToggleBookmark = async () => {
    try {
      const updated = await quoteService.update(quote.id, {
        isBookmarked: !quote.isBookmarked,
      });
      setQuotes(quotes.map((q) => (q.id === quote.id ? updated : q)));
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(quote.text);
    toast({ title: "Quote copied!" });
  };

  const handleGenerateAIMeaning = async () => {
    setIsGeneratingAI(true);
    try {
      const aiMeaning = await aiService.generateQuoteMeaning(quote.text);
      const updated = await quoteService.update(quote.id, { aiMeaning });
      setQuotes(quotes.map((q) => (q.id === quote.id ? updated : q)));
      toast({ title: "AI meaning generated!" });
    } catch (error) {
      toast({ title: "Failed to generate", variant: "destructive" });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="glass grain rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-foreground text-lg italic mb-2">"{quote.text}"</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {quote.speaker && <span>— {quote.speaker}</span>}
            {quote.reference && <span>• {quote.reference}</span>}
          </div>
          {relatedTheme && (
            <span className="inline-block mt-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {relatedTheme.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleToggleBookmark}>
            <Bookmark
              className={cn(
                "h-4 w-4",
                quote.isBookmarked && "fill-primary text-primary",
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {quote.userMeaning && (
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">
                My Interpretation
              </h5>
              <p className="text-foreground">{quote.userMeaning}</p>
            </div>
          )}

          {quote.aiMeaning ? (
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">
                AI Interpretation
              </h5>
              <p className="text-foreground">{quote.aiMeaning}</p>
              <p className="text-xs text-muted-foreground mt-1 italic">
                AI meaning is a suggestion; verify context.
              </p>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAIMeaning}
              disabled={isGeneratingAI}
            >
              {isGeneratingAI ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              Generate AI Meaning
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
