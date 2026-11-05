import { API_URL } from "@/lib/env";
import { localStorage, sessionStorage } from "@/lib/webStorage";

const configuredApiUrl = API_URL;

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

/**
 * Base URLs to try, in order.
 *
 * The web client also fell back to a relative `/api/v1` path, which the browser
 * resolves against the current origin. React Native's `fetch` has no document
 * base URL, so a relative candidate is meaningless here — every entry must be
 * absolute or the request silently fails.
 */
const API_BASE_URLS = Array.from(
  new Set(
    [configuredApiUrl]
      .filter(
        (url): url is string =>
          typeof url === "string" && /^https?:\/\//i.test(url.trim()),
      )
      .map((url) => normalizeBaseUrl(url.trim())),
  ),
);

if (API_BASE_URLS.length === 0) {
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

  for (const baseUrl of API_BASE_URLS) {
    let url = `${baseUrl}${endpoint}`;

    // Add query parameters
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: finalHeaders,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detailMessage =
          typeof data?.detail === "string"
            ? data.detail
            : data?.detail?.message || data?.message;
        const apiError = new ApiError(
          response.status,
          data,
          detailMessage || `HTTP ${response.status}`,
        );

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
      lastNetworkError =
        error instanceof Error ? error : new Error("Network request failed");
    }
  }

  if (lastApiError) {
    throw lastApiError;
  }

  throw new Error(
    `API request failed: ${lastNetworkError?.message || "Failed to fetch"}`,
  );
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
