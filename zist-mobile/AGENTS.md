# ZIST Mobile — contributor & agent guide

This is a React Native + Expo (TypeScript) port of the ZIST web app
(`../zist-frontend`). The goal is **feature and visual parity** with the web
`/app/*` experience, reusing the existing FastAPI backend unchanged.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before writing code that touches
an Expo, EAS, or React Native API:

1. Read the `expo` version in `package.json` (currently **SDK 57**).
2. Consult the versioned docs: `https://docs.expo.dev/versions/v57.0.0/`
3. `https://docs.expo.dev/llms.txt` indexes all Expo docs and corrects common
   LLM misconceptions.

## Commands

```bash
npx tsc --noEmit     # typecheck — MUST pass before you declare work done
npx expo start       # dev server
npx expo install <pkg>   # add a dependency (never `npm install <pkg>`)
npx expo-doctor      # diagnose dependency/config problems
```

`npm install` in this project runs with `legacy-peer-deps=true` (see `.npmrc`).

## Project layout

```
app/                       expo-router routes — THESE ARE THIN RE-EXPORTS ONLY
  _layout.tsx              providers, fonts, storage hydration, root stack
  welcome.tsx              the marketing landing page (signed-out home)
  (auth)/                  login.tsx | signup.tsx | forgot-password.tsx
  (app)/                   protected area (redirects to /welcome when signed out)
    (tabs)/                bottom tabs: index(Home) feed library quiz
                           vocabulary insights
    add.tsx friends.tsx profile.tsx profile-edit.tsx
    media/[id].tsx quiz/[mediaId].tsx user/[userId].tsx
src/
  screens/**               the real screen implementations
  components/ui/**         design-system primitives (single import surface)
  components/<feature>/**  feature components (media, feed, friends, …)
  contexts/**              Auth, Notifications
  services/**              API layer (ported verbatim from the web app)
  theme/**                 design tokens + ThemeProvider/useTheme
  lib/**                   time, utils, env, webStorage, googleAuth, fonts
  types/index.ts           canonical domain types
assets/brand/              logo, landing hero (anime.png), auth photograph (bg.jpg), theme artwork
```

**Never put logic in `app/**`. A route file is exactly one line:**

```ts
export { LibraryScreen as default } from "@/screens/LibraryScreen";
```

## TypeScript & module resolution

- `@/*` → `src/*` (configured in `tsconfig.json` + `app.json`
  `experiments.tsconfigPaths`).
- Assets: `require("@/../assets/brand/zist-logo.png")`.
- `strict` is on. Do not use `any` to silence errors — fix the type.

## Theming

```tsx
import { useTheme } from "@/theme";

const { colors, theme, setTheme, toggleTheme, shadow, gradient, radius, spacing, fontFamily, fontSize } = useTheme();
```

- `colors` is a flat table keyed exactly like the web CSS variables, in
  camelCase: `background foreground card cardForeground popover primary
  primaryForeground secondary secondaryForeground muted mutedForeground accent
  accentForeground destructive destructiveForeground border input ring
  greyWhite greyLight maroon maroonLight purple purpleLight charcoal
  charcoalLight sidebar* chart1..chart5 inputPlaceholder ringAlpha`.
- Every colour is a ready-to-use RN string: `#rrggbb`, or `#rrggbbaa` when the
  token is translucent. Because they are hex, append an alpha suffix when you
  need custom translucency: `colors.primary + "1a"`. (Values are serialised
  from HSL triples in hex precisely so this suffix trick works — React Native
  cannot parse `hsl(...)xx`.)
- `shadow("sm" | "md" | "lg" | "primary" | "glow")` returns spreadable RN
  shadow styles.
- `gradient.background | .primary | .warm | .card` are `[string, string]`
  tuples for `expo-linear-gradient` — gradients are **not** available as
  styles, wrap content in `<LinearGradient colors={gradient.primary} … />`.
- Fonts: display/heading text uses the `display*` entries
  (Space Grotesk), body text uses `body*` (Inter Tight). The `Text` primitive
  already applies them per variant.
- Tokens come from `../zist-frontend/src/index.css`; keep them in sync rather
  than hard-coding colours.
- **The marketing/auth screens have their own identity.** The web's
  `Landing.css`, `Login.css` and `Signup.css` each declare the *same* separate
  `:root` block (dark `#080909` canvas, `#55c7f2` accent, Boldonse display type,
  DM Sans lede, Geist Mono micro-labels) and ignore the app theme entirely. The
  raw values live in `src/theme/brandTokens.ts` (`brandColors`). The landing page
  (`src/screens/LandingScreen.tsx`) and `AuthScaffold` both mount
  `<ThemeProvider lockedTheme="dark">`, which pins the palette and turns
  `setTheme`/`toggleTheme` into no-ops without touching the saved preference; the
  auth-only primitives (`AuthField`, `AuthInput`, `authTitle`, `authMono`,
  `authPill`, …) live in `src/components/auth/authKit.tsx`. Use
  `<AuthScaffold variant="app">` for auth-adjacent pages that DO follow the app
  theme — the web's `ForgotPassword` is one.
