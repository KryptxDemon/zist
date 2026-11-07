import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowUpRight,
  BookOpenText,
  BrainCircuit,
  Languages,
  Menu,
  Quote,
  X,
} from "lucide-react-native";

import { ThemeProvider, useTheme } from "@/theme";
import { useAuth } from "@/contexts/AuthContext";
import { brandColors, landingAboutOverlay } from "@/theme/brandTokens";
import { apiClient } from "@/services/apiClient";
import { consumeSessionNotice } from "@/lib/sessionNotice";
import { Text, useToast } from "@/components/ui";

const LOGO = require("../../assets/brand/zist-logo.png");
const HERO = require("../../assets/brand/anime.png");
const ABOUT_BG = require("../../assets/brand/bg.jpg");

/** `anime.png` is 1530×1028; the web lets the image size itself. */
const HERO_ASPECT = 1530 / 1028;

/** The web's `/theme-*.jpg` placeholders, in `themePlaceholderImages` order. */
const THEME_PLACEHOLDERS = [
  require("../../assets/brand/theme-identity.jpg"),
  require("../../assets/brand/theme-power.jpg"),
  require("../../assets/brand/theme-faith.jpg"),
];

interface LandingThemeItem {
  title: string;
  count: number;
  summary?: string | null;
  media: { title: string; type: string; coverUrl?: string | null };
}

/** The web's `capabilities` array, verbatim. */
const CAPABILITIES = [
  {
    icon: BookOpenText,
    number: "01",
    title: "Capture themes",
    description:
      "Notice the ideas, tensions, and patterns hiding inside the stories you already love.",
  },
  {
    icon: Quote,
    number: "02",
    title: "Build vocabulary",
    description:
      "Save language in context, then return to it when it is ready to stick.",
  },
  {
    icon: Languages,
    number: "03",
    title: "JOIN THE CONVO",
    description:
      "Share your ideas and discover what others are taking away from their stories.",
  },
  {
    icon: BrainCircuit,
    number: "04",
    title: "Practice actively",
    description:
      "Turn your library into quick quizzes that make remembering feel natural.",
  },
];

/** Shown until (or instead of) `/top` answering — the web's `defaultThemes`. */
const DEFAULT_THEMES: LandingThemeItem[] = [
  {
    title: "Identity & growth",
    count: 42,
    summary: "Character transformation and self-definition.",
    media: { title: "Zist community", type: "theme" },
  },
  {
    title: "Power & society",
    count: 31,
    summary: "Influence, systems, and the consequences of control.",
    media: { title: "Zist community", type: "theme" },
  },
  {
    title: "Faith & meaning",
    count: 26,
    summary: "Belief, purpose, and personal conviction.",
    media: { title: "Zist community", type: "theme" },
  },
];

const STATS = [
  { value: "01", label: "Place to collect" },
  { value: "04", label: "Ways to go deeper" },
  { value: "1000+", label: "Ideas to discover" },
  { value: "100%", label: "Yours to explore" },
];

const SOCIALS = [
  { label: "Email Zist", href: "mailto:asiifanwaar@gmail.com" },
  { label: "Instagram", href: "https://www.instagram.com/_asif.anwar_/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/asif-anwar-707aa2159/" },
  { label: "Facebook", href: "https://www.facebook.com/asifanwarrr/" },
];


/**
 * Native port of the web `Landing` page — the signed-out entry point.
 *
 * The marketing pages are their own design system on the web (`Landing.css`
 * shares the `Login.css` `:root`), and they never follow the app theme, so the
 * whole screen is wrapped in a dark-locked `ThemeProvider`.
 *
 * The web serves one layout from 840px up and collapses to the stacked version
 * below that; this port implements the stacked version, which is what a phone
 * actually shows.
 */
export function LandingScreen() {
  return (
    <ThemeProvider lockedTheme="dark">
      <LandingContent />
    </ThemeProvider>
  );
}

