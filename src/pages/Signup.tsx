import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      await signup(email, password, displayName);
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

            <button className="signup-btn-google" type="button">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="10" opacity="0.2" />
              </svg>
              Sign up with Google
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
