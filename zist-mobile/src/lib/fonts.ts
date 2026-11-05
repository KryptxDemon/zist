import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from "@expo-google-fonts/inter-tight";
import { Boldonse_400Regular } from "@expo-google-fonts/boldonse";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans";
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
} from "@expo-google-fonts/geist-mono";
import { useFonts } from "expo-font";
import { useEffect } from "react";

/**
 * Loads the families the web app pulls from Google Fonts.
 *
 * `Inter Tight` (body) and `Space Grotesk` (display) cover the signed-in app.
 * `Boldonse`, `DM Sans` and `Geist Mono` are the marketing identity: the web's
 * `Landing.css` / `Login.css` / `Signup.css` declare their own
 * `--landing-display` (Boldonse), `--landing-copy` (DM Sans) and
 * `--landing-mono` (Geist Mono) variables, and those pages are always dark
 * regardless of the app theme.
 */
export const fontAssets = {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  Boldonse_400Regular,
  DMSans_500Medium,
  GeistMono_400Regular,
  GeistMono_500Medium,
};

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    if (error) {
      // Falling through to the system fonts beats hanging on the boot screen.
      console.warn("[zist] Font loading failed; using system fonts.", error);
    }
  }, [error]);

  return loaded || error != null;
}
