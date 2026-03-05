/**
 * API utility — makes authenticated requests to the FastAPI backend.
 */

const API_BASE = "http://localhost:8000";

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string | null,
) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type to JSON if the body is NOT FormData.
  // FormData needs the browser to auto-set multipart/form-data with the boundary.
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}
