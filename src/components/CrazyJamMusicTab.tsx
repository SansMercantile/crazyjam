/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CrazyJam Music - the publishing hub. Discover tab browses public releases
 * from everyone; My Studio tab is where you publish your saved tracks
 * (attaching cover art / a video / marketing copy), manage your artist
 * page, and build music videos.
 */
import React, { useState, useEffect, useRef } from "react";
import { Compass, Rocket, Play, Pause, Heart, ExternalLink, Trash2, Loader2, Plus, Wand2, Mic2, Upload as UploadIcon } from "lucide-react";
import { TrackState } from "../types";
import { audioEngine } from "../utils/audioEngine";
import { blueprintToTracks } from "../utils/blueprintToTracks";
import { ArtistPageEditor } from "./ArtistPageEditor";
import { MusicVideoCreator } from "./MusicVideoCreator";
import { usePlayback, releaseToPlaybackItem, trackToPlaybackItem } from "../context/PlaybackContext";
import {
  discoverReleases,
  listMyReleases,
  listTracks,
  listAlbumArt,
  listVideos,
  publishRelease,
  unpublishRelease,
  generateBlueprint,
  saveTrack,
  blobToBase64,
} from "../utils/api";

// --- Shared release card (used in both Discover and My Studio) ---
const ReleaseCard: React.FC<{
  release: any;
  queueContext: any[];
  onUnpublish?: (id: string) => void;
  onRemix?: (release: any, mode: "remix" | "cover") => void;
  remixingId?: string | null;
}> = ({ release, queueContext, onUnpublish, onRemix, remixingId }) => {
  const { current, isPlaying, playNow, togglePlayPause, addToQueue } = usePlayback();
  const item = releaseToPlaybackItem(release);
  const isCurrent = current?.id === item.id;
  const isThisPlaying = isCurrent && isPlaying;
  const isRemixingThis = remixingId === release.id;

  const togglePlay = () => {
    if (isCurrent) {
      togglePlayPause();
    } else {
      playNow(item, queueContext.map(releaseToPlaybackItem));
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden flex flex-col group">
      <div className="relative aspect-square bg-brand-surface-2">
        {release.albumArtImage ? (
          <img src={`data:image/png;base64,${release.albumArtImage}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-ink-muted text-xs">No cover art</div>
        )}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all"
        >
          <span className={`h-12 w-12 rounded-full bg-brand-gold flex items-center justify-center transition-all ${isThisPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            {isThisPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
          </span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); addToQueue(item); }}
          title="Add to queue"
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        >
          <Plus className="h-3.5 w-3.5 text-white" />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-1">
        <h4 className="text-[13px] font-medium text-brand-ink truncate">{release.title}</h4>
        <p className="text-[11px] text-brand-ink-muted truncate">
          {release.artistSlug ? (
            <a href={`/a/${release.artistSlug}`} target="_blank" rel="noreferrer" className="hover:text-brand-gold">{release.artistName}</a>
          ) : release.artistName}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-brand-ink-muted">{release.genre || "Original"}</span>
          <span className="text-[10px] text-brand-ink-muted flex items-center gap-1"><Heart className="h-2.5 w-2.5" /> {release.plays}</span>
        </div>
        {onRemix && (
          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={() => onRemix(release, "remix")}
              disabled={isRemixingThis}
              className="flex-1 flex items-center justify-center gap-1 text-[10px] text-brand-ink-muted hover:text-brand-gold border border-brand-border hover:border-brand-gold/40 rounded-lg py-1.5 transition-all disabled:opacity-50"
            >
              {isRemixingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Remix
            </button>
            <button
              onClick={() => onRemix(release, "cover")}
              disabled={isRemixingThis}
              className="flex-1 flex items-center justify-center gap-1 text-[10px] text-brand-ink-muted hover:text-brand-gold border border-brand-border hover:border-brand-gold/40 rounded-lg py-1.5 transition-all disabled:opacity-50"
            >
              {isRemixingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic2 className="h-3 w-3" />} Cover
            </button>
          </div>
        )}
        {onUnpublish && (
          <button onClick={() => onUnpublish(release.id)} className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] text-red-400 hover:text-red-300 border border-red-400/20 hover:bg-red-400/10 rounded-lg py-1.5 transition-all">
            <Trash2 className="h-3 w-3" /> Unpublish
          </button>
        )}
      </div>
    </div>
  );
};

// --- Upload a song/beat as a new track ---
const UploadTrackPanel: React.FC<{ addLog?: (l: any) => void; onUploaded: () => void }> = ({ addLog, onUploaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState("");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      setStatus("Please choose an audio file (mp3, wav, m4a, etc).");
      return;
    }
    setIsUploading(true);
    setStatus("");
    try {
      const base64 = await blobToBase64(file);
      const title = file.name.replace(/\.[^/.]+$/, "");
      await saveTrack(title, null, undefined, undefined, {
        renderedAudioBase64: base64,
        audioMimeType: file.type || "audio/mpeg",
        source: "upload",
      });
      setStatus(`Uploaded "${title}" to your library.`);
      addLog?.({ agentName: "Upload", role: "Ingest", avatar: "📤", message: `Uploaded "${title}".`, phase: "System", status: "completed" });
      onUploaded();
    } catch (e: any) {
      setStatus(e.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-3">
      <div className="flex items-center gap-2.5 text-brand-gold">
        <UploadIcon className="h-5 w-5" />
        <div>
          <h2 className="font-display text-lg text-brand-ink">Upload a song or beat</h2>
          <p className="text-[11px] text-brand-ink-muted">Bring your own audio in - it'll show up in your library, ready to publish or remix.</p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full h-11 flex items-center justify-center gap-2 border border-dashed border-brand-border hover:border-brand-gold/50 rounded-xl font-medium text-sm text-brand-ink-muted hover:text-brand-ink transition-all disabled:opacity-50"
      >
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
        {isUploading ? "Uploading..." : "Choose an audio file"}
      </button>
      {status && <p className="text-[11px] text-brand-gold text-center">{status}</p>}
    </div>
  );
};

// --- Publish dialog ---
export const PublishPanel: React.FC<{ addLog?: (l: any) => void; onPublished: () => void }> = ({ addLog, onPublished }) => {
  const [myTracks, setMyTracks] = useState<any[]>([]);
  const [myArt, setMyArt] = useState<any[]>([]);
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [selectedArtId, setSelectedArtId] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [description, setDescription] = useState("");
  const [marketingBlurb, setMarketingBlurb] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    listTracks().then(setMyTracks).catch(() => {});
    listAlbumArt().then(setMyArt).catch(() => {});
    listVideos().then(setMyVideos).catch(() => {});
  }, []);

  const handlePublish = async () => {
    if (!selectedTrackId) {
      setStatus("Pick a track to publish first.");
      return;
    }
    setIsPublishing(true);
    setStatus("");
    try {
      await publishRelease(selectedTrackId, {
        albumArtId: selectedArtId || undefined,
        videoId: selectedVideoId || undefined,
        description,
        marketingBlurb,
      });
      setStatus("Published to CrazyJam Music.");
      addLog?.({ agentName: "Release Manager", role: "Publishing", avatar: "🚀", message: "Track published to CrazyJam Music.", phase: "System", status: "completed" });
      onPublished();
    } catch (e: any) {
      setStatus(e.message || "Publish failed.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2.5 text-brand-gold border-b border-brand-border pb-4">
        <Rocket className="h-5 w-5" />
        <div>
          <h2 className="font-display text-lg text-brand-ink">Publish a release</h2>
          <p className="text-[11px] text-brand-ink-muted">Pick a saved track, attach cover art and/or a video, and go live on CrazyJam Music.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-brand-ink-muted">Track</label>
          <select value={selectedTrackId} onChange={(e) => setSelectedTrackId(e.target.value)} className="bg-brand-surface-2 border border-brand-border text-brand-ink text-sm rounded-lg px-3 py-2 outline-none">
            <option value="">Select a saved track...</option>
            {myTracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-brand-ink-muted">Cover art (optional)</label>
          <select value={selectedArtId} onChange={(e) => setSelectedArtId(e.target.value)} className="bg-brand-surface-2 border border-brand-border text-brand-ink text-sm rounded-lg px-3 py-2 outline-none">
            <option value="">None</option>
            {myArt.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-brand-ink-muted">Music video (optional)</label>
          <select value={selectedVideoId} onChange={(e) => setSelectedVideoId(e.target.value)} className="bg-brand-surface-2 border border-brand-border text-brand-ink text-sm rounded-lg px-3 py-2 outline-none">
            <option value="">None</option>
            {myVideos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-brand-ink-muted">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="bg-brand-surface-2 border border-brand-border text-brand-ink text-sm rounded-lg px-3 py-2 outline-none resize-none" placeholder="What's this track about?" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-brand-ink-muted">Marketing blurb</label>
        <textarea value={marketingBlurb} onChange={(e) => setMarketingBlurb(e.target.value)} rows={2} className="bg-brand-surface-2 border border-brand-border text-brand-ink text-sm rounded-lg px-3 py-2 outline-none resize-none" placeholder="A punchy line to hook listeners" />
      </div>

      <button onClick={handlePublish} disabled={isPublishing} className="w-full h-11 flex items-center justify-center gap-2 metal-gold rounded-xl font-semibold text-sm transition-all disabled:opacity-50">
        {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
        {isPublishing ? "Publishing..." : "Publish to CrazyJam Music"}
      </button>
      {status && <p className="text-[11px] text-brand-gold text-center">{status}</p>}
    </div>
  );
};

// --- Main tab ---
interface CrazyJamMusicTabProps {
  tracks: TrackState[];
  tempo: number;
  trackTitle: string;
  lyrics?: string;
  addLog?: (l: any) => void;
}

export const CrazyJamMusicTab: React.FC<CrazyJamMusicTabProps> = ({ tracks, tempo, trackTitle, lyrics, addLog }) => {
  const [section, setSection] = useState<"discover" | "studio">("discover");
  const [discover, setDiscover] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myTracksRefreshKey, setMyTracksRefreshKey] = useState(0);
  const [remixingId, setRemixingId] = useState<string | null>(null);
  const [remixStatus, setRemixStatus] = useState("");
  const { playNow } = usePlayback();

  const loadDiscover = () => {
    discoverReleases().then(setDiscover).catch(() => {});
  };
  const loadMine = () => {
    listMyReleases().then(setMine).catch(() => {});
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([discoverReleases(), listMyReleases()])
      .then(([d, m]) => { setDiscover(d); setMine(m); })
      .finally(() => setIsLoading(false));
  }, []);

  const handleUnpublish = async (id: string) => {
    await unpublishRelease(id);
    loadMine();
    loadDiscover();
  };

  const handleRemix = async (release: any, mode: "remix" | "cover") => {
    setRemixingId(release.id);
    setRemixStatus("");
    try {
      const styleTag =
        mode === "remix"
          ? `${release.genre || "electronic"}, high-energy remix reinterpretation, denser production, new drop`
          : `${release.genre || "acoustic"}, stripped-down acoustic cover, intimate reinterpretation, same melodic idea`;
      const blueprint = await generateBlueprint(
        `A ${mode} of "${release.title}"`,
        [],
        {
          mode: "custom",
          style: styleTag,
          lyrics: release.lyrics,
          userTitle: `${release.title} (${mode === "remix" ? "Remix" : "Cover"})`,
        }
      );
      const renderedTracks: TrackState[] = blueprintToTracks(blueprint);
      const mixBlob = await audioEngine.exportMixWav(renderedTracks, blueprint.tempo || tempo, 4);
      const renderedAudioBase64 = await blobToBase64(mixBlob);
      const saved = await saveTrack(
        blueprint.title || `${release.title} (${mode === "remix" ? "Remix" : "Cover"})`,
        blueprint,
        blueprint.lyrics,
        undefined,
        { renderedAudioBase64, audioMimeType: "audio/wav", source: mode, remixOfTrackId: release.trackId }
      );
      setRemixStatus(`"${saved.title}" saved to your library.`);
      addLog?.({
        agentName: mode === "remix" ? "Remix Engine" : "Cover Engine",
        role: "AI Reinterpretation",
        avatar: mode === "remix" ? "🌀" : "🎤",
        message: `Generated a ${mode} of "${release.title}".`,
        phase: "System",
        status: "completed",
      });
      setMyTracksRefreshKey((k) => k + 1);
      // Queue it up immediately so the result is easy to hear.
      playNow(trackToPlaybackItem(saved));
    } catch (e: any) {
      setRemixStatus(e.message || `Could not generate a ${mode}.`);
    } finally {
      setRemixingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 mt-6 animate-fadeIn">
      <div className="flex items-center gap-1 bg-brand-surface-2 border border-brand-border rounded-lg p-1 w-fit">
        <button onClick={() => setSection("discover")} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${section === "discover" ? "bg-brand-gold" : "text-brand-ink-muted hover:text-brand-ink"}`}>
          <Compass className="h-3.5 w-3.5" /> Discover
        </button>
        <button onClick={() => setSection("studio")} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${section === "studio" ? "bg-brand-gold" : "text-brand-ink-muted hover:text-brand-ink"}`}>
          <Rocket className="h-3.5 w-3.5" /> My Studio
        </button>
      </div>

      {remixStatus && <p className="text-[11px] text-brand-gold">{remixStatus}</p>}

      {section === "discover" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {isLoading ? (
            <p className="col-span-full text-center text-brand-ink-muted text-xs py-12">Loading releases...</p>
          ) : discover.length === 0 ? (
            <p className="col-span-full text-center text-brand-ink-muted text-xs py-12">No releases published yet - be the first from My Studio.</p>
          ) : (
            discover.map((r) => (
              <ReleaseCard key={r.id} release={r} queueContext={discover} onRemix={handleRemix} remixingId={remixingId} />
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <PublishPanel key={myTracksRefreshKey} addLog={addLog} onPublished={() => { loadMine(); loadDiscover(); }} />

          <UploadTrackPanel addLog={addLog} onUploaded={() => setMyTracksRefreshKey((k) => k + 1)} />

          {mine.length > 0 && (
            <div>
              <h3 className="text-[13px] font-medium text-brand-ink mb-3">Your published releases</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {mine.map((r) => (
                  <ReleaseCard key={r.id} release={r} queueContext={mine} onUnpublish={handleUnpublish} onRemix={handleRemix} remixingId={remixingId} />
                ))}
              </div>
            </div>
          )}

          <MusicVideoCreator tracks={tracks} tempo={tempo} trackTitle={trackTitle} lyrics={lyrics} addLog={addLog} />

          <ArtistPageEditor />
        </div>
      )}
    </div>
  );
};
