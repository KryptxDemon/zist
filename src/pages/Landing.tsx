import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Brain,
  Library,
  Rss,
  Sparkles,
  ArrowRight,
  Quote,
  BookOpen,
  Lightbulb,
  CheckCircle,
  Sun,
  Moon,
} from "lucide-react";

const features = [
  {
    icon: Lightbulb,
    title: "Themes & Concepts",
    description:
      "Every story has themes. Extract meaning from movies, shows, music, books, and games with AI-powered insights.",
  },
  {
    icon: BookOpen,
    title: "Vocabulary Builder",
    description:
      "Capture new words from song lyrics, movie dialogues, and books. Build vocabulary from everything you consume.",
  },
  {
    icon: Quote,
    title: "Quote Collection",
    description:
      "Save memorable lines from films, lyrics from songs, passages from books—with your interpretations.",
  },
  {
    icon: Brain,
    title: "Smart Quizzes",
    description:
      "Test your knowledge across all your media. Remember the themes, quotes, and vocabulary you've collected.",
  },
  {
    icon: Library,
    title: "Media Library",
    description:
      "Movies, TV shows, music, books, podcasts, games—all organized in one beautiful library.",
  },
  {
    icon: Rss,
    title: "Social Learning",
    description:
      "Share what you're learning from your favorite media and discover insights from friends.",
  },
];

const steps = [
  {
    step: "01",
    title: "Add Media",
    description:
      "Add movies, shows, music, books, podcasts, or games to your library.",
  },
  {
    step: "02",
    title: "Capture Insights",
    description:
      "Save themes, lyrics, dialogues, quotes, and vocabulary as you experience.",
  },
  {
    step: "03",
    title: "Test Yourself",
    description:
      "Take quizzes to remember what you've learned from all your media.",
  },
  {
    step: "04",
    title: "Share & Grow",
    description:
      "Share your insights and see what themes others are discovering.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/zist logo.png"
              alt="Zist Logo"
              className="h-9 w-9 rounded-xl object-contain"
            />
            <span className="font-display text-xl font-semibold text-foreground">
              Zist
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              )}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Log in
            </Button>
            <Button onClick={() => navigate("/signup")}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Everything has themes
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Learn from every movie, song,
            <br />
            <span className="text-gradient-warm">show, and book you love</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Zist helps you capture themes, vocabulary, and quotes from all your
            media—movies, TV shows, music, books, podcasts, and games. Your
            learning companion for everything you experience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="gap-2 text-lg px-8"
            >
              Start Learning Free
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/login")}
            >
              I already have an account
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need to learn deeply
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Capture insights from any media type and build lasting knowledge.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass grain rounded-2xl p-6 transition-smooth hover:glow-amber hover:border-primary/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How Zist works
            </h2>
            <p className="text-muted-foreground text-lg">
              Four simple steps to capture themes from everything you
              experience.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.step} className="relative">
                <div className="glass grain rounded-2xl p-6 h-full">
                  <span className="font-display text-4xl font-bold text-primary/30">
                    {step.step}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-foreground mt-3 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-muted-foreground/30 h-6 w-6" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="glass grain rounded-3xl p-8 sm:p-12 glow-soft">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to find themes in everything?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Start capturing insights from movies, shows, music, books, and
              more. Your media, your learning.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                Create Free Account
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/zist logo.png"
              alt="Zist Logo"
              className="h-7 w-7 rounded-lg object-contain"
            />
            <span className="font-display font-semibold text-foreground">
              Zist
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 Zist. Every story has themes.
          </p>
        </div>
      </footer>
    </div>
  );
}
