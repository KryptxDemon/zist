/**
 * The "editorial dark" brand identity used by the web's marketing surfaces.
 *
 * `Landing.css`, `Login.css` and `Signup.css` each declare the *same* `:root`
 * block — a permanent `#080909` canvas with a `#55c7f2` accent, Boldonse display
 * type and Geist Mono micro-labels — rather than using the app's Tailwind
 * tokens. They also stay dark in both themes.
 *
 * The native signed-out experience (landing, login, signup) reproduces that from
 * here: the auth screens mount a `ThemeProvider lockedTheme="dark"` whose tokens
 * already agree closely (the app's dark `--primary` is `hsl(198 84% 64%)`,
 * visually the same colour as `#55c7f2`) and layer these exact values on top.
 */
export const brandColors = {
  /** `--auth-bg` / `--landing-bg` */
  bg: "#080909",
  /** `--auth-panel` / `--landing-panel` */
  panel: "#0e1011",
  /** `--auth-card` / `--landing-card` — input and card background. */
  card: "#141617",
  /** `--auth-paper` / `--landing-paper` — primary text. */
  paper: "#f2f2f0",
  /** `--auth-soft` / `--landing-soft`. */
  soft: "#8d9294",
  /** `--auth-line` / `--landing-line` — hairlines and borders. */
  line: "#242729",
  /** `--auth-lime` / `--landing-lime` (legacy name; it is the light blue accent). */
  accent: "#55c7f2",
  /** `--auth-lime-soft` / `--landing-lime-soft`. */
  accentSoft: "#8ddcff",
} as const;

/**
 * The web's `.login-page-v3` / `.signup-page` wash:
 * `radial-gradient(700px 500px at 85% 10%, rgba(85,199,242,.12), transparent 62%)`.
 * Rendered with `<RadialGlow cx="85%" cy="10%" r="62%" />`.
 */
export const authGlow = {
  cx: "85%",
  cy: "10%",
  r: "62%",
  opacity: 0.12,
} as const;

/** The blanket that keeps the auth form legible over the `bg.jpg` photograph. */
export const authImageScrim = [
  "rgba(8, 9, 9, 0.42)",
  "rgba(8, 9, 9, 0.88)",
  brandColors.bg,
] as const;

export const authImageScrimStops = [0, 0.5, 1] as const;

/**
 * `.landing-about::before` — `bg.jpg` under a blue wash:
 * `linear-gradient(90deg, rgba(8,31,43,.58), rgba(18,78,103,.48))`.
 */
export const landingAboutOverlay = [
  "rgba(8, 31, 43, 0.58)",
  "rgba(18, 78, 103, 0.48)",
] as const;
