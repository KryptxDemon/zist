import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaTypeBadge } from "@/components/ui/media-type-badge";
import {
  mediaService,
  themeService,
  vocabService,
} from "@/services/mediaService";
import { apiClient } from "@/services/apiClient";
import { MediaItem } from "@/types";
import { Brain, Play, Trophy, BookOpen, Lightbulb, Quote } from "lucide-react";

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

  const quizTypes = [
    {
      id: "themes",
      label: "Themes Quiz",
      icon: Lightbulb,
      description: "Test your understanding of key themes",
    },
    {
      id: "vocab",
      label: "Vocabulary Quiz",
      icon: BookOpen,
      description: "Practice vocabulary words",
    },
    {
      id: "quotes",
      label: "Quote Matching",
      icon: Quote,
      description: "Match quotes to themes",
    },
  ];

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

        {/* Quiz Types */}
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Quiz Types
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {quizTypes.map((type) => (
              <div
                key={type.id}
                className="glass grain rounded-2xl p-5 flex items-start gap-4 transition-smooth hover:border-primary/30"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <type.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">
                    {type.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Choose Media */}
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Choose Media to Quiz
          </h2>
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
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/app/quiz/all"
                className="glass grain rounded-2xl p-5 flex items-center gap-4 transition-smooth hover:glow-amber hover:border-primary/30 group"
              >
                <div className="w-16 h-24 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-foreground truncate">
                    All Media Vocabulary
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Quiz on every saved word in your library
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      <Play className="h-3 w-3" />
                      Start Quiz
                    </Button>
                  </div>
                </div>
              </Link>
              {media.map((item) => (
                <Link
                  key={item.id}
                  to={`/app/quiz/${item.id}`}
                  className="glass grain rounded-2xl p-5 flex items-center gap-4 transition-smooth hover:glow-amber hover:border-primary/30 group"
                >
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="w-16 h-24 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-accent rounded-lg flex items-center justify-center shrink-0">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-foreground truncate">
                      {item.title}
                    </h3>
                    <div className="mt-1">
                      <MediaTypeBadge
                        type={item.type}
                        size="sm"
                        showIcon={false}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        <Play className="h-3 w-3" />
                        Start Quiz
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
