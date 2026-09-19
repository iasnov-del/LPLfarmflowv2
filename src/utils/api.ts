// Default Cloud Run backend URL for this applet
const DEFAULT_SUBDOMAIN = "ais-pre-cztzcg2anndmdbze6ale65-531558609499";
export const CLOUD_RUN_BACKEND_URL = `https://${DEFAULT_SUBDOMAIN}.asia-east1.run.app`;

/**
 * Resolves the appropriate backend API base URL based on environment,
 * local storage overrides, or hosting domain (such as Netlify).
 */
export function getApiBaseUrl(): string {
  // 1. Check explicit environment variable (e.g., VITE_API_URL set in Netlify site settings)
  const metaEnv = (import.meta as any)?.env || {};
  const envUrl = ((metaEnv.VITE_API_URL || metaEnv.VITE_API_BASE_URL || "") as string).trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    // 2. Check for user-defined custom API URL in localStorage
    const savedUrl = localStorage.getItem("farmflow_api_url");
    if (savedUrl && savedUrl.trim()) {
      const clean = savedUrl.trim().replace(/\/$/, "");
      if (clean.includes("ais-pre.cztzcg2anndmdbze6ale65")) {
        const fixed = clean.replace("ais-pre.cztzcg2anndmdbze6ale65", "ais-pre-cztzcg2anndmdbze6ale65");
        localStorage.setItem("farmflow_api_url", fixed);
        return fixed;
      }
      return clean;
    }

    // 3. When deployed and running on Netlify (e.g., *.netlify.app)
    if (window.location.hostname.includes("netlify.app")) {
      return CLOUD_RUN_BACKEND_URL;
    }
  }

  // Fall back to same-origin relative path (e.g., when hosted directly on Cloud Run dev/prod)
  return "";
}

/**
 * Allows setting a custom backend URL at runtime (e.g. from Settings or Login)
 */
export function setCustomApiBaseUrl(url: string | null) {
  if (typeof window === "undefined") return;
  if (!url || !url.trim()) {
    localStorage.removeItem("farmflow_api_url");
  } else {
    localStorage.setItem("farmflow_api_url", url.trim().replace(/\/$/, ""));
  }
}

/**
 * Builds the complete URL for an API endpoint
 */
export function resolveApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

/**
 * Main fetch wrapper for API requests
 */
export async function apiFetch(url: string, options?: RequestInit) {
  const finalUrl = resolveApiUrl(url);

  let response: Response;
  try {
    response = await fetch(finalUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...options?.headers,
      },
    });
  } catch (networkErr: any) {
    console.warn(`Initial fetch to ${finalUrl} failed:`, networkErr);

    // If a relative URL failed and we're not on localhost, attempt fallback to CLOUD_RUN_BACKEND_URL
    if (typeof window !== "undefined" && !finalUrl.startsWith("http") && window.location.hostname !== "localhost") {
      try {
        const fallbackUrl = `${CLOUD_RUN_BACKEND_URL}${url.startsWith("/") ? url : `/${url}`}`;
        response = await fetch(fallbackUrl, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...options?.headers,
          },
        });
      } catch (fallbackErr) {
        throw new Error("Unable to connect to the backend server. Please check your internet connection or backend status.");
      }
    } else {
      throw new Error("Unable to connect to the backend server. Please check your internet connection.");
    }
  }

  const contentType = response.headers.get("content-type") || "";

  // Check for HTTP errors
  if (!response.ok) {
    // If Netlify served an HTML 404/fallback page instead of a backend JSON response:
    if (contentType.includes("text/html")) {
      // If we called a relative URL on Netlify or external domain, retry against CLOUD_RUN_BACKEND_URL
      if (typeof window !== "undefined" && !finalUrl.startsWith("http")) {
        try {
          const fallbackUrl = `${CLOUD_RUN_BACKEND_URL}${url.startsWith("/") ? url : `/${url}`}`;
          const retryResponse = await fetch(fallbackUrl, {
            ...options,
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              ...options?.headers,
            },
          });
          if (retryResponse.ok) {
            return await retryResponse.json();
          }
          const retryError = await retryResponse.json().catch(() => ({}));
          throw new Error(retryError.message || `Server returned error status ${retryResponse.status}`);
        } catch (retryErr: any) {
          throw new Error(retryErr.message || "Netlify could not route API request to the backend server.");
        }
      }
      throw new Error(`API endpoint not found (HTTP ${response.status}). Ensure the backend server is running and accessible.`);
    }

    const error = await response.json().catch(() => ({ message: "An unknown error occurred" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  // Parse JSON response
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