function LandingContent() {
  const { fontFamily } = useTheme();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [menuOpen, setMenuOpen] = useState(false);
  const [topThemes, setTopThemes] = useState<LandingThemeItem[]>(DEFAULT_THEMES);
  const scrollRef = useRef<any>(null);
  const sectionY = useRef<Record<string, number>>({});

  // A session that expired on its own drops the user here; explain why rather
  // than letting them wonder what broke. See `@/lib/sessionNotice`.
  useEffect(() => {
    const notice = consumeSessionNotice();
    if (notice) {
      toast({
        title: "Your session expired",
        description: notice,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Android's hardware back button should close the drawer instead of leaving
  // the app (the drawer is rendered as an overlay, not a navigation screen).
  useEffect(() => {
    if (!menuOpen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setMenuOpen(false);
      return true;
    });
    return () => subscription.remove();
  }, [menuOpen]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await apiClient.get<{
          items: {
            title: string;
            count: number;
            summary?: string | null;
            media: { title: string; type: string; cover_url?: string | null };
          }[];
        }>("/top", { params: { limit: 3 } });
        if (active && response.items?.length) {
          setTopThemes(
            response.items.map((theme) => ({
              title: theme.title,
              count: theme.count,
              summary: theme.summary,
              media: {
                title: theme.media.title,
                type: theme.media.type,
                coverUrl: theme.media.cover_url ?? null,
              },
            })),
          );
        }
      } catch {
        // Public landing content stays useful when the API is unavailable.
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (isAuthenticated) return <Redirect href="/" />;

  const goTo = (path: string) => {
    setMenuOpen(false);
    router.push(path as never);
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const y = sectionY.current[id];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  // Font sizes follow the web's clamps: h1 `clamp(46px,14vw,68px)`,
  // h2 `clamp(38px,5vw,67px)`, stat `clamp(30px,4vw,52px)`.
  const h1Size = Math.min(68, Math.max(46, width * 0.14));
  const h2Size = Math.min(67, Math.max(38, width * 0.05));
  const statSize = Math.min(52, Math.max(30, width * 0.04));

  const display = { fontFamily: fontFamily.authDisplay, color: brandColors.paper };
  // `.landing-about h2` — white over the photograph, with a soft shadow.
  const aboutTitle = {
    ...display,
    fontSize: h2Size,
    lineHeight: h2Size * 1.22,
    textTransform: "uppercase" as const,
    textShadowColor: "rgba(8, 31, 43, 0.46)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 18,
  };  const mono = {
    fontFamily: fontFamily.geistMono,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase" as const,
    color: brandColors.soft,
  };
  const copy = {
    fontFamily: fontFamily.landingCopy,
    color: brandColors.soft,
    letterSpacing: -0.2,
  };
  const bodyFont = { fontFamily: fontFamily.body, color: brandColors.soft };

  return (
    <View style={{ flex: 1, backgroundColor: brandColors.bg }}>
      <StatusBar style="light" />

      {/* `.landing-header` — sticky on the web, so it sits outside the scroller. */}
      <View
        style={{
          paddingTop: insets.top,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: brandColors.line,
          backgroundColor: brandColors.bg,
        }}
      >
        <View
          style={{
            height: 67,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 15,
          }}
        >
          <Pressable
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            accessibilityLabel="Zist home"
          >
            <Image source={LOGO} style={{ width: 30, height: 30 }} resizeMode="contain" />
            <Text style={[display, { fontSize: 18, textTransform: "uppercase" }]}>Zist</Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable
              onPress={() => goTo("/login")}
              hitSlop={10}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.geistMonoMedium,
                  fontSize: 15,
                  letterSpacing: 0.5,
                  color: brandColors.paper,
                  textTransform: "uppercase",
                }}
              >
                Log in
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Open menu"
              style={{
                width: 40,
                height: 40,
                borderWidth: 1,
                borderColor: brandColors.line,
                borderRadius: 7,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Menu size={21} color={brandColors.paper} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* ------------------------------------------------------------ hero */}
        <View style={{ paddingHorizontal: 15, paddingTop: 68, paddingBottom: 65 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: brandColors.accent,
              }}
            />
            <Text style={mono}>A second look at what you watch</Text>
          </View>

          <Text style={[display, { fontSize: h1Size, lineHeight: h1Size * 1.18, letterSpacing: -1, marginTop: 22, textTransform: "uppercase" }]}>
            Make your
          </Text>
          <Text style={[display, { fontSize: h1Size, lineHeight: h1Size * 1.18, letterSpacing: -1, color: brandColors.accent, textTransform: "uppercase" }]}>
            Media
          </Text>
          <Text style={[display, { fontSize: h1Size, lineHeight: h1Size * 1.18, letterSpacing: -1, textTransform: "uppercase" }]}>
            Matter.
          </Text>

          <Text style={[copy, { fontSize: 17, lineHeight: 26, marginTop: 26 }]}>
            Zist turns movies, books, music, and shows into a personal practice of
            noticing, remembering, and learning.
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 23, marginTop: 34, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => goTo("/signup")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 16,
                paddingHorizontal: 21,
                borderRadius: 999,
                backgroundColor: brandColors.accent,
              }}
            >
              <Text style={{ fontFamily: fontFamily.geistMonoMedium, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: brandColors.bg }}>
                Start collecting
              </Text>
              <ArrowUpRight size={16} color={brandColors.bg} />
            </Pressable>

            <Pressable
              onPress={() => scrollTo("how-it-works")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 5,
                borderBottomWidth: 1,
                borderBottomColor: brandColors.line,
              }}
            >
              <Text style={[mono, { color: brandColors.paper }]}>See how it works</Text>
              <Text style={[mono, { color: brandColors.paper }]}>↓</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 47 }}>
            <View style={{ width: 56, height: 1, backgroundColor: brandColors.line }} />
          </View>

          {/*
           * The frame owns the size, the image fills it — never the other way
           * round. `anime.png` is 1530x1028, so an image that sized itself
           * would render 1530pt wide on a phone.
           */}
          <View
            style={{
              width: "100%",
              aspectRatio: HERO_ASPECT,
              marginTop: 36,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <Image
              source={HERO}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ----------------------------------------------------------- stats */}
        <View
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: brandColors.line,
            backgroundColor: brandColors.panel,
            paddingHorizontal: 15,
            flexDirection: "row",
            flexWrap: "wrap",
          }}
        >
          {STATS.map((stat, index) => {
            const isLeft = index % 2 === 0;
            const isTopRow = index < 2;
            return (
              <View
                key={stat.label}
                style={{
                  width: "50%",
                  paddingVertical: 20,
                  paddingHorizontal: 12,
                  gap: 9,
                  borderRightWidth: isLeft ? StyleSheet.hairlineWidth : 0,
                  borderBottomWidth: isTopRow ? StyleSheet.hairlineWidth : 0,
                  borderColor: brandColors.line,
                }}
              >
                <Text style={[display, { fontSize: statSize, lineHeight: statSize * 1.2 }]}>
                  {stat.value}
                </Text>
                <Text style={[mono, { fontSize: 10 }]}>{stat.label}</Text>
              </View>
            );
          })}
        </View>

        {/* ---------------------------------------------------- how it works */}
        <View
          onLayout={(event) => {
            sectionY.current["how-it-works"] = event.nativeEvent.layout.y;
          }}
          style={{ paddingHorizontal: 15, paddingVertical: 90 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: brandColors.accent }} />
            <Text style={mono}>The Zist method</Text>
          </View>

          <Text style={[display, { fontSize: h2Size, lineHeight: h2Size * 1.22, marginTop: 19, textTransform: "uppercase" }]}>
            Watch. Read.
          </Text>
          <Text style={[display, { fontSize: h2Size, lineHeight: h2Size * 1.22, color: brandColors.accent, textTransform: "uppercase" }]}>
            Think. Remember.
          </Text>

          <Text style={[copy, { fontSize: 18, lineHeight: 28, marginTop: 24 }]}>
            Good stories do not end when the credits roll. Zist gives the thoughts
            they leave behind somewhere to go.
          </Text>

          <View style={{ marginTop: 58 }}>
            {CAPABILITIES.map(({ icon: Icon, number, title, description }, index) => (
              <View
                key={title}
                style={{
                  paddingTop: index === 0 ? 0 : 20,
                  paddingBottom: 29,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderColor: brandColors.line,
                }}
              >
                <Text style={[mono, { color: brandColors.accent }]}>{number} / 04</Text>
                <View
                  style={{
                    width: 47,
                    height: 47,
                    marginTop: 30,
                    marginBottom: 18,
                    borderWidth: 1,
                    borderColor: brandColors.line,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={22} strokeWidth={1.6} color={brandColors.accent} />
                </View>
                <Text style={[display, { fontSize: 20, lineHeight: 26, marginBottom: 10, textTransform: "uppercase" }]}>
                  {title}
                </Text>
                <Text style={[bodyFont, { fontSize: 15, lineHeight: 23, maxWidth: 220 }]}>{description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ---------------------------------------------------------- themes */}
        <View
          onLayout={(event) => {
            sectionY.current["themes"] = event.nativeEvent.layout.y;
          }}
          style={{
            paddingHorizontal: 15,
            paddingVertical: 90,
            backgroundColor: brandColors.panel,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: brandColors.accent }} />
            <Text style={mono}>Live from the library</Text>
          </View>

          <Text style={[display, { fontSize: h2Size, lineHeight: h2Size * 1.22, marginTop: 19, textTransform: "uppercase" }]}>
            What people
          </Text>
          <Text style={[display, { fontSize: h2Size, lineHeight: h2Size * 1.22, color: brandColors.accent, textTransform: "uppercase" }]}>
            are noticing.
          </Text>

          <Pressable
            onPress={() => goTo("/signup")}
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 24,
              paddingVertical: 5,
              borderBottomWidth: 1,
              borderBottomColor: brandColors.line,
            }}
          >
            <Text style={[mono, { color: brandColors.paper }]}>Explore your library</Text>
            <ArrowUpRight size={15} color={brandColors.paper} />
          </Pressable>

          <View style={{ gap: 15, marginTop: 40 }}>
            {topThemes.map((theme, index) => (
              <View key={`${theme.title}-${index}`} style={{ backgroundColor: brandColors.card }}>
                {/*
                 * `overflow: hidden` is load-bearing (the web has it too): the
                 * cover artwork is a TMDB poster, i.e. intrinsically taller
                 * than this 1.3:1 frame, and without clipping it would paint
                 * over the card copy.
                 */}
                <View
                  style={{
                    width: "100%",
                    aspectRatio: index === 0 ? 1.5 : 1.3,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    source={
                      theme.media.coverUrl
                        ? { uri: theme.media.coverUrl }
                        : THEME_PLACEHOLDERS[index % THEME_PLACEHOLDERS.length]
                    }
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      paddingVertical: 7,
                      paddingHorizontal: 9,
                      backgroundColor: brandColors.accent,
                    }}
                  >
                    <Text style={{ fontFamily: fontFamily.geistMono, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: brandColors.bg }}>
                      {theme.media.type}
                    </Text>
                  </View>
                </View>

                <View style={{ minHeight: 185, paddingVertical: 21, paddingHorizontal: 22 }}>
                  <Text style={[mono, { color: brandColors.accent }]}>
                    {theme.count} captures
                  </Text>
                  <Text style={[display, { fontSize: 25, marginTop: 13, marginBottom: 9, textTransform: "uppercase" }]}>
                    {theme.title}
                  </Text>
                  <Text style={[bodyFont, { lineHeight: 22, maxWidth: 230 }]}>
                    {theme.summary || "A theme surfaced by the Zist community."}
                  </Text>
                  <View style={{ position: "absolute", right: 21, bottom: 22 }}>
                    <ArrowUpRight size={17} color={brandColors.accent} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ----------------------------------------------------------- about */}
        <ImageBackground
          source={ABOUT_BG}
          resizeMode="cover"
          style={{ backgroundColor: "#173f54" }}
          onLayout={(event) => {
            // Measured on the section itself: it is a direct child of the
            // scroll content, so `y` is a valid scroll offset.
            sectionY.current["about"] = event.nativeEvent.layout.y;
          }}
        >
          <View>
            <LinearGradient
              colors={landingAboutOverlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ paddingHorizontal: 15, paddingVertical: 90, alignItems: "center" }}>
              <Text align="center" style={aboutTitle}>
                Your attention
              </Text>
              <Text align="center" style={aboutTitle}>
                is worth{" "}
                <Text style={[aboutTitle, { textDecorationLine: "underline" }]}>
                  keeping.
                </Text>
              </Text>

              <View style={{ marginTop: 20 }}>
                <Pressable
                  onPress={() => goTo("/signup")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 17,
                    paddingHorizontal: 18,
                    borderRadius: 999,
                    backgroundColor: brandColors.accent,
                  }}
                >
                  <Text style={{ fontFamily: fontFamily.geistMonoMedium, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#07151c" }}>
                    Make a space for it
                  </Text>
                  <ArrowUpRight size={15} color="#07151c" />
                </Pressable>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* ---------------------------------------------------------- footer */}
        <View style={{ paddingHorizontal: 15, paddingTop: 72, paddingBottom: 24 }}>
          <Pressable
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <Image source={LOGO} style={{ width: 30, height: 30 }} resizeMode="contain" />
            <Text style={[display, { fontSize: 18, textTransform: "uppercase" }]}>Zist</Text>
          </Pressable>
          <Text style={[bodyFont, { marginTop: 21, maxWidth: 240, lineHeight: 24, color: brandColors.soft }]}>
            Watch it. Read it. Remember it.
          </Text>

          <View style={{ marginTop: 34 }}>
            <Text style={mono}>Navigate</Text>
            <View style={{ marginTop: 20, gap: 11 }}>
              <Pressable onPress={() => scrollTo("how-it-works")}>
                <Text style={{ fontFamily: fontFamily.geistMono, fontSize: 12, color: brandColors.soft }}>
                  How it works
                </Text>
              </Pressable>
              <Pressable onPress={() => scrollTo("themes")}>
                <Text style={{ fontFamily: fontFamily.geistMono, fontSize: 12, color: brandColors.soft }}>
                  Themes
                </Text>
              </Pressable>
              <Pressable onPress={() => goTo("/")}>
                <Text style={{ fontFamily: fontFamily.geistMono, fontSize: 12, color: brandColors.soft }}>
                  Dashboard
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 34 }}>
            <Text style={mono}>Contact the Developer</Text>
            <View style={{ marginTop: 20, gap: 11 }}>
              {SOCIALS.map((social) => (
                <Pressable key={social.label} onPress={() => void Linking.openURL(social.href)}>
                  <Text style={{ fontFamily: fontFamily.geistMono, fontSize: 12, color: brandColors.soft }}>
                    {social.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View
            style={{
              marginTop: 75,
              paddingTop: 18,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: brandColors.line,
              gap: 12,
            }}
          >
            <Text style={[mono, { fontSize: 10, color: brandColors.soft }]}>© 2026 Zist</Text>
            <Text style={[mono, { fontSize: 10, color: brandColors.soft }]}>
              Built for better attention.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* `.landing-drawer` — a full-screen panel below 840px. */}
      {menuOpen ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: brandColors.bg,
            paddingTop: insets.top + 24,
            paddingHorizontal: 18,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[mono, { color: brandColors.soft }]}>Menu / Zist</Text>
            <Pressable onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu" hitSlop={8}>
              <X size={24} color={brandColors.paper} />
            </Pressable>
          </View>

          <View style={{ marginTop: 60, gap: 24 }}>
            <Pressable onPress={() => goTo("/signup")}>
              <Text
                style={[
                  display,
                  { fontSize: 36, lineHeight: 44, textTransform: "uppercase" },
                ]}
              >
                Join Zist
              </Text>
            </Pressable>
            <Pressable onPress={() => goTo("/login")}>
              <Text
                style={[
                  display,
                  { fontSize: 36, lineHeight: 44, textTransform: "uppercase", color: brandColors.accent },
                ]}
              >
                Log In
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 48 }}>
            <Text style={mono}>Contact Developer</Text>
            <View style={{ marginTop: 16, gap: 12 }}>
              {SOCIALS.map((social) => (
                <Pressable key={social.label} onPress={() => void Linking.openURL(social.href)}>
                  <Text style={{ fontFamily: fontFamily.geistMono, fontSize: 13, color: brandColors.soft }}>
                    {social.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View
            style={{
              marginTop: "auto",
              flexDirection: "row",
              alignItems: "center",
              gap: 20,
            }}
          >
            <Pressable
              onPress={() => goTo("/signup")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 17,
                paddingHorizontal: 22,
                borderRadius: 999,
                backgroundColor: brandColors.accent,
              }}
            >
              <Text style={{ fontFamily: fontFamily.geistMonoMedium, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: brandColors.bg }}>
                Get Started
              </Text>
              <ArrowUpRight size={15} color={brandColors.bg} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
