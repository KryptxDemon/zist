import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpenText, BrainCircuit, Menu, Quote, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/services/apiClient";
import "./Landing.css";

const logoImg = "/zistv2-logo.png";
const heroImg = "/bg.jpg";

interface LandingThemeItem {
  title: string;
  count: number;
  latestCreatedAt: string;
  summary?: string | null;
  media: { title: string; type: string; coverUrl?: string | null };
}

const capabilities = [
  { icon: BookOpenText, number: "01", title: "Capture themes", description: "Notice the ideas, tensions, and patterns hiding inside the stories you already love." },
  { icon: Sparkles, number: "02", title: "Build vocabulary", description: "Save language in context, then return to it when it is ready to stick." },
  { icon: Quote, number: "03", title: "Keep the line", description: "Collect quotes that stay with you and connect them to your own thinking." },
  { icon: BrainCircuit, number: "04", title: "Practice actively", description: "Turn your library into quick quizzes that make remembering feel natural." },
];

const defaultThemes: LandingThemeItem[] = [
  { title: "Identity & growth", count: 42, latestCreatedAt: "", summary: "Character transformation and self-definition.", media: { title: "Zist community", type: "theme" } },
  { title: "Power & society", count: 31, latestCreatedAt: "", summary: "Influence, systems, and the consequences of control.", media: { title: "Zist community", type: "theme" } },
  { title: "Faith & meaning", count: 26, latestCreatedAt: "", summary: "Belief, purpose, and personal conviction.", media: { title: "Zist community", type: "theme" } },
];

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/_asifzz_/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/asif-anwar-707aa2159/" },
  { label: "Facebook", href: "https://www.facebook.com/asifanwarrr/" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [topThemes, setTopThemes] = useState<LandingThemeItem[]>(defaultThemes);

  useEffect(() => {
    let active = true;
    const loadThemes = async () => {
      try {
        const response = await apiClient.get<{ items: Array<{ title: string; count: number; latest_created_at: string; summary?: string | null; media: { title: string; type: string; cover_url?: string | null } }> }>("/top?limit=3");
        if (active && response.items?.length) {
          setTopThemes(response.items.map((theme) => ({
            title: theme.title,
            count: theme.count,
            latestCreatedAt: theme.latest_created_at,
            summary: theme.summary,
            media: { title: theme.media.title, type: theme.media.type, coverUrl: theme.media.cover_url ?? null },
          })));
        }
      } catch {
        // Public landing content remains useful when the API is unavailable.
      }
    };
    void loadThemes();
    return () => { active = false; };
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const goTo = (path: string) => { closeMenu(); navigate(path); };

  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#main">Skip to content</a>
      <header className="landing-header">
        <div className="landing-container landing-nav">
          <a className="landing-brand" href="#top" onClick={closeMenu} aria-label="Zist home"><img src={logoImg} alt="" /><span>Zist</span></a>
          <nav className="landing-nav-links" aria-label="Primary navigation"><a href="#how-it-works">How it works</a><a href="#themes">Themes</a><a href="#about">About Zist</a></nav>
          <div className="landing-nav-actions"><button type="button" className="landing-text-button" onClick={() => goTo("/login")}>Log in</button><button type="button" className="landing-button landing-button-small" onClick={() => goTo("/signup")}>Join Zist <ArrowUpRight size={14} /></button><button type="button" className="landing-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}><Menu size={21} /></button></div>
        </div>
      </header>

      <div className={`landing-drawer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="landing-drawer-top"><span className="landing-mono">Menu / Zist</span><button type="button" onClick={closeMenu} aria-label="Close menu"><X size={24} /></button></div>
        <nav aria-label="Mobile navigation"><a href="#how-it-works" onClick={closeMenu}>How it works</a><a href="#themes" onClick={closeMenu}>Themes</a><a href="#about" onClick={closeMenu}>About Zist</a></nav>
        <div className="landing-drawer-actions"><button type="button" className="landing-button" onClick={() => goTo("/signup")}>Join Zist <ArrowUpRight size={15} /></button><button type="button" className="landing-text-button" onClick={() => goTo("/login")}>Log in</button></div>
      </div>

      <main id="main">
        <section className="landing-hero" id="top"><div className="landing-container landing-hero-grid"><div className="landing-hero-copy"><span className="landing-eyebrow"><i /> A second look at what you watch</span><h1>Make your<br /><em>media</em> matter.</h1><p className="landing-lede">Zist turns movies, books, music, and shows into a personal practice of noticing, remembering, and learning.</p><div className="landing-hero-actions"><button type="button" className="landing-button landing-button-large" onClick={() => goTo("/signup")}>Start collecting <ArrowUpRight size={16} /></button><a className="landing-underlined-link" href="#how-it-works">See how it works <span>↓</span></a></div><div className="landing-hero-note"><span className="landing-mono">For curious people</span><span className="landing-rule" /><span className="landing-mono">Movies · Books · Music · Games</span></div></div><div className="landing-hero-media"><img src={heroImg} alt="A vivid abstract collage representing stories and memory" /><div className="landing-image-stamp"><span>Field note</span><strong>01 / 04</strong></div><div className="landing-image-caption">A personal archive is a way of paying attention.</div></div></div></section>

        <section className="landing-stats" aria-label="Zist at a glance"><div className="landing-container landing-stat-grid"><div><strong>01</strong><span>Place to collect</span></div><div><strong>∞</strong><span>Ideas worth keeping</span></div><div><strong>04</strong><span>Ways to go deeper</span></div><div><strong>100%</strong><span>Yours to explore</span></div></div></section>

        <section className="landing-section" id="how-it-works"><div className="landing-container"><div className="landing-section-heading"><div><span className="landing-eyebrow"><i /> The Zist method</span><h2>Keep the feeling.<br /><span>Find the pattern.</span></h2></div><p>Good stories do not end when the credits roll. Zist gives the thoughts they leave behind somewhere to go.</p></div><div className="landing-capabilities">{capabilities.map(({ icon: Icon, number, title, description }) => <article key={title} className="landing-capability"><span className="landing-mono">{number} / 04</span><div className="landing-capability-icon"><Icon size={22} strokeWidth={1.6} /></div><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>

        <section className="landing-section landing-themes" id="themes"><div className="landing-container"><div className="landing-section-heading landing-section-heading-compact"><div><span className="landing-eyebrow"><i /> Live from the library</span><h2>What people<br /><span>are noticing.</span></h2></div><button type="button" className="landing-underlined-link" onClick={() => goTo("/signup")}>Explore your library <ArrowUpRight size={15} /></button></div><div className="landing-theme-grid">{topThemes.map((theme, index) => <article className={`landing-theme-card landing-theme-card-${index + 1}`} key={theme.title}><div className="landing-theme-image">{theme.media.coverUrl ? <img src={theme.media.coverUrl} alt={`${theme.media.title} artwork`} /> : <div className="landing-theme-placeholder"><span>{String(index + 1).padStart(2, "0")}</span></div>}<span className="landing-theme-type">{theme.media.type}</span></div><div className="landing-theme-body"><span className="landing-mono">{theme.count} captures</span><h3>{theme.title}</h3><p>{theme.summary || "A theme surfaced by the Zist community."}</p><ArrowUpRight size={17} /></div></article>)}</div></div></section>

        <section className="landing-about" id="about"><div className="landing-container landing-about-grid"><span className="landing-mono">Chapter 01 / The point</span><div><h2>Your attention<br />is worth <em>keeping.</em></h2><p>Zist is for the moments when a line, a scene, or a strange new word refuses to leave you alone. Save it. Question it. Come back with better questions.</p><button type="button" className="landing-button" onClick={() => goTo("/signup")}>Make a space for it <ArrowUpRight size={15} /></button></div></div></section>
      </main>

      <footer className="landing-footer"><div className="landing-container landing-footer-grid"><div><a className="landing-brand" href="#top"><img src={logoImg} alt="" /><span>Zist</span></a><p className="landing-footer-copy">A thoughtful place for the things your media leaves behind.</p></div><div><span className="landing-mono">Navigate</span><div className="landing-footer-links"><a href="#how-it-works">How it works</a><a href="#themes">Themes</a><button type="button" onClick={() => goTo("/app")}>Dashboard</button></div></div><div><span className="landing-mono">Say hello</span><div className="landing-footer-links"><a href="mailto:asiifnawaar@gmail.com">Email Zist</a>{socials.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noreferrer">{social.label}</a>)}</div></div></div><div className="landing-container landing-footer-bottom"><span>© 2026 Zist</span><span>Built for better attention.</span></div></footer>
    </div>
  );
}
