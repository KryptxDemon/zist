import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  mediaService,
  themeService,
  vocabService,
} from "@/services/mediaService";
import { apiClient } from "@/services/apiClient";
import { MediaItem } from "@/types";
import {
  Brain,
  Play,
  Trophy,
  BookOpen,
  Sparkles,
  Lightbulb,
  Quote,
} from "lucide-react";

export default function QuizHub() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageAccuracy: 0,
    themesTested: 0,
    wordsReviewed: 0,
  });

  useEffect(() => {
    async function loadMedia() {
      try {
        const data = await mediaService.getAll();
        setMedia(data);

        const [quizStats, themesByMedia, vocabByMedia] = await Promise.all([
          apiClient.get<{ total_quizzes: number; average_accuracy: number }>(
            "/quiz/stats",
          ),
          Promise.all(data.map((item) => themeService.getByMediaId(item.id))),
          Promise.all(data.map((item) => vocabService.getByMediaId(item.id))),
        ]);

        const themeCount = themesByMedia.flat().length;
        const vocabCount = vocabByMedia.flat().length;

        setStats({
          totalQuizzes: quizStats.total_quizzes || 0,
          averageAccuracy: Math.round(quizStats.average_accuracy || 0),
          themesTested: themeCount,
          wordsReviewed: vocabCount,
        });
      } catch (error) {
        console.error("Failed to load media:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadMedia();
  }, []);

  const collectiveQuizHref = "/app/quiz/collective";

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-0">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Quiz Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Test your knowledge from what you've learned
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass grain rounded-2xl p-5 text-center">
            <Trophy className="h-6 w-6 text-amber-400 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold text-foreground">
              {stats.totalQuizzes}
            </p>
            <p className="text-sm text-muted-foreground">Quizzes Taken</p>
          </div>
          <div className="glass grain rounded-2xl p-5 text-center">
            <Brain className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="font-display text-2xl font-bold text-foreground">
              {stats.averageAccuracy}%
            </p>
            <p className="text-sm text-muted-foreground">Avg. Score</p>
          </div>
          <div className="glass grain rounded-2xl p-5 text-center">
            <Lightbulb className="h-6 w-6 text-violet-400 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold text-foreground">
              {stats.themesTested}
            </p>
            <p className="text-sm text-muted-foreground">Themes Tested</p>
          </div>
          <div className="glass grain rounded-2xl p-5 text-center">
            <BookOpen className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold text-foreground">
              {stats.wordsReviewed}
            </p>
            <p className="text-sm text-muted-foreground">Words Reviewed</p>
          </div>
        </div>

        <section className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Combined Quiz: Quotes, Themes, and Vocabulary
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Pull questions from all saved media and mix vocabulary, themes,
              and quotes into one session with AI-curated distractors.
            </p>
          </div>
          <Link to={collectiveQuizHref}>
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" />
              Start Combined Quiz
            </Button>
          </Link>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="glass grain rounded-2xl p-5 text-center">
            <BookOpen className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold text-foreground">
              {stats.wordsReviewed}
            </p>
            <p className="text-sm text-muted-foreground">Vocabulary prompts</p>
          </div>
          <div className="glass grain rounded-2xl p-5 text-center">
            <Lightbulb className="h-6 w-6 text-violet-400 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold text-foreground">
              {stats.themesTested}
            </p>
            <p className="text-sm text-muted-foreground">Theme prompts</p>
          </div>
          <div className="glass grain rounded-2xl p-5 text-center">
            <Quote className="h-6 w-6 text-sky-400 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold text-foreground">
              {media.length}
            </p>
            <p className="text-sm text-muted-foreground">Media sources</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />
            ))}
          </div>
        ) : media.length === 0 ? (
          <EmptyState
            icon={Brain}
            title="No media to quiz"
            description="Add media to your library first, then come back to test yourself."
            action={
              <Link to="/app/media/new">
                <Button>Add Media</Button>
              </Link>
            }
          />
        ) : null}
      </div>
    </AppLayout>
  );
}
