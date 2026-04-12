import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpenText,
  BrainCircuit,
  Quote,
  Sparkles,
} from "lucide-react";
import "./Landing.css";

const logoImg = "/zistv2-logo.png";
const heroImg = "/replace.jpg";

const capabilities = [
  {
    icon: BookOpenText,
    title: "Capture Themes",
    description: "Extract deeper ideas from movies, books, music, and shows.",
  },
  {
    icon: Sparkles,
    title: "Build Vocabulary",
    description: "Save new words in context and practice them naturally.",
    featured: true,
  },
  {
    icon: Quote,
    title: "Collect Quotes",
    description: "Keep meaningful lines and connect them to your own insights.",
  },
  {
    icon: BrainCircuit,
    title: "Smart Quizzes",
    description: "Turn your saved media knowledge into active recall sessions.",
  },
];

const topThemes = [
  {
    title: "Identity & Growth",
    count: "42 insights",
    activity: "10 media items",
    imageClass: "theme-card-image-one",
  },
  {
    title: "Power & Society",
    count: "31 insights",
    activity: "8 media items",
    imageClass: "theme-card-image-two",
  },
  {
    title: "Faith & Meaning",
    count: "26 insights",
    activity: "7 media items",
    imageClass: "theme-card-image-three",
  },
];

function EveryUnderline() {
  return (
    <svg
      viewBox="0 0 180 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="landing-every-underline"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M2 8 C30 3, 60 10, 90 5 C118 1, 148 9, 176 5"
        stroke="#7B6FF8"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page-v3">
      <svg
        className="landing-bg-top-left"
        viewBox="0 0 480 420"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M0 0 L480 0 C480 0, 420 30, 360 80 C300 130, 260 200, 200 260 C140 320, 60 370, 0 420 Z"
          fill="#E2E6FF"
        />
        <ellipse cx="160" cy="160" rx="220" ry="200" fill="#E2E6FF" />
      </svg>

      <svg
        className="landing-bg-bottom-right"
        viewBox="0 0 520 440"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M520 440 L0 440 C0 440, 60 410, 130 360 C200 310, 250 240, 310 180 C370 120, 450 60, 520 0 Z"
          fill="#E2E6FF"
        />
        <ellipse cx="360" cy="280" rx="220" ry="200" fill="#E2E6FF" />
      </svg>

      <div className="landing-decor-box-1" aria-hidden="true" />
      <div className="landing-decor-box-2" aria-hidden="true" />
      <div className="landing-decor-box-3" aria-hidden="true" />
      <div className="landing-decor-box-4" aria-hidden="true" />

      <header className="landing-v3-navbar">
        <div className="landing-v3-logo-wrap">
          <img src={logoImg} alt="Zist Logo" className="landing-v3-logo" />
          <span className="landing-v3-brand">ZIST</span>
        </div>

        <div className="landing-v3-nav-actions">
          <button
            type="button"
            className="landing-v3-login"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            type="button"
            className="landing-v3-signup"
            onClick={() => navigate("/signup")}
          >
            Sign up
          </button>
          <button
            type="button"
            className="landing-v3-lang"
            aria-label="Language selector"
          >
            EN
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 5L7 9L11 5"
                stroke="#111111"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <section className="landing-v3-hero">
        <div className="landing-v3-left">
          <p className="landing-v3-overline">
            Turn passive media consumption into active learning
          </p>

          <h1 className="landing-v3-title">
            <span className="landing-v3-title-line landing-v3-title-line-top">
              Learn from{" "}
              <span className="landing-v3-every">
                every
                <EveryUnderline />
              </span>
            </span>
            <br />
            <span className="landing-v3-title-line landing-v3-title-line-bottom">
              media you love
            </span>
          </h1>

          <p className="landing-v3-copy">
            Zist helps you capture and practice themes, vocabulary, and quotes
            from all your media: movies, TV shows, music, books, podcasts, and
            games.
          </p>

          <button
            type="button"
            className="landing-v3-cta"
            onClick={() => navigate("/signup")}
          >
            Get Started
          </button>
        </div>

        <div className="landing-v3-right">
          <img
            src={heroImg}
            alt="Person learning from media"
            className="landing-v3-hero-img"
          />
        </div>
      </section>

      <section
        className="landing-v3-section landing-v3-capabilities"
        id="capabilities"
      >
        <p className="landing-v3-section-kicker">Category</p>
        <h2 className="landing-v3-section-title">What We Can Do Here</h2>

        <div className="landing-v3-cap-grid">
          {capabilities.map((item) => (
            <article
              key={item.title}
              className={`landing-v3-cap-card ${item.featured ? "landing-v3-cap-card-featured" : ""}`}
            >
              <div className="landing-v3-cap-icon-wrap">
                <item.icon
                  size={30}
                  strokeWidth={1.8}
                  className="landing-v3-cap-icon"
                />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="landing-v3-section landing-v3-top-themes"
        id="top-themes"
      >
        <p className="landing-v3-section-kicker">Top Learning Focus</p>
        <h2 className="landing-v3-section-title">Top Themes</h2>

        <div className="landing-v3-theme-grid">
          {topThemes.map((theme) => (
            <article key={theme.title} className="landing-v3-theme-card">
              <div
                className={`landing-v3-theme-image ${theme.imageClass}`}
                aria-hidden="true"
              />
              <div className="landing-v3-theme-body">
                <div className="landing-v3-theme-row">
                  <h3>{theme.title}</h3>
                  <span>{theme.count}</span>
                </div>
                <div className="landing-v3-theme-meta">
                  <ArrowUpRight size={14} />
                  <span>{theme.activity}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-v3-footer">
        <div className="landing-v3-footer-brand">
          <img
            src={logoImg}
            alt="Zist Logo"
            className="landing-v3-footer-logo"
          />
          <span>ZIST</span>
        </div>
        <p>
          Learn from everything you consume. Capture themes, vocabulary, and
          quotes in one place.
        </p>
        <div className="landing-v3-footer-links">
          <button type="button" onClick={() => navigate("/login")}>
            Login
          </button>
          <button type="button" onClick={() => navigate("/signup")}>
            Sign up
          </button>
          <a href="#capabilities">What we can do</a>
          <a href="#top-themes">Top themes</a>
        </div>
      </footer>
    </div>
  );
}
