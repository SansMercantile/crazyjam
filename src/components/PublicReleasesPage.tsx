/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public /releases page — fully crawlable (no login), built for SEO around the
 * CrazyJam label imprints: CrazyJam Records, CrazyJam Music, CrazyJam Studios,
 * and CrazyJam. Surfaces the label's released albums so searches for any of the
 * imprint names land here. Reads the live public release feed and groups it by
 * imprint so the catalog is always current.
 */
import React, { useEffect, useState } from "react";
import { Play, Pause, Music2, Disc3, ExternalLink } from "lucide-react";
import { discoverReleases } from "../utils/api";
import { PlaybackProvider, usePlayback, releaseToPlaybackItem } from "../context/PlaybackContext";

// The four label imprints. These names are the SEO targets — searches for
// "CrazyJam Records", "CrazyJam Music", "CrazyJam Studios" and "CrazyJam"
// should all surface this page. Each imprint groups its released albums.
const IMPRINTS = [
  {
    id: "crazyjam-records",
    name: "CrazyJam Records",
    tagline: "The flagship label — original artist albums and singles.",
    match: ["crazyjam records", "records"],
  },
  {
    id: "crazyjam-music",
    name: "CrazyJam Music",
    tagline: "The streaming home — every public release, playable in the browser.",
    match: ["crazyjam music", "music"],
  },
  {
    id: "crazyjam-studios",
    name: "CrazyJam Studios",
    tagline: "Studio-crafted releases and production showcases.",
    match: ["crazyjam studios", "studios"],
  },
  {
    id: "crazyjam",
    name: "CrazyJam",
    tagline: "The AI-native music studio — all releases across every imprint.",
    match: ["crazyjam"],
  },
];

const ReleaseGrid: React.FC<{ releases: any[] }> = ({ releases }) => {
  const { current, isPlaying, playNow, togglePlayPause } = usePlayback();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {releases.map((r) => {
        const item = releaseToPlaybackItem(r);
        const isCurrent = current?.id === item.id;
        const isThisPlaying = isCurrent && isPlaying;
        return (
          <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group">
            <div className="relative aspect-square bg-white/5">
              {r.albumArtImage ? (
                <img src={`data:image/png;base64,${r.albumArtImage}`} alt={`${r.title} cover`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30"><Disc3 className="h-8 w-8" /></div>
              )}
              <button
                onClick={() => (isCurrent ? togglePlayPause() : playNow(item, releases.map(releaseToPlaybackItem)))}
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all"
                aria-label={`Play ${r.title}`}
              >
                <span className={`h-11 w-11 rounded-full bg-amber-400 text-black flex items-center justify-center transition-all ${isThisPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  {isThisPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                </span>
              </button>
            </div>
            <div className="p-3">
              <h3 className="text-[13px] font-medium text-white truncate">{r.title}</h3>
              <p className="text-[11px] text-white/50 truncate">{r.artistName}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PublicReleasesPageInner: React.FC = () => {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "CrazyJam Releases | CrazyJam Records · CrazyJam Music · CrazyJam Studios";
    discoverReleases().then(setReleases).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Group releases by imprint keyword match (artist name / genre / title).
  const byImprint = (imp: typeof IMPRINTS[number]) =>
    releases.filter((r) => {
      const hay = `${r.artistName || ""} ${r.genre || ""} ${r.title || ""}`.toLowerCase();
      return imp.match.some((m) => hay.includes(m));
    });

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <header className="border-b border-white/10 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Music2 className="h-6 w-6 text-amber-400" />
          <div>
            <h1 className="font-bold text-lg leading-tight">CrazyJam Releases</h1>
            <p className="text-[11px] text-white/50">CrazyJam Records · CrazyJam Music · CrazyJam Studios</p>
          </div>
        </div>
        <a href="/" className="text-[12px] text-amber-400 hover:underline flex items-center gap-1">
          Open the studio <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-12">
        <section>
          <h2 className="text-2xl font-bold mb-2">Released albums &amp; singles</h2>
          <p className="text-white/60 text-sm max-w-2xl leading-relaxed">
            Every public release across the CrazyJam label family — CrazyJam Records, CrazyJam Music,
            CrazyJam Studios, and CrazyJam — playable right here. New releases appear the moment an
            artist publishes from the studio.
          </p>
        </section>

        {loading ? (
          <p className="text-white/40 text-sm">Loading the catalog…</p>
        ) : (
          <>
            {releases.length === 0 && (
              <p className="text-white/40 text-sm">No public releases yet — the catalog fills as artists publish from CrazyJam Studios.</p>
            )}
            {IMPRINTS.map((imp) => {
              const list = byImprint(imp);
              return (
                <section key={imp.id} id={imp.id} className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-amber-400">{imp.name}</h3>
                    <p className="text-[12px] text-white/50">{imp.tagline}</p>
                  </div>
                  {list.length > 0 ? (
                    <ReleaseGrid releases={list} />
                  ) : (
                    <ReleaseGrid releases={releases.slice(0, 5)} />
                  )}
                </section>
              );
            })}
          </>
        )}
      </main>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-[11px] text-white/40 max-w-6xl mx-auto">
        CrazyJam Records · CrazyJam Music · CrazyJam Studios · CrazyJam — the AI-native music studio.
      </footer>
    </div>
  );
};

export const PublicReleasesPage: React.FC = () => (
  <PlaybackProvider>
    <PublicReleasesPageInner />
  </PlaybackProvider>
);
