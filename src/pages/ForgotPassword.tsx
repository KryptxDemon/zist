import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Sun, Moon } from "lucide-react";

export default function ForgotPassword() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(false);
    setIsSubmitted(true);
    toast({
      title: "Reset link sent",
      description: "Check your email for password reset instructions.",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative">
      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4 rounded-full"
        title={
          theme === "light" ? "Switch to dark mode" : "Switch to light mode"
        }
      >
        {theme === "light" ? (
          <Moon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        ) : (
          <Sun className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        )}
      </Button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display font-bold text-xl">
              Z
            </div>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground mt-6 mb-2">
            Reset your password
          </h1>
          <p className="text-muted-foreground">
            We'll send you a link to reset it
          </p>
        </div>

        {/* Form */}
        <div className="glass grain rounded-2xl p-6 sm:p-8">
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
                <Mail className="h-8 w-8" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Check your inbox
              </h3>
              <p className="text-muted-foreground text-sm">
                We've sent a password reset link to{" "}
                <strong className="text-foreground">{email}</strong>
              </p>
              <div className="pt-4">
                <Link to="/login">
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
