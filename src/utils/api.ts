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

export async function updateProfile(updates: { name?: string; handle?: string; bio?: string; avatar?: string; styleAlign?: string }) {
  const res = await apiFetch("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Could not update profile");
  }
  return res.json();
}

export async function exchangeAuth0Token(idToken: string) {
  const res = await apiFetch("/auth/auth0-exchange", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Social login failed");
  }
  const data = await res.json();
  setToken(data.access_token);
  return data.user;
}

export function logout() {
  clearToken();
}

// --- Composition ---
export interface GenerateOptions {
  mode?: "simple" | "custom";
  style?: string;
  lyrics?: string;
  userTitle?: string;
}

export async function generateBlueprint(prompt: string, agentsSettings: any[], options: GenerateOptions = {}) {
  const res = await apiFetch("/api/generate-blueprint", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      agentsSettings,
      mode: options.mode || "simple",
      style: options.style,
      lyrics: options.lyrics,
      userTitle: options.userTitle,
    }),
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

// --- Music Videos ---
export async function saveVideo(title: string, clips: any[], renderedVideoBase64: string, mimeType: string = "video/webm") {
  const res = await apiFetch("/api/videos", {
    method: "POST",
    body: JSON.stringify({ title, clips, renderedVideoBase64, mimeType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Could not save video");
  }
  return res.json();
}

export async function listVideos() {
  const res = await apiFetch("/api/videos");
  if (!res.ok) throw new Error("Could not load videos");
  return res.json();
}

export function videoFileUrl(id: string): string {
  const token = getToken();
  return `${API_BASE_URL}/api/videos/${id}/file${token ? `?_t=${Date.now()}` : ""}`;
}

export async function fetchVideoBlob(id: string): Promise<string> {
  const res = await apiFetch(`/api/videos/${id}/file`);
  if (!res.ok) throw new Error("Could not load video file");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function deleteVideo(id: string) {
  const res = await apiFetch(`/api/videos/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not delete video");
  return res.json();
}

// --- Artist Page ---
export interface SocialLink { label: string; url: string; }

export async function getMyArtistPage() {
  const res = await apiFetch("/api/artist-page/mine");
  if (!res.ok) throw new Error("Could not load artist page");
  return res.json();
}

export async function saveMyArtistPage(data: {
  slug: string; displayName: string; tagline?: string; bio?: string;
  avatarUrl?: string; bannerImageBase64?: string; accentColor?: string; links: SocialLink[];
}) {
  const res = await apiFetch("/api/artist-page/mine", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Could not save artist page");
  }
  return res.json();
}

export async function getPublicArtistPage(slug: string) {
  const res = await fetch(`${API_BASE_URL}/api/artist-page/public/${slug}`);
  if (!res.ok) throw new Error("Artist page not found");
  return res.json();
}

// --- Releases (CrazyJam Music) ---
export async function publishRelease(trackId: string, options: { albumArtId?: string; videoId?: string; description?: string; marketingBlurb?: string } = {}) {
  const res = await apiFetch("/api/releases", {
    method: "POST",
    body: JSON.stringify({ trackId, ...options }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Could not publish release");
  }
  return res.json();
}

export async function listMyReleases() {
  const res = await apiFetch("/api/releases/mine");
  if (!res.ok) throw new Error("Could not load your releases");
  return res.json();
}

export async function unpublishRelease(id: string) {
  const res = await apiFetch(`/api/releases/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not unpublish release");
  return res.json();
}

export async function discoverReleases(limit: number = 30, skip: number = 0) {
  const res = await fetch(`${API_BASE_URL}/api/releases/discover?limit=${limit}&skip=${skip}`);
  if (!res.ok) throw new Error("Could not load CrazyJam Music feed");
  return res.json();
}

export async function getPublicRelease(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/releases/public/${id}`);
  if (!res.ok) throw new Error("Release not found");
  return res.json();
}

export function publicReleaseVideoUrl(id: string): string {
  return `${API_BASE_URL}/api/releases/public/${id}/video`;
}
