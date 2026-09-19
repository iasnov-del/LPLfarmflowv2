// Default Cloud Run backend URL for this applet (development preview only)
const DEFAULT_SUBDOMAIN = "ais-pre-cztzcg2anndmdbze6ale65-531558609499";
export const CLOUD_RUN_BACKEND_URL = `https://${DEFAULT_SUBDOMAIN}.asia-east1.run.app`;

/**
 * Resolves the appropriate backend API base URL based on environment,
 * local storage overrides, or hosting domain (such as Netlify).
 *
 * When deployed on Netlify:
 * - Netlify Functions handle /api/* seamlessly on the exact same domain ("").
 * - If the user configures VITE_API_URL in Netlify Site Settings, it uses that external backend.
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
      // Clean up legacy references to internal sandbox URLs that cannot accept external traffic
      if (clean.includes("ais-pre") || clean.includes("ais-dev")) {
        localStorage.removeItem("farmflow_api_url");
      } else {
        return clean;
      }
    }
  }

  // Same-origin relative path by default: works for Netlify Functions (/.netlify/functions/api),
  // local development (http://localhost:3000), and Cloud Run
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
    console.warn(`Fetch to ${finalUrl} failed:`, networkErr);
    throw new Error("Unable to connect to the backend server. Please verify your connection or backend status.");
  }

  const contentType = response.headers.get("content-type") || "";

  // Check for HTTP errors
  if (!response.ok) {
    // If Netlify or server returned an HTML fallback page instead of JSON:
    if (contentType.includes("text/html")) {
      throw new Error(
        `API endpoint returned HTML (HTTP ${response.status}). If deployed on Netlify, verify that Netlify Functions are active and MONGODB_URI is set in Netlify Site Settings.`
      );
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

