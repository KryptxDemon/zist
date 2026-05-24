import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpenText,
  BrainCircuit,
  Quote,
  Sparkles,
} from "lucide-react";
import "./Landing.css";
import { apiClient } from "@/services/apiClient";

const logoImg = "/zistv2-logo.png";
const heroImg = "/replace.jpg";

interface LandingThemeItem {
  title: string;
  count: number;
  latestCreatedAt: string;
  summary?: string | null;
  media: {
    title: string;
    type: string;
    coverUrl?: string | null;
  };
}

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

const DEFAULT_TOP_THEMES = [
  {
    title: "Identity & Growth",
    count: 42,
    latestCreatedAt: new Date().toISOString(),
    summary:
      "A strong pattern of character transformation and self-definition.",
    media: {
      title: "Featured media",
      type: "movie",
      coverUrl: null,
    },
  },
  {
    title: "Power & Society",
    count: 31,
    latestCreatedAt: new Date().toISOString(),
    summary:
      "Stories about influence, systems, and the consequences of control.",
    media: {
      title: "Featured media",
      type: "tv",
      coverUrl: null,
    },
  },
  {
    title: "Faith & Meaning",
    count: 26,
    latestCreatedAt: new Date().toISOString(),
    summary: "A recurring focus on belief, purpose, and personal conviction.",
    media: {
      title: "Featured media",
      type: "book",
      coverUrl: null,
    },
  },
];

const footerSecondaryNavigation = [
  { label: "Home", href: "/" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Top themes", href: "#top-themes" },
  { label: "Dashboard", href: "/app" },
];

const footerShareUrl = "https://zist-media.netlify.app";

const footerSocialLinks = [
  {
    label: "Instagram",
    href: `https://www.instagram.com/_asifzz_/`,
  },
  {
    label: "LinkedIn",
    href: `https://www.linkedin.com/in/asif-anwar-707aa2159/`,
  },
  {
    label: "Facebook",
    href: `https://www.facebook.com/asifanwarrr/`,
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
  const [topThemes, setTopThemes] =
    useState<LandingThemeItem[]>(DEFAULT_TOP_THEMES);

  useEffect(() => {
    let active = true;

    async function loadTopThemes() {
      try {
        const response = await apiClient.get<{
          items: Array<{
            title: string;
            count: number;
            latest_created_at: string;
            summary?: string | null;
            media: {
              title: string;
              type: string;
              cover_url?: string | null;
            };
          }>;
        }>("/top?limit=3");

        if (!active) {
          return;
        }

        if (response.items && response.items.length > 0) {
          const themes = response.items.map((theme) => ({
            title: theme.title,
            count: theme.count,
            latestCreatedAt: theme.latest_created_at,
            summary: theme.summary,
            media: {
              title: theme.media.title,
              type: theme.media.type,
              coverUrl: theme.media.cover_url ?? null,
            },
          }));
          setTopThemes(themes);
        } else {
          setTopThemes(DEFAULT_TOP_THEMES);
        }
      } catch (error) {
        console.error("Failed to load top themes:", error);
        if (active) {
          setTopThemes(DEFAULT_TOP_THEMES);
        }
      }
    }

    loadTopThemes();

    const refreshTimer = window.setInterval(() => {
      void loadTopThemes();
    }, 60000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

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
        <p className="landing-v3-section-kicker">What Zist does</p>
        <h2 className="landing-v3-section-title">
          A cleaner way to learn from media
        </h2>

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
        <h2 className="landing-v3-section-title">Top Themes</h2>
        <p className="landing-v3-section-subtitle">
          Right now this reflects the most recent theme groups captured in the
          database. When the feed launches, this can shift to likes and saves.
        </p>

        <div className="landing-v3-theme-grid">
          {topThemes.map((theme) => (
            <article key={theme.title} className="landing-v3-theme-card">
              <div className="landing-v3-theme-image-wrap">
                {theme.media.coverUrl ? (
                  <img
                    src={theme.media.coverUrl}
                    alt={`${theme.media.title} artwork`}
                    className="landing-v3-theme-image"
                  />
                ) : (
                  <div
                    className="landing-v3-theme-image landing-v3-theme-image-fallback"
                    aria-hidden="true"
                  />
                )}
                <div className="landing-v3-theme-overlay">
                  <span>{theme.media.type}</span>
                  <strong>{theme.count} captures</strong>
                </div>
              </div>
              <div className="landing-v3-theme-body">
                <div className="landing-v3-theme-row">
                  <div>
                    <p className="landing-v3-theme-label">
                      {theme.media.title}
                    </p>
                    <h3>{theme.title}</h3>
                  </div>
                  <span>{theme.count}</span>
                </div>
                <div className="landing-v3-theme-meta">
                  <ArrowUpRight size={14} />
                  <span>{theme.summary || "Recent themes from Zist"}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-v3-footer">
        <div className="landing-v3-footer-brand landing-v3-footer-about">
          <img
            src={logoImg}
            alt="Zist Logo"
            className="landing-v3-footer-logo"
          />
          <div>
            <span className="landing-v3-footer-name">ZIST</span>
          </div>
        </div>
        <div className="landing-v3-footer-grid">
          <section className="landing-v3-footer-column">
            <p className="landing-v3-footer-column-title">Navigation:</p>
            <div className="landing-v3-footer-links">
              {footerSecondaryNavigation.map((link) =>
                link.href.startsWith("/") ? (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => navigate(link.href)}
                  >
                    {link.label}
                  </button>
                ) : (
                  <a key={link.label} href={link.href}>
                    {link.label}
                  </a>
                ),
              )}
            </div>
          </section>

          <section className="landing-v3-footer-column">
            <p className="landing-v3-footer-column-title">Social links:</p>
            <div className="landing-v3-footer-links landing-v3-footer-social-links">
              {footerSocialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </section>

          <section className="landing-v3-footer-column">
            <p className="landing-v3-footer-column-title">Contact details:</p>
            <div className="landing-v3-footer-meta-list">
              <span>Asif Anwar</span>
              <a href="mailto:asiifnawaar@gmail.com">asiifnawaar@gmail.com</a>
            </div>
          </section>
        </div>
      </footer>
    </div>
  );
}
