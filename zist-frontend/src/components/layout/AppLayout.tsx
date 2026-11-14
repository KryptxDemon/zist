import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Library,
  Brain,
  User,
  Users,
  LogOut,
  Plus,
  BookOpen,
  Tv,
  Film,
  Gamepad2,
  Headphones,
  FileVideo,
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  LineChart,
  Rss,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { path: "/app", label: "Home" },
  { path: "/app/feed", label: "Feed" },
  { path: "/app/library", label: "Library" },
  { path: "/app/vocabulary", label: "Vocabulary" },
  { path: "/app/insights", label: "Insights" },
];

const quizItems = [
  { path: "/app/quiz", label: "Quiz Hub" },
  { path: "/app/quiz/collective", label: "Start Quiz" },
];

const mediaTypes = [
  { type: "movie", icon: Film, label: "Movie" },
  { type: "tv", icon: Tv, label: "TV Show" },
  { type: "book", icon: BookOpen, label: "Book" },
  { type: "documentary", icon: FileVideo, label: "Documentary" },
  { type: "podcast", icon: Headphones, label: "Podcast" },
  { type: "game", icon: Gamepad2, label: "Game" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isQuizActive = location.pathname.startsWith("/app/quiz");

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[62px] bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-xs">
        <div className="flex h-full items-center justify-between px-4 lg:px-8 max-w-[1600px] mx-auto">
          {/* Logo & Brand Wordmark */}
          <Link to="/app" className="group flex items-center gap-2.5">
            <div className="relative p-1 rounded-lg bg-accent/40 border border-border/60 transition-transform duration-200 group-hover:scale-105">
              <img
                src="/zistlogo-2.png"
                alt="Zist Logo"
                className="h-7 w-7 rounded-md object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-brand text-base tracking-[0.24em] font-extrabold uppercase text-foreground transition-colors group-hover:text-primary leading-tight">
                ZIST
              </span>
              
            </div>
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative py-1.5 text-[13px] tracking-wide font-medium transition-all duration-200",
                    isActive
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground/80 hover:text-foreground",
                  )}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-2.5 left-0 right-0 h-[2px] bg-primary rounded-full transition-all" />
                  )}
                </Link>
              );
            })}

            {/* Quiz Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-1 py-1.5 text-[13px] tracking-wide font-medium transition-all duration-200 outline-none",
                  isQuizActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground/80 hover:text-foreground",
                )}
              >
                Quiz
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="rounded-xl border-border/60 bg-popover/95 backdrop-blur-md p-1.5">
                {quizItems.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="text-xs font-medium cursor-pointer rounded-lg"
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right side - Actions & User Menu */}
          <div className="flex items-center gap-2.5">
            {/* Quick Inscribe / Add Media Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/app/media/new")}
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Record Work</span>
            </Button>

            {/* Notifications Bell */}
            <NotificationsBell />

            {/* User Avatar & Settings Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full ring-1 ring-border/80 hover:ring-primary/40 p-0 h-9 w-9">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-rose-700 to-purple-800">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.displayName || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xs font-semibold">
                        {user?.displayName?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/60 bg-popover/95 backdrop-blur-md p-1.5 shadow-xl">
                <div className="px-2.5 py-2 border-b border-border/50 mb-1">
                  <p className="text-xs font-semibold text-foreground truncate">{user?.displayName || "Reader"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuItem
                  onClick={() => navigate("/app/profile")}
                  className="gap-2.5 text-xs font-medium cursor-pointer rounded-lg"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Profile & Studio
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/app/friends")}
                  className="gap-2.5 text-xs font-medium cursor-pointer rounded-lg"
                >
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  Literary Circle (Friends)
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-border/40" />
                <DropdownMenuItem
                  onClick={toggleTheme}
                  className="gap-2.5 text-xs font-medium cursor-pointer rounded-lg"
                >
                  {theme === "light" ? (
                    <>
                      <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Night Mode</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Day Mode</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-border/40" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2.5 text-xs font-medium text-destructive cursor-pointer rounded-lg focus:bg-destructive/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/98 backdrop-blur-sm md:hidden pt-16">
          <nav className="flex flex-col p-4 gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-smooth",
                  location.pathname === item.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/app/quiz"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-smooth",
                isQuizActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              Quiz
            </Link>
            <div className="border-t border-border my-2" />
            <Button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/app/media/new");
              }}
              className="gap-2 justify-start"
            >
              <Plus className="h-5 w-5" />
              Add Media
            </Button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <div className="p-4 lg:p-6">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-sm md:hidden">
        <div className="flex items-center justify-around py-2">
          <Link
            to="/app"
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-smooth",
              location.pathname === "/app"
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link
            to="/app/feed"
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-smooth",
              location.pathname === "/app/feed"
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            <Rss className="h-5 w-5" />
            <span className="text-xs">Feed</span>
          </Link>
          <Link
            to="/app/library"
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-smooth",
              location.pathname === "/app/library"
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            <Library className="h-5 w-5" />
            <span className="text-xs">Library</span>
          </Link>
          <Link
            to="/app/quiz"
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-smooth",
              isQuizActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Brain className="h-5 w-5" />
            <span className="text-xs">Quiz</span>
          </Link>
          <Link
            to="/app/vocabulary"
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-smooth",
              location.pathname === "/app/vocabulary"
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-xs">Vocab</span>
          </Link>
          <Link
            to="/app/insights"
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-smooth",
              location.pathname === "/app/insights"
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            <LineChart className="h-5 w-5" />
            <span className="text-xs">Insights</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
