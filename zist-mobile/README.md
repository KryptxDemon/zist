# ZIST Mobile

A React Native + **Expo** (TypeScript) app that mirrors the ZIST learning web
app (`../zist-frontend`) screen-for-screen, reusing the existing FastAPI
backend and its JWT auth. Same routes, same features, same visual language —
in app form.

```

             Home · Feed · Library · Quiz · Vocab · Insights
             ────────────────────────────────────────────────
        a native companion to Zist — read, annotate, share, quiz

```

## What's in the box

| Area | Screens |
| --- | --- |
| Auth | Login, Sign up, Forgot password, native Google sign-in |
| Study | Dashboard, Library, Add media, Media detail (Overview · Themes · Vocabulary · Quotes) |
| Practice | Quiz hub, Quiz session (per-media + collective) |
| Analysis | Vocabulary, Insights |
| Social | Feed, Friends, User profile, Profile editor |

Also included: light/dark theming from the web design tokens, the notification
bell with polling + mark-read/delete, an in-app toast system, pull-to-refresh
everywhere, and skeleton loading states.

## Getting started

```bash
cd zist-mobile
cp .env.example .env      # then set EXPO_PUBLIC_API_URL
npm install               # runs with legacy-peer-deps (see .npmrc)
npx expo start
```

Then press `a` (Android), `i` (iOS simulator) or `w` (web), or scan the QR code
with Expo Go.

> Expo Go includes only its bundled native modules. Everything this app uses is
> in Expo Go, but if you add a library with native code you'll need a
> development build: `npx expo run:android` / `npx expo run:ios`.

> **The project targets SDK 57** (`expo@57.x`, `react-native@0.86.x`,
> `react@19.2.x`). Expo Go ships one SDK at a time, so the Expo Go build on your
> device must support 57. Don't upgrade a single package by hand —
> `npx expo install <pkg>` and `npx expo install --check` keep the whole tree on
> one SDK.

### Pointing at the backend

`EXPO_PUBLIC_API_URL` must include the `/api/v1` prefix (e.g.
`http://localhost:8000/api/v1`). Useful values:

- iOS simulator / web: `http://localhost:8000/api/v1`
- Android emulator: `http://10.0.2.2:8000/api/v1`
- Physical device: `http://<your-computer-lan-ip>:8000/api/v1`

Env vars are inlined into the bundle at build time, so restart Metro after
changing `.env`.

### Troubleshooting

**Expo Go: `java.io.IOException: Failed to download remote update`** — the phone
can't reach the Metro dev server. The usual culprit on Linux is an enabled
firewall dropping the inbound connection, which is easy to miss because `curl`
from the same machine still works. Confirm with:

```bash
journalctl -k --since "10 min ago" | grep "UFW BLOCK"
```

