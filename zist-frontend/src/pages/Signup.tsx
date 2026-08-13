import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { authService } from "@/services/authService";
import { startGoogleSignIn } from "@/lib/neonAuthAdapter";
import "./Signup.css";

const logoImg = "/zistv2-logo.png";
const stockImg = "/bg.jpg";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "#dc2626" };
  if (score <= 2) return { score, label: "Fair", color: "#f97316" };
  if (score <= 3) return { score, label: "Good", color: "#7c6fe0" };
  return { score, label: "Strong", color: "#9f5ddb" };
}

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [displayNameStatus, setDisplayNameStatus] = useState<{
    available: boolean | null;
    suggestions: string[];
    checked: string;
    loading: boolean;
  }>({ available: null, suggestions: [], checked: "", loading: false });

  useEffect(() => {
    if (!displayName.trim()) {
      setDisplayNameStatus({
        available: null,
        suggestions: [],
        checked: "",
        loading: false,
      });
      return;
    }

    const handle = window.setTimeout(async () => {
      setDisplayNameStatus((current) => ({ ...current, loading: true }));
      try {
        const result = await authService.checkDisplayName(displayName.trim());
        setDisplayNameStatus({
          available: result.available,
          suggestions: result.suggestions,
          checked: result.display_name,
          loading: false,
        });
      } catch {
        setDisplayNameStatus((current) => ({ ...current, loading: false }));
      }
    }, 400);

    return () => window.clearTimeout(handle);
  }, [displayName]);

  const passwordStrength = getPasswordStrength(password);
  const requirements = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: /[A-Z]/.test(password), text: "One uppercase letter" },
    { met: /[0-9]/.test(password), text: "One number" },
    { met: /[^A-Za-z0-9]/.test(password), text: "One special character" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await signup(email, password, displayName, firstName, lastName);
      toast({
        title: "Welcome to Zist!",
        description: "Your account has been created successfully.",
      });
      navigate("/app");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      toast({
        title: "Signup failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      await startGoogleSignIn({ callbackURL: "/app" });
      // No success toast here — the browser is redirecting away to Google.
    } catch (error) {
      setIsGoogleLoading(false);
      toast({
        title: "Google sign-up unavailable",
        description:
          error instanceof Error
            ? error.message
            : "Unable to start Google sign-up.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="signup-page-v3">
      <div className="signup-container-v3">
        {/* Left Side - Form */}
        <div className="signup-left-v3">
          <div className="signup-logo-wrap">
            <img src={logoImg} alt="Zist Logo" className="signup-logo" />
            <span className="signup-brand">ZIST</span>
          </div>

          <div className="signup-content">
            <h1 className="signup-title">Create Account</h1>
            <p className="signup-subtitle">Join us and start learning today</p>

            <form onSubmit={handleSubmit} className="signup-form">
              <div className="signup-name-grid">
                <div className="signup-field">
                  <label htmlFor="firstName" className="signup-label">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="signup-input"
                  />
                </div>

                <div className="signup-field">
                  <label htmlFor="lastName" className="signup-label">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="signup-input"
                  />
                </div>
              </div>

              <div className="signup-field">
                <label htmlFor="displayName" className="signup-label">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="signup-input"
                />
                <div className="signup-helper-text">
                  {displayNameStatus.loading
                    ? "Checking availability..."
                    : displayNameStatus.available === true
                      ? "Display name is available."
                      : displayNameStatus.available === false
                        ? "Display name is already taken. Try one of the suggestions below."
                        : "Use 2-100 characters. Availability will be checked automatically."}
                </div>
                {displayNameStatus.suggestions.length > 0 &&
                displayNameStatus.available === false ? (
                  <div className="signup-suggestions">
                    {displayNameStatus.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setDisplayName(suggestion)}
                        className="signup-suggestion-chip"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="signup-field">
                <label htmlFor="email" className="signup-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="signup-input"
                />
              </div>

              <div className="signup-field">
                <label htmlFor="password" className="signup-label">
                  Password
                </label>
                <div className="signup-password-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="signup-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="signup-password-toggle"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength */}
                {password && (
                  <div className="signup-password-strength">
                    <div className="signup-strength-bar">
                      <div className="signup-strength-progress">
                        <div
                          className="signup-strength-fill"
                          style={{
                            width: `${(passwordStrength.score / 5) * 100}%`,
                            backgroundColor: passwordStrength.color,
                          }}
                        />
                      </div>
                      <span className="signup-strength-label">
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div
                      className="signup-requirements"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                      }}
                    >
                      {requirements.map((req) => (
                        <div
                          key={req.text}
                          className={`signup-requirement ${req.met ? "met" : ""}`}
                        >
                          <span className="signup-requirement-icon">
                            {req.met ? <Check size={14} /> : <X size={14} />}
                          </span>
                          {req.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="signup-btn-signup"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="inline mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Sign up"
                )}
              </button>
            </form>

            <div className="signup-divider">
              <span>or</span>
            </div>

            <button
              className="signup-btn-google"
              type="button"
              onClick={handleGoogleSignup}
              disabled={isGoogleLoading}
              aria-label="Sign up with Google"
            >
              <svg
                className="signup-google-icon"
                width="18"
                height="18"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                />
                <path
                  fill="#FF3D00"
                  d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                />
              </svg>
              {isGoogleLoading ? "Redirecting..." : "Sign up with Google"}
            </button>


            <p className="signup-signin-text">
              Already have an account?{" "}
              <Link to="/login" className="signup-signin-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="signup-right-v3">
          <img
            src={stockImg}
            alt="Welcome illustration"
            className="signup-image"
          />
          <div className="signup-image-overlay" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