- CSS effects with no direct RN equivalent are approximated: `filter: blur()`
  ornaments and `radial-gradient()` washes use `<RadialGlow />`
  (`@/components/layout/RadialGlow`), and `Screen`'s `backdrop` prop paints such
  decorations behind the scrolling content, pinned to the viewport.
- `authDisplay` (Boldonse), `landingCopy` (DM Sans) and `geistMono*` (Geist Mono)
  exist alongside the app families; they are only for the marketing identity.

## UI kit — import everything from `@/components/ui`

```tsx
import {
  Text, Heading, Button, IconButton, ChipButton,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Section,
  Input, Textarea, Label, Field,
  Badge, MediaTypeBadge, StatusBadge,
  Avatar, GradientAvatar, AvatarRow,
  Separator, Progress, Skeleton, Spinner, EmptyState, StarRating, Divider,
  MediaCardSkeleton, ThemeCardSkeleton, FeedPostSkeleton, QuizCardSkeleton,
  Sheet, ConfirmDialog, ActionSheet, ToastProvider, useToast,
  Segmented, TabBar, IconTabRow, Select, ChipSelect, SearchInput,
  Screen, Stack, Row,
} from "@/components/ui";
```

Key APIs (do not invent props — read `src/components/ui/*.tsx` if unsure):

| Component | Notes |
| --- | --- |
| `Text` | `variant`: `display h1 h2 h3 h4 lead body small muted label caption`; `color` = a `colors` key; `tint` = raw colour; `weight`, `align`, `uppercase`, `letterSpacing`; all `TextProps` pass through. |
| `Button` | `variant`: `default primary secondary outline ghost destructive link`; `size`: `sm md lg icon iconSm`; `label`, `icon`, `iconRight`, `loading`, `fullWidth`, `onPress`, `style`, `textStyle`. |
| `Input` | `label hint error icon trailing containerStyle` + all `TextInputProps`. `Textarea` for multiline. `Field` wraps a control with label/hint/error. |
| `Screen` | Page container. `scroll` (default true), `padded` (default true), `bottomInset`, `refreshControl`, `variant: "plain" \| "gradient"`, `contentContainerStyle`. **Every screen must be wrapped in `Screen`.** |
| `Sheet` | `visible onClose title description presentation:"sheet"\|"dialog" footer scrollable maxHeightRatio`. Replaces the web's dialogs/drawers. |
| `ActionSheet` | `visible onClose title actions:[{label,onPress,destructive?,icon?,disabled?}]`. Replaces `DropdownMenu`. |
| `ConfirmDialog` | `visible title description confirmLabel cancelLabel destructive onConfirm onCancel`. |
| `useToast()` | `toast({ title, description, variant?: "default"\|"destructive"\|"success", duration? })`, `dismiss(id?)`. |
| `Segmented` / `TabBar` / `IconTabRow` | `value onChange items:[{value,label,icon?,badge?}]`. `Segmented` = pill filter, `TabBar` = underlined scrollable tabs, `IconTabRow` = card-like icon tabs. |
| `Select` | `value onChange options:[{value,label,description?}] label placeholder`. `ChipSelect` for a horizontal chip filter (`value` may be `"all"`). |
| `EmptyState` | `icon title description action`. Every empty list uses this. |
| `MediaTypeBadge` / `StatusBadge` | `type` / `status` string. |
| `Avatar` | `name avatarUrl size("xs"\|"sm"\|"md"\|"lg"\|"xl"\|"2xl") userId clickable ring`. Navigates to `/user/:id` when `userId` + `clickable`. |

**React Native has no CSS.** Use `style` objects; there is no `className`.
For conditional styles compose arrays: `style={[styles.a, active && styles.b]}`.
`javaScriptEnabled`-style web globals (`window`, `document`, `localStorage`,
`sessionStorage`) do not exist — see below.

## Navigation (expo-router)

```tsx
import { Link, Redirect, router, useLocalSearchParams, useRouter } from "expo-router";

router.push("/media/abc");        // push a stack screen
router.replace("/login");         // replace
router.back();
const { id } = useLocalSearchParams<{ id: string }>();
```

Routes: `/welcome` (signed-out landing) `/` (dashboard) `/feed` `/library`
`/quiz` `/vocabulary` `/insights` `/add` `/friends` `/profile` `/profile-edit`
`/media/:id` `/quiz/:mediaId` `/user/:userId` `/login` `/signup`
`/forgot-password`.

Carry data across navigation with query params when convenient, e.g.
`router.push({ pathname: "/quiz/[mediaId]", params: { mediaId: item.id } })`.

## Data layer

