/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public, unauthenticated band.link-style artist page, served at
 * /a/<slug>. Lists the artist's published releases with inline playback.
 */
import React, { useState, useEffect } from "react";
import { Play, Pause, ExternalLink } from "lucide-react";
import { TrackState } from "../types";
import { audioEngine } from "../utils/audioEngine";
import { blueprintToTracks } from "../utils/blueprintToTracks";
import { getPublicArtistPage, discoverReleases } from "../utils/api";

interface PublicArtistPageProps {
  slug: string;
}

export const PublicArtistPage: React.FC<PublicArtistPageProps> = ({ slug }) => {
  const [page, setPage] = useState<any>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    getPublicArtistPage(slug)
      .then(setPage)
      .catch(() => setError("This artist page doesn't exist."));
    discoverReleases(100).then((all) => {
      setReleases(all.filter((r: any) => r.artistSlug === slug));
    });
  }, [slug]);

  const togglePlay = (release: any) => {
    if (playingId === release.id) {
      audioEngine.stop();
      setPlayingId(null);
      return;
    }
    const tracks: TrackState[] = blueprintToTracks(release.blueprint);
    audioEngine.updateTracks(tracks);
    audioEngine.setBPM(release.blueprint?.tempo || 110);
    audioEngine.start();
    setPlayingId(release.id);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-ink flex items-center justify-center">
        <p className="text-brand-ink-muted">{error}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-ink flex items-center justify-center">
        <p className="text-brand-ink-muted">Loading...</p>
      </div>
    );
  }

  const accent = page.accentColor || "#c9a227";

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink flex flex-col items-center px-6 py-16">
      <div className="max-w-lg w-full flex flex-col items-center text-center gap-4">
        <div
          className="h-24 w-24 rounded-full flex items-center justify-center text-3xl font-display border-2"
          style={{ borderColor: accent, color: accent }}
        >
          {page.displayName?.charAt(0) || "?"}
        </div>
        <h1 className="font-display text-2xl text-brand-ink">{page.displayName}</h1>
        {page.tagline && <p className="text-sm" style={{ color: accent }}>{page.tagline}</p>}
        {page.bio && <p className="text-sm text-brand-ink-muted leading-relaxed">{page.bio}</p>}

        {page.links?.length > 0 && (
          <div className="flex flex-col gap-2 w-full mt-2">
            {page.links.map((link: any, i: number) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 border rounded-full py-2.5 text-sm font-medium transition-all hover:opacity-80"
                style={{ borderColor: accent, color: accent }}
              >
                {link.label} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        )}

        {releases.length > 0 && (
          <div className="w-full mt-8">
            <h2 className="text-[11px] uppercase tracking-widest text-brand-ink-muted mb-3">Releases</h2>
            <div className="flex flex-col gap-2">
              {releases.map((r) => (
                <div key={r.id} className="flex items-center gap-3 bg-brand-surface border border-brand-border rounded-xl p-2.5 text-left">
                  {r.albumArtImage ? (
                    <img src={`data:image/png;base64,${r.albumArtImage}`} className="h-11 w-11 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-11 w-11 rounded-lg bg-brand-surface-2 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-brand-ink truncate">{r.title}</p>
                    <p className="text-[10px] text-brand-ink-muted truncate">{r.genre}</p>
                  </div>
                  <button
                    onClick={() => togglePlay(r)}
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: accent, color: "#0a0a0a" }}
                  >
                    {playingId === r.id ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-brand-ink-muted mt-10">Powered by CrazyJam Music</p>
      </div>
    </div>
  );
};
