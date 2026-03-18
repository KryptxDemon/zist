import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { mediaService, vocabService } from "@/services/mediaService";
import { MediaItem, VocabItem } from "@/types";
import {
  BookOpen,
  Search,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
} from "lucide-react";

type VocabWithMedia = VocabItem & {
  mediaTitle: string;
  mediaType: MediaItem["type"];
};

type LearnFilter = "all" | "learned" | "unlearned";

export default function Vocabulary() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<VocabWithMedia[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [learnFilter, setLearnFilter] = useState<LearnFilter>("all");

  useEffect(() => {
    async function loadVocabulary() {
      setIsLoading(true);
      try {
        const media = await mediaService.getAll();
        const vocabByMedia = await Promise.all(
          media.map(async (m) => {
            const vocab = await vocabService.getByMediaId(m.id);
            return vocab.map((v) => ({
              ...v,
              mediaTitle: m.title,
              mediaType: m.type,
            }));
          }),
        );

        const flattened = vocabByMedia
          .flat()
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

        setItems(flattened);
      } catch (error) {
        console.error("Failed to load vocabulary:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadVocabulary();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (learnFilter === "learned" && !item.isLearned) return false;
      if (learnFilter === "unlearned" && item.isLearned) return false;

      if (!searchQuery) return true;

      const q = searchQuery.toLowerCase();
      return (
        item.word.toLowerCase().includes(q) ||
        (item.definition || "").toLowerCase().includes(q) ||
        item.mediaTitle.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [items, learnFilter, searchQuery]);

  const learnedCount = items.filter((item) => item.isLearned).length;
  const unlearnedCount = items.length - learnedCount;

  const toggleLearned = async (item: VocabWithMedia) => {
    try {
      const updated = await vocabService.update(item.id, {
        isLearned: !item.isLearned,
      });

      setItems((prev) =>
        prev.map((v) =>
          v.id === item.id
            ? {
                ...v,
                ...updated,
                mediaTitle: item.mediaTitle,
                mediaType: item.mediaType,
              }
            : v,
        ),
      );
    } catch (error) {
      console.error("Failed to update word status:", error);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20 md:pb-0">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Vocabulary
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and review all words from your media.
            </p>
          </div>
          <Link to="/app/library">
            <Button variant="outline">Go to Library</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">Total Words</p>
            <p className="font-display text-2xl font-semibold text-foreground mt-1">
              {items.length}
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">Learned</p>
            <p className="font-display text-2xl font-semibold text-emerald-400 mt-1">
              {learnedCount}
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">Need Review</p>
            <p className="font-display text-2xl font-semibold text-amber-400 mt-1">
              {unlearnedCount}
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by word, meaning, tag, or media..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={learnFilter === "all" ? "default" : "outline"}
                onClick={() => setLearnFilter("all")}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={learnFilter === "learned" ? "default" : "outline"}
                onClick={() => setLearnFilter("learned")}
              >
                Learned
              </Button>
              <Button
                size="sm"
                variant={learnFilter === "unlearned" ? "default" : "outline"}
                onClick={() => setLearnFilter("unlearned")}
              >
                Unlearned
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-shimmer h-24 rounded-xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No vocabulary found"
              description="Add vocabulary in a media detail page or adjust your filters."
            />
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/60 bg-card/40 p-4 flex flex-col sm:flex-row sm:items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {item.word}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground uppercase">
                        {item.mediaType}
                      </span>
                    </div>
                    {item.definition && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.definition}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      From {item.mediaTitle}
                      {item.whereFound ? ` • ${item.whereFound}` : ""}
                    </div>
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.tags.map((tag) => (
                          <span
                            key={`${item.id}-${tag}`}
                            className="text-xs px-2 py-0.5 bg-accent/60 rounded-full text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={item.isLearned ? "default" : "outline"}
                      className="gap-1"
                      onClick={() => toggleLearned(item)}
                    >
                      {item.isLearned ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                      {item.isLearned ? "Learned" : "Mark Learned"}
                    </Button>
                    <Link to={`/app/media/${item.mediaId}`}>
                      <Button size="sm" variant="ghost">
                        Open Media
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
