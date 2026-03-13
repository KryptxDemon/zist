import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Library,
  Brain,
  Rss,
  User,
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
  Search,
  SlidersHorizontal,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  { path: "/app/library", label: "Library" },
  { path: "/app/feed", label: "Feed" },
];

const quizItems = [
  { path: "/app/quiz", label: "Quiz Hub" },
  { path: "/app/quiz/start", label: "Start Quiz" },
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
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-sm">
        <div className="flex h-full items-center justify-between px-4 lg:px-8 max-w-[1600px] mx-auto">
          {/* Logo */}
          <Link to="/app" className="flex items-center gap-3">
            <img
              src="/zist logo.png"
              alt="Zist Logo"
              className="h-10 w-10 rounded-xl object-contain"
            />
            <span className="font-display text-xl font-semibold text-foreground">
              Zist
            </span>
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative py-2 text-sm font-medium transition-smooth",
                  location.pathname === item.path
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {location.pathname === item.path && (
                  <span className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}

            {/* Quiz Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-1 py-2 text-sm font-medium transition-smooth outline-none",
                  isQuizActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Quiz
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {quizItems.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right side - User Menu */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
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

            {/* User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-rose-700 to-purple-800">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-medium">
                        {user?.displayName?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => navigate("/app/profile")}
                  className="gap-2"
                >
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
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
        </div>
      </nav>
    </div>
  );
}
