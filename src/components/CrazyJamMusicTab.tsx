/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CrazyJam Music - the publishing hub. Discover tab browses public releases
 * from everyone; My Studio tab is where you publish your saved tracks
 * (attaching cover art / a video / marketing copy), manage your artist
 * page, and build music videos.
 */
import React, { useState, useEffect } from "react";
import { Compass, Rocket, Play, Pause, Heart, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { TrackState } from "../types";
import { audioEngine } from "../utils/audioEngine";
import { blueprintToTracks } from "../utils/blueprintToTracks";
import { ArtistPageEditor } from "./ArtistPageEditor";
import { MusicVideoCreator } from "./MusicVideoCreator";
import {
  discoverReleases,
  listMyReleases,
  listTracks,
  listAlbumArt,
  listVideos,
  publishRelease,
  unpublishRelease,
} from "../utils/api";

// --- Shared release card (used in both Discover and My Studio) ---
const ReleaseCard: React.FC<{ release: any; onUnpublish?: (id: string) => void }> = ({ release, onUnpublish }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      return;
    }
    const tracks: TrackState[] = blueprintToTracks(release.blueprint);
    audioEngine.updateTracks(tracks);
    audioEngine.setBPM(release.blueprint?.tempo || 110);
    audioEngine.start();
    setIsPlaying(true);
  };

  useEffect(() => {
    return () => {
      if (isPlaying) audioEngine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <span className={`h-12 w-12 rounded-full bg-brand-gold text-brand-bg flex items-center justify-center transition-all ${isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
          </span>
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
        {onUnpublish && (
          <button onClick={() => onUnpublish(release.id)} className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-red-400 hover:text-red-300 border border-red-400/20 hover:bg-red-400/10 rounded-lg py-1.5 transition-all">
            <Trash2 className="h-3 w-3" /> Unpublish
          </button>
        )}
      </div>
    </div>
  );
};

// --- Publish dialog ---
const PublishPanel: React.FC<{ addLog?: (l: any) => void; onPublished: () => void }> = ({ addLog, onPublished }) => {
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

      <button onClick={handlePublish} disabled={isPublishing} className="w-full h-11 flex items-center justify-center gap-2 bg-brand-gold hover:brightness-110 rounded-xl text-brand-bg font-semibold text-sm transition-all disabled:opacity-50">
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

  return (
    <div className="flex flex-col gap-6 mt-6 animate-fadeIn">
      <div className="flex items-center gap-1 bg-brand-surface-2 border border-brand-border rounded-lg p-1 w-fit">
        <button onClick={() => setSection("discover")} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${section === "discover" ? "bg-brand-gold text-brand-bg" : "text-brand-ink-muted hover:text-brand-ink"}`}>
          <Compass className="h-3.5 w-3.5" /> Discover
        </button>
        <button onClick={() => setSection("studio")} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${section === "studio" ? "bg-brand-gold text-brand-bg" : "text-brand-ink-muted hover:text-brand-ink"}`}>
          <Rocket className="h-3.5 w-3.5" /> My Studio
        </button>
      </div>

      {section === "discover" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {isLoading ? (
            <p className="col-span-full text-center text-brand-ink-muted text-xs py-12">Loading releases...</p>
          ) : discover.length === 0 ? (
            <p className="col-span-full text-center text-brand-ink-muted text-xs py-12">No releases published yet - be the first from My Studio.</p>
          ) : (
            discover.map((r) => <ReleaseCard key={r.id} release={r} />)
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <PublishPanel addLog={addLog} onPublished={() => { loadMine(); loadDiscover(); }} />

          {mine.length > 0 && (
            <div>
              <h3 className="text-[13px] font-medium text-brand-ink mb-3">Your published releases</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {mine.map((r) => <ReleaseCard key={r.id} release={r} onUnpublish={handleUnpublish} />)}
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
