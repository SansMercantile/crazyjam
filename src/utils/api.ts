/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Base URL of the CrazyJam backend (constellation/crazyjam/backend).
// Set VITE_API_BASE_URL in .env.local to override for local dev (e.g. http://localhost:8000).
// Production leaves this empty (same-origin): vercel.json rewrites /auth/* and /api/*
// server-side to the ALB in front of ECS Fargate (crazyjam-cluster/crazyjam-backend-svc).
// This avoids mixed-content blocks (HTTPS page -> HTTP backend) since the browser only
// ever talks to crazyjam.sansmercantile.com; Vercel's edge does the HTTP hop server-side.
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";

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

// --- Live agent (Pipecat voice + avatar over WebSocket) ---
// Vercel's edge rewrites /api/* as plain HTTP and does NOT upgrade WebSocket
// connections, so the live-agent socket goes straight to the ALB hostname
// (which we've verified upgrades + serves the agent routes). Override with
// VITE_AGENT_WS_URL for local dev (e.g. ws://localhost:8000/api/agent).
const AGENT_WS_BASE =
  (import.meta as any).env?.VITE_AGENT_WS_URL ||
  "ws://crazyjam-alb-919447685.us-east-1.elb.amazonaws.com/api/agent";

export type AgentKind = "support" | "avatar";

/** Opens an authenticated live-agent WebSocket. Returns the socket, or throws. */
export function openAgentSocket(kind: AgentKind): WebSocket {
  const token = getToken();
  if (!token) throw new Error("Not logged in");
  const url = `${AGENT_WS_BASE}/${kind}?token=${encodeURIComponent(token)}`;
  return new WebSocket(url);
}

// --- Real generative audio (MusicGen, running on the GPU box) ---
// Genuinely different from generateBlueprint above: that drives the
// client-side synth sequencer, this returns real generated audio bytes
// from an actual model. Instrumental only - no vocals. Generation takes
// ~20s+ so this uses a longer timeout than the default fetch.
export interface GenerateMusicResult {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  generationSeconds?: number;
  errorMessage?: string;
}