All API access goes through `src/services/*` (already ported). Use them
directly with local component state — the web pages did exactly that. React
Query is available for anything that benefits from caching, but it is optional.

```ts
// src/services/mediaService.ts
import { mediaService, themeService, factService, vocabService, quoteService } from "@/services/mediaService";
// src/services/{feed,friend,user,notification}Service.ts
import { feedService, friendService, userService, notificationService } from "@/services/feedService"; // …etc
// src/services/externalServices.ts
import { wikiService, dictionaryService, mediaSearchService, aiService } from "@/services/externalServices";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationsContext";
```

Notes on the real surface (don't invent names):

- There is **no `quizService`** and no `externalService`. Quiz stats come from
  `apiClient.get("/quiz/stats")` (as on the web). External lookups live in
  `mediaSearchService` (`searchMedia`, `searchMediaGrouped`), `wikiService`,
  `dictionaryService` and `aiService`.
- `mediaService.delete(id)` — not `remove`. `mediaService.create` omits
  `tags` (the backend has no such field) and `mediaService.update` omits
  `description`, faithfully matching the web client.
- `themeService` / `factService` / `vocabService` / `quoteService` each expose
  `getByMediaId`, `create`, `update`, `delete`, `generateForMedia` (plus
  `toggleSave` / `toggleBookmark` / `toggleLearned` where relevant).
- Avatars: `@/lib/avatar` (`getInitials`, `avatarPresets`,
  `createInitialsAvatar`, `pickAvatarImage`, `isSvgDataUri`,
  `svgDataUriToXml`). Generated avatars are `data:image/svg+xml,…` URIs that
  `Avatar` renders via `SvgXml`.

- `useAuth()` → `{ user, isLoading, isAuthenticated, login, signup, logout,
  updateProfile, completeOAuth, reload }`.
- **Sessions die after 60 minutes** (`ACCESS_TOKEN_EXPIRE_MINUTES`) and the
  backend has no `/auth/refresh` route, so an expired token is unrecoverable —
  the user has to sign in again. Three guards keep that from looking like a
  broken app:
  - `authService.getStoredAuth()` drops a token whose `exp` has already passed
    (`@/lib/jwt`), so the protected area never renders on a dead session.
  - `apiClient` exports `onUnauthorized`, which fires whenever a request that
    *carried a token* comes back `401` (or `403 "Not authenticated"`, which is
    what FastAPI's `HTTPBearer` returns for a missing/unsupported credential).
    A failed `/auth/login` deliberately does not fire it, and it ignores
    responses whose token has since been replaced — a slow request from the
    previous session must never sign out a fresh login.
  - `AuthProvider` reacts to both by clearing the session and leaving a note in
    `@/lib/sessionNotice`; the signed-out home shows it as a toast, so the user
    learns the session ended rather than finding every screen failing. Its
    bootstrap is epoch-guarded: `/auth/me` results from before a login/logout are
    discarded instead of overwriting the session that replaced them.
  It also re-checks `exp` on `AppState` `"active"` — Expo Go keeps the JS
  runtime alive for hours, so a token often dies while the app is backgrounded.
- Backend base URL comes from `@/lib/env` (`EXPO_PUBLIC_API_URL`); never
  hard-code it.
- Storage: use `@/lib/webStorage` (`localStorage` / `sessionStorage` shims,
  synchronous) or `@/services/storage` (`storage.get/set/remove`).
- Dates: `@/lib/time` (`formatRelativeTime`, `formatDateTime`,
  `parseTimestamp`, `isWithinLastDays`, `toLocalDayKey`).
- Media payloads from the backend are **snake_case**; the services normalise
  them to the camelCase types in `@/types`. Friend/notification types keep
  snake_case by design.

## Component rules

- Prefer `Pressable` over `TouchableOpacity`.
- Use `FlatList` for long, unbounded lists; `Screen` + `.map()` for short ones.
- Images: `react-native`'s `Image` (or `MediaPoster` for media covers). Always
  give a fixed height so lists don't jump.
- `keyboardShouldPersistTaps="handled"` on screens with forms.
- Respect safe areas: `useSafeAreaInsets()` from `react-native-safe-area-context`.
- Icons: `lucide-react-native` — same icon names as the web app's
  `lucide-react`, rendered as `<Icon size={20} color={colors.mutedForeground} />`.
- Charts: `react-native-svg`. No `recharts`.
- Keep the visual language of the web app: rounded-2xl cards, `colors.card`
  surfaces, `colors.border` hairlines, primary-blue accents, Space Grotesk
  headings, muted Inter Tight body copy.

## Rules

- If `ios/` and `android/` do not exist they are generated — never create or
  edit them by hand; configure native behaviour in `app.json`.
- Do not add dependencies without a strong reason; ask/report instead.
- Run `npx tsc --noEmit` before declaring a task complete. Zero new errors.
