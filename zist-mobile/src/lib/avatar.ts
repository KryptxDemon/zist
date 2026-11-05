/**
 * Avatar helpers — ported from the web `pages/Profile.tsx`.
 *
 * The web app can synthesise an avatar in two ways:
 *   1. an initials tile drawn as an inline SVG, stored as a
 *      `data:image/svg+xml;charset=UTF-8,…` URI, and
 *   2. a centre-cropped, compressed JPEG from a file upload, stored as a
 *      `data:image/jpeg;base64,…` URI.
 *
 * Both are persisted verbatim in the `avatar` column so an avatar created on
 * the web renders on mobile and vice-versa. React Native's `Image` cannot
 * draw SVG, so `../components/ui/Avatar` decodes SVG data URIs and renders
 * them with `react-native-svg` instead — see `svgDataUriToXml` below.
 */
import * as ImagePicker from "expo-image-picker";

export interface AvatarPreset {
  name: string;
  colors: readonly [string, string];
}

/** The eight gradient presets offered by the web avatar studio. */
export const avatarPresets: readonly AvatarPreset[] = [
  { name: "Aurora", colors: ["#0ea5e9", "#1d4ed8"] },
  { name: "Sunset", colors: ["#fb7185", "#f97316"] },
  { name: "Forest", colors: ["#22c55e", "#166534"] },
  { name: "Midnight", colors: ["#1f2937", "#4f46e5"] },
  { name: "Candy", colors: ["#ec4899", "#8b5cf6"] },
  { name: "Citrus", colors: ["#f59e0b", "#eab308"] },
  { name: "Ocean", colors: ["#06b6d4", "#0f766e"] },
  { name: "Slate", colors: ["#334155", "#0f172a"] },
];

/** The preset used by the "Use initials" shortcut (matches the web index 3). */
export const defaultInitialsPreset = avatarPresets[3];

/**
 * Up-to-two-letter initials, mirroring the web `getInitials`: first/last name
 * win, then the first two words of the display name, then its first letter.
 */
export function getInitials(
  firstName: string,
  lastName: string,
  displayName: string,
): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  if (first || last) return `${first}${last}`.trim().toUpperCase();

  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }

  return (displayName.trim().charAt(0) || "U").toUpperCase();
}

/** The raw SVG markup behind an initials avatar (before URI encoding). */
export function initialsAvatarSvg(
  initials: string,
  colors: readonly [string, string],
): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colors[0]}" />
          <stop offset="100%" stop-color="${colors[1]}" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#bg)" />
      <circle cx="256" cy="256" r="176" fill="rgba(255,255,255,0.08)" />
      <text x="50%" y="54%" text-anchor="middle" font-family="Arial, sans-serif" font-size="164" font-weight="700" fill="white" dominant-baseline="middle">${initials}</text>
    </svg>
  `;
}

/**
 * Inline SVG data URI for an initials avatar — byte-for-byte the same format
 * the web app stores, so both clients can read each other's values.
 */
export function createInitialsAvatar(
  initials: string,
  colors: readonly [string, string],
): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    initialsAvatarSvg(initials, colors),
  )}`;
}

const SVG_DATA_URI = /^data:image\/svg\+xml/i;

/** True when `uri` is an SVG data URI (and therefore needs `SvgXml`). */
export function isSvgDataUri(uri?: string | null): boolean {
  return !!uri && SVG_DATA_URI.test(uri);
}

/**
 * Extract the raw SVG markup from an SVG data URI. Returns `null` for
 * anything that is not an SVG data URI. Handles both the percent-encoded
 * form the app writes and the base64 form other tools may produce.
 */
export function svgDataUriToXml(uri?: string | null): string | null {
  if (!uri) return null;

  const comma = uri.indexOf(",");
  if (!SVG_DATA_URI.test(uri) || comma === -1) return null;

  const meta = uri.slice(0, comma);
  const payload = uri.slice(comma + 1);

  try {
    if (/;base64/i.test(meta)) {
      return decodeBase64Utf8(payload).trim() || null;
    }
    return decodeURIComponent(payload).trim() || null;
  } catch {
    return null;
  }
}

/** Minimal base64 → UTF-8 decoder (no `atob`/`Buffer` in React Native). */
function decodeBase64Utf8(value: string): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = value.replace(/[^A-Za-z0-9+/=]/g, "");

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    if (char === "=") break;
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  // Decode the UTF-8 byte sequence into a JS string.
  let result = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i];
    if (byte < 0x80) {
      result += String.fromCharCode(byte);
    } else if (byte >= 0xc0 && byte < 0xe0) {
      result += String.fromCharCode(((byte & 0x1f) << 6) | (bytes[++i] & 0x3f));
    } else if (byte >= 0xe0) {
      result += String.fromCharCode(
        ((byte & 0x0f) << 12) |
          ((bytes[++i] & 0x3f) << 6) |
          (bytes[++i] & 0x3f),
      );
    }
  }
  return result;
}

/**
 * Open the photo library and return a square-cropped JPEG data URI, matching
 * the web's `compressImage` (320px square, JPEG quality 0.82). Returns `null`
 * when the user cancels. Throws a friendly error when access is denied.
 */
export async function pickAvatarImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "Photo library access is required to upload an avatar. Enable it in Settings and try again.",
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.82,
    base64: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset?.base64) throw new Error("Unable to read the selected image.");

  return `data:image/jpeg;base64,${asset.base64}`;
}
