import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
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

  const from = location.state?.from?.pathname || "/dashboard";

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
            <p className="login-subtitle">Welcome back! Please enter your details.</p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email" className="login-label">Email</label>
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
                <label htmlFor="password" className="login-label">Password</label>
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
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
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

            <button className="login-btn-google" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" opacity="0.2" />
              </svg>
              Sign in with Google
            </button>

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
