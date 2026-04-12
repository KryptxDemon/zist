const configuredApiUrl = import.meta.env.VITE_API_URL;
const DEFAULT_API_BASE_URLS = [
  "/api/v1",
  "http://127.0.0.1:8000/api/v1",
  "http://localhost:8000/api/v1",
];

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

const API_BASE_URLS = Array.from(
  new Set(
    [configuredApiUrl, ...DEFAULT_API_BASE_URLS]
      .filter(
        (url): url is string =>
          typeof url === "string" && url.trim().length > 0,
      )
      .map((url) => normalizeBaseUrl(url.trim())),
  ),
);

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
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
  const token =
    localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  const finalHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
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
        const apiError = new ApiError(
          response.status,
          data,
          data?.detail || data?.message || `HTTP ${response.status}`,
        );

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
