import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { startGoogleSignIn } from "@/lib/neonAuthAdapter";
import "./Login.css";

const logoImg = "/zistv2-logo.png";
const stockImg = "/bg.jpg";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const from = location.state?.from?.pathname || "/app";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password, rememberMe);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate(from, { replace: true });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await startGoogleSignIn({ callbackURL: from });
      // No success toast here — the browser is redirecting away to Google.
    } catch (error) {
      setIsGoogleLoading(false);
      toast({
        title: "Google sign-in unavailable",
        description:
          error instanceof Error
            ? error.message
            : "Unable to start Google sign-in.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="login-page-v3">
      <div className="login-container-v3">
        {/* Left Side - Form */}
        <div className="login-left-v3">
          <div className="login-logo-wrap">
            <img src={logoImg} alt="Zist Logo" className="login-logo" />
            <span className="login-brand">ZIST</span>
          </div>

          <div className="login-content">
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">
              Welcome back! Please enter your details.
            </p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email" className="login-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input"
                />
              </div>

              <div className="login-field">
                <label htmlFor="password" className="login-label">
                  Password
                </label>
                <div className="login-password-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="login-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-password-toggle"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="login-footer-row">
                <div className="login-checkbox-wrap">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="login-checkbox"
                  />
                  <label htmlFor="remember" className="login-checkbox-label">
                    Remember me
                  </label>
                </div>
                <Link to="/forgot-password" className="login-forgot-link">
                  Forgot password
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="login-btn-signin"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="inline mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button
              className="login-btn-google"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              aria-label="Sign in with Google"
            >
              <svg
                className="login-google-icon"
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
              {isGoogleLoading ? "Redirecting..." : "Sign in with Google"}
            </button>

            <Link to="/neon/auth" className="login-btn-neon">
              Sign in with Neon (passwordless)
            </Link>

            <p className="login-signup-text">
              Don't have an account?{" "}
              <Link to="/signup" className="login-signup-link">
                Sign up for free!
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="login-right-v3">
          <img
            src={stockImg}
            alt="Welcome illustration"
            className="login-image"
          />
          <div className="login-image-overlay" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
