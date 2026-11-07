import Constants from "expo-constants";
import { Platform } from "react-native";
import { API_URL } from "@/lib/env";
import { localStorage, sessionStorage } from "@/lib/webStorage";

const configuredApiUrl = API_URL;

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

/**
 * Detect host IP if running under Expo Go / Metro development.
 * Expo Go knows the Metro packager host IP in `Constants.expoConfig?.hostUri`.
 */
const detectedHostIp = (() => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (
      ip &&
      ip !== "localhost" &&
      ip !== "127.0.0.1" &&
      !ip.includes("expo.app") &&
      !ip.includes("exp.direct")
    ) {
      return ip;
    }
  }
  return null;
})();

export function getCustomApiUrl(): string | null {
  return localStorage.getItem("custom_api_url") || null;
}

export function setCustomApiUrl(url: string | null): void {
  if (url && url.trim()) {
    localStorage.setItem("custom_api_url", normalizeBaseUrl(url.trim()));
  } else {
    localStorage.removeItem("custom_api_url");
  }
}

export function getCandidateBaseUrls(): string[] {
  const custom = getCustomApiUrl();
  const candidates = [
    custom,
    configuredApiUrl,
    detectedHostIp ? `http://${detectedHostIp}:8000/api/v1` : null,
    Platform.OS === "android" ? "http://10.0.2.2:8000/api/v1" : null,
    "http://localhost:8000/api/v1",
  ];

  return Array.from(
    new Set(
      candidates
        .filter(
          (url): url is string =>
            typeof url === "string" && /^https?:\/\//i.test(url.trim()),
        )
        .map((url) => normalizeBaseUrl(url.trim())),
    ),
  );
}

const REQUEST_TIMEOUT_MS = __DEV__ ? 8_000 : 45_000;

if (getCandidateBaseUrls().length === 0) {
  console.warn(
    "[api] EXPO_PUBLIC_API_URL is missing or is not an absolute http(s) URL — API calls cannot succeed.",
  );
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

type UnauthorizedHandler = () => void;

const unauthorizedHandlers = new Set<UnauthorizedHandler>();

/** Token currently available to send, preferring the persistent tier. */
function getStoredToken(): string | null {
  return localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
}

/**
 * Subscribe to "the backend rejected the bearer token we sent" (HTTP 401, or
 * 403 "Not authenticated" from FastAPI's `HTTPBearer`).
 *
 * The token cannot be refreshed — the backend issues a `refresh_token` but has
 * no `/auth/refresh` route — so the only correct reaction is to forget the
 * session and send the user back to sign in. `authService` cannot be imported
 * here (it imports this module), so interested parties subscribe instead.
 */
export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
}

function notifyUnauthorized(): void {
  for (const handler of Array.from(unauthorizedHandlers)) {
    try {
      handler();
    } catch (error) {
      console.warn("[api] unauthorized handler threw", error);
    }
  }
}

class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getErrorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== "object") return `HTTP ${status}`;

  const payload = data as {
    detail?: unknown;
    message?: unknown;
  };

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }

  if (
    payload.detail &&
    typeof payload.detail === "object" &&
    !Array.isArray(payload.detail)
  ) {
    const detail = payload.detail as { message?: unknown };
    if (typeof detail.message === "string" && detail.message.trim()) {
      return detail.message;
    }
  }

  if (Array.isArray(payload.detail)) {
    const messages = payload.detail
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const error = item as { loc?: unknown; msg?: unknown };
        const message =
          typeof error.msg === "string" ? error.msg.trim() : "";
        if (!message) return null;

        const location = Array.isArray(error.loc)
          ? error.loc.filter((part) => typeof part === "string").join(".")
          : "";
        return location ? `${location}: ${message}` : message;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) return messages.join("\n");
  }

  return `HTTP ${status}`;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, headers = {}, ...fetchOptions } = options;

  // Prefer persistent token, fall back to session token.
  const token = getStoredToken();

  // A 401 from these two means "wrong email/password", not "your session
  // died", so they must not sign the user out of an existing session. They
  // also must not carry a stale bearer token: a sign-in is exactly how you
  // replace one.
  const isCredentialCheck =
    endpoint === "/auth/login" || endpoint === "/auth/signup";

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
    ...(headers as Record<string, string>),
  };

  if (token && !isCredentialCheck) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let lastNetworkError: Error | null = null;
  let lastApiError: ApiError | null = null;
  const baseUrls = getCandidateBaseUrls();

  for (const baseUrl of baseUrls) {
    let url = `${baseUrl}${endpoint}`;

    // Add query parameters
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    let timedOut = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(url, {
          ...fetchOptions,
          headers: finalHeaders,
          signal: fetchOptions.signal ?? controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const apiError = new ApiError(
          response.status,
          data,
          getErrorMessage(data, response.status),
        );
        const detailMessage = apiError.message;

        // A bearer token we sent was refused: the session is over. This is the
        // signal that turns a wall of "Not authenticated" errors into a clean
        // sign-out, so it must fire before the 404/405 retry below.
        //
        // FastAPI's `HTTPBearer` answers a missing/unsupported credential with
        // 403 "Not authenticated" rather than 401, so both statuses have to be
        // recognised — but a 403 for any *other* reason is an authorisation
        // problem, not a dead session.
        //
        // Only react while the rejected token is still the one we hold. A slow
        // response from a previous session must never invalidate a fresh login
        // (the token lives in a single global slot, so the user can sign in
        // again while an old request is still in flight).
        const isRevokedCredential =
          apiError.status === 401 ||
          (apiError.status === 403 && detailMessage === "Not authenticated");
        const tokenIsStillCurrent = token !== null && getStoredToken() === token;

        if (isRevokedCredential && tokenIsStillCurrent && !isCredentialCheck) {
          notifyUnauthorized();
        }

        // If a base URL is wrong (common with missing dev proxy), try the next base.
        if (apiError.status === 404 || apiError.status === 405) {
          lastApiError = apiError;
          continue;
        }

        throw apiError;
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (
        timedOut ||
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && /abort|cancel/i.test(error.message))
      ) {
        lastNetworkError = new Error(
          `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`,
        );
        continue;
      }
      lastNetworkError =
        error instanceof Error ? error : new Error("Network request failed");
    }
  }

  if (lastApiError) {
    throw lastApiError;
  }

  const triedSummary = baseUrls.join(", ");
  throw new Error(
    `API request failed: ${lastNetworkError?.message || "Failed to fetch"}. Tried: [${triedSummary}]. Ensure FastAPI is running on host 0.0.0.0 and firewall permits port 8000.`,
  );
}

export async function testServerConnection(
  targetUrl?: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const urlToTry = targetUrl
    ? normalizeBaseUrl(targetUrl)
    : getCandidateBaseUrls()[0] || "";
  if (!urlToTry) return { ok: false, error: "No URL provided" };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const rootUrl = urlToTry.replace(/\/api\/v1\/?$/, "");
    const response = await fetch(`${rootUrl}/docs`, {
      method: "GET",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (response.status < 500) {
      return { ok: true, status: response.status };
    }
    return { ok: false, status: response.status, error: `HTTP ${response.status}` };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Connection refused / timed out" };
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};

export { ApiError };