export async function generateRealAudio(prompt: string, durationSeconds: number = 8): Promise<GenerateMusicResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 150000); // 150s - generation + GPU cold spots
  try {
    const res = await apiFetch("/api/music-generation/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, durationSeconds }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Generation request failed");
    }
    return res.json();
  } catch (e: any) {
    if (e.name === "AbortError") throw new Error("Generation timed out - the GPU may be busy, try again shortly.");
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkMusicGenAvailable(): Promise<boolean> {
  try {
    const res = await apiFetch("/api/music-generation/status");
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.available;
  } catch {
    return false;
  }
}

// --- Full-song generation with VOCALS (ACE-Step 1.5 on the A10G GPU box) ---
// The vocal counterpart to generateRealAudio (instrumental-only). Suno's core:
// lyrics + style -> a sung song. Returns the first take + optional variants
// (Suno's two-version pattern). MIT-licensed model.
export interface GenerateSongResult {
  success: boolean;
  audioBase64?: string;
  audioBase64Variants?: string[];
  mimeType?: string;
  hasVocals?: boolean;
  generationSeconds?: number;
  errorMessage?: string;
}

export async function generateSong(
  prompt: string,
  lyrics: string,
  durationSeconds: number = 30,
  instrumental: boolean = false,
  variants: number = 2
): Promise<GenerateSongResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 320000); // vocal gen is slow
  try {
    const res = await apiFetch("/api/song-generation/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, lyrics, durationSeconds, instrumental, variants }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Song generation request failed");
    }
    return res.json();
  } catch (e: any) {
    if (e.name === "AbortError") throw new Error("Song generation timed out - the GPU may be busy, try again shortly.");
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkSongGenAvailable(): Promise<boolean> {
  try {
    const res = await apiFetch("/api/song-generation/status");
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.available;
  } catch {
    return false;
  }
}

// --- Real lip-sync video (Polly TTS + self-hosted Wav2Lip, same GPU box
// as MusicGen) --- Animates a reference face photo speaking/singing the
// given text. Render is CPU-bound (the GPU's memory is committed to
// MusicGen) so this can take longer than audio generation.
export interface GenerateLipSyncResult {
  success: boolean;
  videoBase64?: string;
  mimeType?: string;
  generationSeconds?: number;
  errorMessage?: string;
}

export async function generateLipSyncVideo(
  text: string,
  faceImageBase64: string,
  faceImageContentType: string = "image/jpeg"
): Promise<GenerateLipSyncResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 170000); // CPU render, can be slow
  try {
    const res = await apiFetch("/api/lip-sync/generate", {
      method: "POST",
      body: JSON.stringify({ text, faceImageBase64, faceImageContentType }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Lip-sync generation request failed");
    }
    return res.json();
  } catch (e: any) {
    if (e.name === "AbortError") throw new Error("Render timed out - try a shorter line of text.");
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkLipSyncAvailable(): Promise<boolean> {
  try {
    const res = await apiFetch("/api/lip-sync/status");
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.available;
  } catch {
    return false;
  }
}

/** Converts a base64 string (no data: prefix) into a playable object URL. */
export function base64ToAudioUrl(base64: string, mimeType: string = "audio/wav"): string {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
}

// --- Tracks ---
export interface SaveTrackOptions {
  renderedAudioBase64?: string;
  audioMimeType?: string;
  source?: "generated" | "upload" | "remix" | "cover";
  remixOfTrackId?: string;
}

export async function saveTrack(
  title: string,
  blueprint: any,
  lyrics?: string,
  albumArtId?: string,
  options?: SaveTrackOptions
) {
  const res = await apiFetch("/api/tracks", {
    method: "POST",
    body: JSON.stringify({ title, blueprint, lyrics, albumArtId, ...options }),
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

export async function fetchTrackAudioBlob(id: string): Promise<string> {
  const res = await apiFetch(`/api/tracks/${id}/audio`);
  if (!res.ok) throw new Error("No audio available for this track");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function registerTrackPlay(id: string) {
  // Fire-and-forget play count - never let this block/break playback.
  try {
    await apiFetch(`/api/tracks/${id}/plays`, { method: "POST" });
  } catch {
    /* non-critical */
  }
}

/** Converts a rendered/uploaded audio Blob to base64 for saveTrack()'s renderedAudioBase64. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix - backend expects raw base64.
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

// Real AI album art generation (Bedrock Stable Image Core). Returns a
// single PNG the caller drops in as a normal, movable/editable image layer.
export interface GenerateAlbumArtResult {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  errorMessage?: string;
}

export async function generateAiAlbumArt(prompt: string): Promise<GenerateAlbumArtResult> {
  const res = await apiFetch("/api/album-art/generate-ai", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "AI image generation request failed");
  }
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

export function publicReleaseAudioUrl(id: string): string {
  return `${API_BASE_URL}/api/releases/public/${id}/audio`;
}

// --- Promotion Hub (playlist campaigns, charts registration, Beatport label) ---
export interface PromoRelease {
  id: string;
  title: string;
  type: string;
  status: string;
  primaryGenre: string;
  subGenres: string[];
  dittoLink?: string;
  upc?: string;
  catalogNumber?: string;
  spotifyAlbumId?: string;
  tracks: { n: number; title: string; isrc?: string }[];
}

export interface ChartBody {
  id: string; name: string; territory: string; requires: string[];
}

export async function getPromoCatalog(): Promise<PromoRelease[]> {
  const res = await apiFetch("/api/promotion/catalog");
  if (!res.ok) throw new Error("Could not load promotion catalog");
  return res.json();
}

export async function listChartBodies(): Promise<ChartBody[]> {
  const res = await apiFetch("/api/promotion/chart-bodies");
  if (!res.ok) throw new Error("Could not load chart bodies");
  return res.json();
}

export async function createPlaylistCampaign(payload: { releaseId: string; tier: string; trackTitle?: string; notes?: string }) {
  const res = await apiFetch("/api/promotion/campaigns", { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Could not create campaign");
  return res.json();
}

export async function listPlaylistCampaigns() {
  const res = await apiFetch("/api/promotion/campaigns");
  if (!res.ok) throw new Error("Could not load campaigns");
  return res.json();
}

export async function launchPlaylistCampaign(campaignId: string) {
  const res = await apiFetch(`/api/promotion/campaigns/${campaignId}/launch`, { method: "POST" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Could not launch campaign");
  return res.json();
}

export async function updateCampaignCurator(campaignId: string, payload: { curatorName: string; status: string; playlistUrl?: string }) {
  const res = await apiFetch(`/api/promotion/campaigns/${campaignId}/curator`, { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Could not update curator");
  return res.json();
}

export async function updateCampaignStats(campaignId: string, stats: { streams?: number; saves?: number; playlistAdds?: number }) {
  const res = await apiFetch(`/api/promotion/campaigns/${campaignId}/stats`, { method: "POST", body: JSON.stringify(stats) });
  if (!res.ok) throw new Error("Could not update stats");
  return res.json();
}

export async function registerForCharts(payload: { releaseId: string; chartBodyIds: string[]; upc?: string; catalogNumber?: string; isrcs?: string[]; notes?: string }) {
  const res = await apiFetch("/api/promotion/charts/register", { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Could not register for charts");
  return res.json();
}

export async function listChartRegistrations() {
  const res = await apiFetch("/api/promotion/charts/registrations");
  if (!res.ok) throw new Error("Could not load chart registrations");
  return res.json();
}

export async function confirmChartRegistration(regId: string) {
  const res = await apiFetch(`/api/promotion/charts/registrations/${regId}/confirm`, { method: "POST" });
  if (!res.ok) throw new Error("Could not confirm registration");
  return res.json();
}

export async function getBeatportLabel() {
  const res = await apiFetch("/api/promotion/beatport/label");
  if (!res.ok) throw new Error("Could not load Beatport label");
  return res.json();
}

export async function saveBeatportLabel(payload: { labelName: string; greenroomUrl?: string; contactEmail?: string; bio?: string; logoUrl?: string; status?: string }) {
  const res = await apiFetch("/api/promotion/beatport/label", { method: "PUT", body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("Could not save Beatport label");
  return res.json();
}

export async function setupBeatportRelease(payload: { releaseId: string; beatportGenre?: string; beatportSubGenres?: string[]; exclusiveWindow?: boolean; preOrderDate?: string; releaseDate?: string; notes?: string }) {
  const res = await apiFetch("/api/promotion/beatport/releases", { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Could not set up Beatport release");
  return res.json();
}

export async function listBeatportReleases() {
  const res = await apiFetch("/api/promotion/beatport/releases");
  if (!res.ok) throw new Error("Could not load Beatport releases");
  return res.json();
}

export async function submitBeatportDjChart(payload: { title: string; description?: string; trackUrls: string[]; genre?: string }) {
  const res = await apiFetch("/api/promotion/beatport/dj-charts", { method: "POST", body: JSON.stringify(payload) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Could not submit DJ chart");
  return res.json();
}

export async function listBeatportDjCharts() {
  const res = await apiFetch("/api/promotion/beatport/dj-charts");
  if (!res.ok) throw new Error("Could not load DJ charts");
  return res.json();
}

// --- AI Music Video Director (AWS-native: Claude for writing/analysis,
// Stability for stills, Luma Ray 2 for atmosphere/b-roll video). The
// performer's own singing shot is NOT generated here - see generateLipSyncVideo
// above; the frontend composites both into the timeline separately. ---
export interface VideoDirectorConcept {
  id: string;
  title: string;
  awardCategory: string;
  storylineSynopsis: string;
  narrativeTone: string;
  characterRole: string;
  logline: string;
  visualStyle: string;
  directorVision: string;
  recommendedArtistStyle: string;
  colorPalette: string[];
}

export interface VideoDirectorScene {
  id: string;
  name: string;
  timestamp: string;
  storyBeat: string;
  narrativeAction: string;
  description: string;
  cameraMove: string;
  lighting: string;
  imagePrompt: string;
}

export interface AnalyzeConceptsResult {
  success: boolean;
  audioAnalysis?: string;
  concepts?: VideoDirectorConcept[];
  errorMessage?: string;
}

export async function analyzeVideoConcepts(params: {
  trackTitle: string; genre?: string; bpm?: number; mood?: string; description?: string;
  lyricsConcept?: string; storyline?: string; characterRole?: string; narrativeTone?: string; customNotes?: string;
}): Promise<AnalyzeConceptsResult> {
  const res = await apiFetch("/api/video-director/analyze-concepts", { method: "POST", body: JSON.stringify(params) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Concept analysis failed");
  return res.json();
}

export interface GenerateScenesResult {
  success: boolean;
  scenes?: VideoDirectorScene[];
  errorMessage?: string;
}

export async function generateConceptScenes(params: {
  conceptTitle: string; storylineSynopsis?: string; directorVision?: string; visualStyle?: string;
  narrativeTone?: string; characterRole?: string; trackTitle?: string; genre?: string; bpm?: number; mood?: string;
}): Promise<GenerateScenesResult> {
  const res = await apiFetch("/api/video-director/generate-scenes", { method: "POST", body: JSON.stringify(params) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Scene generation failed");
  return res.json();
}

export interface EnhanceSceneResult {
  success: boolean;
  enhancedDescription?: string;
  cameraMove?: string;
  lighting?: string;
  narrativeAction?: string;
  cinematicHighlights?: string[];
  directorNote?: string;
  errorMessage?: string;
}

export async function enhanceVideoScene(params: {
  sceneDescription?: string; narrativeAction?: string; storyBeat?: string; cameraMove?: string; lighting?: string;
  songTitle?: string; songGenre?: string; songMood?: string; bpm?: number; storyline?: string;
  conceptTitle?: string; characterRole?: string; visualStyle?: string;
}): Promise<EnhanceSceneResult> {
  const res = await apiFetch("/api/video-director/enhance-scene", { method: "POST", body: JSON.stringify(params) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Scene enhancement failed");
  return res.json();
}

export interface GenerateStillResult {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  errorMessage?: string;
}

export async function generateSceneStill(prompt: string, aspectRatio: string = "16:9"): Promise<GenerateStillResult> {
  const res = await apiFetch("/api/video-director/generate-still", { method: "POST", body: JSON.stringify({ prompt, aspectRatio }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Still generation failed");
  return res.json();
}

export interface GenerateVideoPromptResult {
  success: boolean;
  prompt?: string;
  errorMessage?: string;
}

export async function generateVideoDirectorPrompt(params: {
  artistDesc?: string; conceptTitle?: string; directorVision?: string; visualStyle?: string;
  scenes: VideoDirectorScene[]; genre?: string; bpm?: number; mood?: string;
  storylineSynopsis?: string; characterRole?: string;
}): Promise<GenerateVideoPromptResult> {
  const res = await apiFetch("/api/video-director/generate-video-prompt", { method: "POST", body: JSON.stringify(params) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Video prompt generation failed");
  return res.json();
}

export interface StartVideoGenerationResult {
  success: boolean;
  jobId?: string;
  errorMessage?: string;
}

export async function startVideoDirectorRender(
  prompt: string, durationSeconds: number = 5, aspectRatio: string = "16:9", loop: boolean = false
): Promise<StartVideoGenerationResult> {
  const res = await apiFetch("/api/video-director/generate-video", {
    method: "POST", body: JSON.stringify({ prompt, durationSeconds, aspectRatio, loop }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Video render request failed");
  return res.json();
}

export interface VideoGenerationStatusResult {
  status: string;
  videoUrl?: string;
  errorMessage?: string;
}

export async function getVideoDirectorStatus(jobId: string): Promise<VideoGenerationStatusResult> {
  const res = await apiFetch(`/api/video-director/video-status?jobId=${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Could not check render status");
  return res.json();
}
