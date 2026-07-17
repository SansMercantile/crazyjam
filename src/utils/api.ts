/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Base URL of the CrazyJam backend (constellation/crazyjam/backend).
// Set VITE_API_BASE_URL in .env.local for local dev / your deployment.
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";

const TOKEN_KEY = "crazyjam_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Session expired or invalid - force back to login.
    clearToken();
  }

  return res;
}

// --- Auth ---
export async function registerAccount(email: string, password: string, name?: string) {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }
  const data = await res.json();
  setToken(data.access_token);
  return data.user;
}

export async function loginAccount(email: string, password: string) {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  const data = await res.json();
  setToken(data.access_token);
  return data.user;
}

export async function fetchCurrentUser() {
  const res = await apiFetch("/auth/me");
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export function logout() {
  clearToken();
}

// --- Composition ---
export async function generateBlueprint(prompt: string, agentsSettings: any[]) {
  const res = await apiFetch("/api/generate-blueprint", {
    method: "POST",
    body: JSON.stringify({ prompt, agentsSettings }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Cloud connection failed with code: ${res.status}`);
  }
  return res.json();
}

export async function customerSupport(message: string, chatHistory: any[]) {
  const res = await apiFetch("/api/customer-support", {
    method: "POST",
    body: JSON.stringify({ message, chatHistory }),
  });
  if (!res.ok) throw new Error("Support link timed out");
  return res.json();
}

export async function humToBeat(audioBase64: string, mimeType: string) {
  const res = await apiFetch("/api/hum-to-beat", {
    method: "POST",
    body: JSON.stringify({ audio: audioBase64, mimeType }),
  });
  if (!res.ok) throw new Error("Bypassed audio analysis response");
  return res.json();
}

// --- Tracks ---
export async function saveTrack(title: string, blueprint: any, lyrics?: string, albumArtId?: string) {
  const res = await apiFetch("/api/tracks", {
    method: "POST",
    body: JSON.stringify({ title, blueprint, lyrics, albumArtId }),
  });
  if (!res.ok) throw new Error("Could not save track");
  return res.json();
}

export async function listTracks() {
  const res = await apiFetch("/api/tracks");
  if (!res.ok) throw new Error("Could not load tracks");
  return res.json();
}

export async function deleteTrack(id: string) {
  const res = await apiFetch(`/api/tracks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not delete track");
  return res.json();
}

// --- Album Art ---
export async function saveAlbumArt(title: string, layers: any[], backgroundColor: string, renderedImage: string) {
  const res = await apiFetch("/api/album-art", {
    method: "POST",
    body: JSON.stringify({ title, layers, backgroundColor, renderedImage }),
  });
  if (!res.ok) throw new Error("Could not save album art");
  return res.json();
}

export async function updateAlbumArt(id: string, title: string, layers: any[], backgroundColor: string, renderedImage: string) {
  const res = await apiFetch(`/api/album-art/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title, layers, backgroundColor, renderedImage }),
  });
  if (!res.ok) throw new Error("Could not update album art");
  return res.json();
}

export async function listAlbumArt() {
  const res = await apiFetch("/api/album-art");
  if (!res.ok) throw new Error("Could not load album art");
  return res.json();
}

export async function deleteAlbumArt(id: string) {
  const res = await apiFetch(`/api/album-art/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not delete album art");
  return res.json();
}