If you see `DPT=8081` lines from your phone's IP, allow both dev ports:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 8081 proto tcp   # Metro
sudo ufw allow from 192.168.1.0/24 to any port 8000 proto tcp   # FastAPI
```

**Expo Go: `useTheme must be used within a ThemeProvider`** — a component that
calls `useTheme()` was rendered above `<ThemeProvider>`. The root layout's boot
branch deliberately renders before the provider mounts, so it must use
`BootScreen` (provider-free) rather than the themed `Spinner`.


## Architecture

```
app/                  expo-router routes — thin re-exports of src/screens/*
src/
  screens/            screen implementations (feature parity with the web pages)
  components/ui/      design-system primitives (Text, Button, Card, Screen, Sheet, …)
  components/<area>/  feature components (media, feed, friends, dashboard, …)
  contexts/           AuthContext, NotificationsContext
  services/           API layer, ported from the web app
  theme/              design tokens ported from the web `index.css` + ThemeProvider
  lib/                time, utils, env, storage shims, Google auth, fonts
  types/              canonical domain types
```

The data layer is the **same** code that powers the website: the files under
`src/services/` are the web app's services with browser APIs swapped for React
Native equivalents (`localStorage`/`sessionStorage` → an AsyncStorage-backed
shim in `src/lib/webStorage.ts`, `import.meta.env` → `src/lib/env.ts`). That
means every API call, payload shape, and error contract is identical.

Design tokens are a direct port of `zist-frontend/src/index.css` (the "Zist
blue editorial" theme) — see `src/theme/tokens.ts`. Where the web app used
Tailwind classes, the app uses `StyleSheet`/inline styles against those same
tokens.

The signed-out pages are a **second** design system, not the app theme: the
web's `Landing.css`, `Login.css` and `Signup.css` each declare the same
`:root` block (dark `#080909` canvas, `#55c7f2` accent, Boldonse display type,
DM Sans lede, Geist Mono micro-labels) and never follow the app theme. Those
values live in `src/theme/brandTokens.ts`; the landing page
(`src/screens/LandingScreen.tsx`, route `/welcome`) and `AuthScaffold` pin them
with a dark-locked `ThemeProvider`. Reusable RN approximations of the CSS-only
effects (`filter: blur()`, `radial-gradient()`) live in
`src/components/layout/RadialGlow.tsx`.

## Notable platform adaptations

- **Navigation** — `react-router-dom` → `expo-router` with a bottom tab bar
  (`Home · Feed · Library · Quiz · Vocab · Insights`) matching the web app's
  mobile navigation, plus stack screens for detail views.
- **Dialogs & dropdowns** — Radix dialogs/drawers became `Sheet`, dropdown
  menus became `ActionSheet`, toasts became a themed toast host.
- **Charts** — `recharts` is replaced with hand-rolled `react-native-svg`
  visuals, using the web app's `chart1..chart5` series colours.
- **Marketing pages** — the web's public landing page is ported as `/welcome`,
  the signed-out home (protected routes redirect there). A phone renders the
  web's `max-width: 840px` layout, so the port implements that stacked variant:
  drawer menu instead of the inline nav, single-column theme cards, and
  in-page "scroll to section" links done with measured `onLayout` offsets. Its
  fonts (`Boldonse`, `DM Sans`, `Geist Mono` from `@expo-google-fonts/*`) are
  loaded alongside the app's `Inter Tight` / `Space Grotesk`.
- **Google sign-in** — the website finishes OAuth in a popup that
  `postMessage`s the session back. Native apps can't do that, so the backend's
  `/auth/google/start` accepts an optional `redirect_to` (restricted to the
  `zist://` / `exp://` schemes) and the callback deep-links the tokens back to
  the app. The browser flow is unchanged.
- **Session storage** — a persistent tier (AsyncStorage, "remember me") and an
  ephemeral in-memory tier mirror the web's `localStorage`/`sessionStorage`
  split, while keeping the synchronous reads the API client relies on.
- **Avatar studio** — the web builds avatars client-side (canvas-compressed
  uploads and generated SVG initials tiles). The app does the same via
  `expo-image-picker` (square crop → JPEG data URI) and `react-native-svg`
  (`Image` can't draw SVG). Generated avatars use the web's exact
  `data:image/svg+xml;charset=UTF-8,…` format, so they round-trip between the
  two clients.
- **Colour tokens** — serialised to `#rrggbb` / `#rrggbbaa` rather than
  `hsl()` strings. React Native only accepts an appended alpha suffix on hex
  values, which the codebase relies on for translucent tints
  (`colors.primary + "1a"`); the hex conversion is byte-identical to React
  Native's own `hsl()` parser for every token.

## Scripts

```bash
npm start            # expo dev server
npm run android      # start on Android
npm run ios          # start on iOS
npm run web          # start in the browser
npm run typecheck    # tsc --noEmit
```

## Notes

- The backend has no `/auth/refresh` endpoint, so an expired access token
  (60 min) surfaces as a logged-out state — same behaviour as the web app.
- Forgot-password is a client-side simulation on the web and remains so here
  until the backend exposes a reset endpoint.
