/**
 * ZIST design tokens — a direct port of `zist-frontend/src/index.css`.
 *
 * Every token below is stored as an HSL triple `[h, s, l]` (matching the CSS
 * custom properties) so that we can derive opaque and alpha variants at
 * runtime. React Native's colour parser is pickier than the browser's, so we
 * serialise to **hex** (`#rrggbb`, or `#rrggbbaa` when translucent) rather
 * than `hsl()` strings — that is the only form React Native lets us extend
 * with an alpha suffix (`colors.primary + "26"`).
 */

export type ThemeMode = "light" | "dark";

type Hsl = readonly [h: number, s: number, l: number];

function toHexChannel(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, "0");
}

/** HSL → RGB, mirroring CSS `hsl()` semantics. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = ((((h % 360) + 360) % 360) / 60);
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const m = light - c / 2;
  return [(rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255];
}

/**
 * Serialise an HSL triple (+ optional alpha) into a React Native colour.
 * Returns `#rrggbb`, or `#rrggbbaa` when `alpha < 1`, so callers can append
 * their own alpha suffix: `hsl(triple) + "26"`.
 */
export function hsl(triple: Hsl, alpha = 1): string {
  const [h, s, l] = triple;
  const [r, g, b] = hslToRgb(h, s, l);
  const base = `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
  if (alpha >= 1) return base;
  return base + toHexChannel(alpha * 255);
}

/** Raw HSL triple accessor for cases that need the numbers. */
export const triple = (t: Hsl): Hsl => t;

const light = {
  background: [198, 35, 96],
  foreground: [204, 30, 13],

  card: [198, 30, 99],
  cardForeground: [204, 30, 13],

  popover: [198, 30, 99],
  popoverForeground: [204, 30, 13],

  primary: [198, 84, 64],
  primaryForeground: [204, 35, 12],

  secondary: [204, 32, 25],
  secondaryForeground: [198, 35, 96],

  muted: [198, 22, 90],
  mutedForeground: [204, 12, 42],

  accent: [198, 55, 90],
  accentForeground: [204, 30, 13],

  destructive: [0, 72, 51],
  destructiveForeground: [180, 3, 95],

  border: [198, 18, 82],
  input: [198, 18, 82],
  ring: [198, 84, 64],

  greyWhite: [198, 35, 96],
  greyLight: [198, 30, 99],
  maroon: [198, 84, 64],
  maroonLight: [198, 84, 72],
  purple: [204, 32, 25],
  purpleLight: [204, 32, 35],
  charcoal: [204, 30, 13],
  charcoalLight: [204, 18, 30],

  sidebarBackground: [180, 3, 93],
  sidebarForeground: [0, 0, 17],
  sidebarPrimary: [340, 40, 37],
  sidebarPrimaryForeground: [180, 3, 95],
  sidebarAccent: [316, 25, 90],
  sidebarAccentForeground: [0, 0, 17],
  sidebarBorder: [180, 3, 85],
  sidebarRing: [340, 40, 37],

  chart1: [340, 40, 37],
  chart2: [316, 37, 28],
  chart3: [340, 40, 50],
  chart4: [316, 37, 45],
  chart5: [0, 0, 45],
} as const satisfies Record<string, Hsl>;

const dark = {
  background: [204, 30, 3],
  foreground: [60, 5, 95],

  card: [204, 20, 8],
  cardForeground: [60, 5, 95],

  popover: [204, 20, 8],
  popoverForeground: [60, 5, 95],

  primary: [198, 84, 64],
  primaryForeground: [204, 30, 3],

  secondary: [204, 32, 25],
  secondaryForeground: [60, 5, 95],

  muted: [204, 16, 15],
  mutedForeground: [204, 8, 58],

  accent: [198, 32, 18],
  accentForeground: [60, 5, 95],

  destructive: [0, 72, 51],
  destructiveForeground: [180, 3, 95],

  border: [204, 10, 16],
  input: [204, 10, 16],
  ring: [198, 84, 64],

  greyWhite: [204, 30, 3],
  greyLight: [204, 20, 8],
  maroon: [198, 84, 64],
  maroonLight: [198, 84, 72],
  purple: [204, 32, 25],
  purpleLight: [204, 32, 35],
  charcoal: [60, 5, 95],
  charcoalLight: [204, 8, 75],

  sidebarBackground: [0, 0, 10],
  sidebarForeground: [180, 3, 95],
  sidebarPrimary: [340, 45, 55],
  sidebarPrimaryForeground: [0, 0, 8],
  sidebarAccent: [316, 30, 22],
  sidebarAccentForeground: [180, 3, 95],
  sidebarBorder: [0, 0, 20],
  sidebarRing: [340, 45, 55],

  chart1: [340, 45, 55],
  chart2: [316, 40, 45],
  chart3: [340, 45, 65],
  chart4: [316, 40, 55],
  chart5: [180, 3, 60],
} as const satisfies Record<string, Hsl>;

export type TokenTable = typeof light;

type TokenKey = keyof TokenTable;

export interface ThemeColors extends Record<TokenKey, string> {
  /** `hsl(primary / 0.5)` equivalents, pre-computed for convenience. */
  inputPlaceholder: string;
  ringAlpha: string;
}

function build(t: Record<string, Hsl>): ThemeColors {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(t)) {
    out[key] = hsl(value);
  }
  out.inputPlaceholder = hsl(t.mutedForeground, 0.7);
  out.ringAlpha = hsl(t.ring, 0.35);
  return out as unknown as ThemeColors;
}

export const lightColors = build(light);
export const darkColors = build(dark);

export const palette = { light, dark };

/** `--radius: 0.75rem` plus Tailwind's radius scale. */
export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
} as const;

export const fontFamily = {
  body: "InterTight_400Regular",
  bodyMedium: "InterTight_500Medium",
  bodySemibold: "InterTight_600SemiBold",
  bodyBold: "InterTight_700Bold",
  display: "SpaceGrotesk_500Medium",
  displaySemibold: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
  mono: "monospace",
  /** Boldonse — the web's `--auth-display` / `--landing-display`. */
  authDisplay: "Boldonse_400Regular",
  /** DM Sans — the web's `--landing-copy` (lede + about body). */
  landingCopy: "DMSans_500Medium",
  /** Geist Mono — the web's `--auth-mono` uppercase micro-labels. */
  geistMono: "GeistMono_400Regular",
  geistMonoMedium: "GeistMono_500Medium",
} as const;

/** Shadows: RN cannot blur like CSS, so these mirror the CSS values closely. */
export function shadow(level: "sm" | "md" | "lg" | "primary" | "glow", mode: ThemeMode) {
  const isDark = mode === "dark";
  const color = isDark ? "#000000" : "#2b2b2b";
  switch (level) {
    case "sm":
      return {
        shadowColor: color,
        shadowOpacity: isDark ? 0.4 : 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      };
    case "md":
      return {
        shadowColor: color,
        shadowOpacity: isDark ? 0.5 : 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      };
    case "lg":
      return {
        shadowColor: color,
        shadowOpacity: isDark ? 0.6 : 0.15,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      };
    case "primary":
      return {
        shadowColor: isDark ? "#4ba3c7" : "#2f7fa3",
        shadowOpacity: isDark ? 0.35 : 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      };
    case "glow":
    default:
      return {
        shadowColor: isDark ? "#4ba3c7" : "#2f7fa3",
        shadowOpacity: isDark ? 0.15 : 0.1,
        shadowRadius: 40,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
      };
  }
}

/** Gradient stops ported from the CSS `--gradient-*` variables. */
export const gradients = {
  light: {
    background: ["#f1f7f9", "#e3eef2"] as [string, string],
    primary: [hsl([198, 84, 64]), hsl([204, 32, 25])] as [string, string],
    warm: [hsl([198, 84, 72]), hsl([204, 32, 35])] as [string, string],
    card: [hsl([198, 30, 99], 0.9), hsl([198, 35, 96], 0.95)] as [string, string],
  },
  dark: {
    background: ["#050b0d", "#0b1418"] as [string, string],
    primary: [hsl([198, 84, 64]), hsl([204, 32, 25])] as [string, string],
    warm: [hsl([198, 84, 72]), hsl([204, 32, 35])] as [string, string],
    card: [hsl([204, 20, 8], 0.95), hsl([204, 24, 6], 0.95)] as [string, string],
  },
} as const;
