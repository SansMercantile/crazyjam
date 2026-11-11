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
      {releases.map((r, idx) => {
        const item = releaseToPlaybackItem(r);
        const isCurrent = current?.id === item.id;
        const isThisPlaying = isCurrent && isPlaying;
        return (
          <div
            key={r.id}
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group transition-all duration-200 hover:border-amber-400/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.45)] hover:-translate-y-1 animate-fadeIn"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="relative aspect-square bg-gradient-to-br from-white/5 to-white/[0.02]">
              {r.albumArtImage ? (
                <img src={`data:image/png;base64,${r.albumArtImage}`} alt={`${r.title} cover`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20"><Disc3 className="h-8 w-8" /></div>
              )}
              <button
                onClick={() => (isCurrent ? togglePlayPause() : playNow(item, releases.map(releaseToPlaybackItem)))}
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/45 transition-all duration-200"
                aria-label={`Play ${r.title}`}
              >
                <span className={`h-11 w-11 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg transition-all duration-200 ${isThisPlaying ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"}`}>
                  {isThisPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                </span>
              </button>
              {isThisPlaying && (
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-400 text-black text-[9px] font-bold uppercase tracking-wide">Playing</span>
              )}
            </div>
            <div className="p-3">
              <h3 className="text-[13px] font-medium text-white truncate group-hover:text-amber-300 transition-colors">{r.title}</h3>
              <p className="text-[11px] text-white/50 truncate">{r.artistName}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Loading skeleton that mirrors the grid layout (feels instant).
const GridSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse">
        <div className="aspect-square bg-white/5" />
        <div className="p-3 flex flex-col gap-2">
          <div className="h-3 bg-white/10 rounded w-3/4" />
          <div className="h-2.5 bg-white/5 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

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
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#0a0a0c]/85 border-b border-white/10">
        <div className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <Music2 className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">CrazyJam Releases</h1>
              <p className="text-[10px] text-white/50">CrazyJam Records · CrazyJam Music · CrazyJam Studios</p>
            </div>
          </div>
          <a href="/" className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-black text-[12px] font-semibold hover:bg-amber-300 transition-colors flex items-center gap-1.5">
            Open the studio <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/[0.06] via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-14 flex flex-col gap-4 relative">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-[0.2em]">The CrazyJam label</span>
          <h2 className="text-4xl sm:text-5xl font-bold leading-tight max-w-2xl">
            Released albums &amp; singles
          </h2>
          <p className="text-white/75 text-sm sm:text-base max-w-2xl leading-relaxed">
            Every public release across the CrazyJam label family — CrazyJam Records, CrazyJam Music,
            CrazyJam Studios, and CrazyJam — playable right here in the browser. New releases appear
            the moment an artist publishes from the studio.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {IMPRINTS.map((imp) => (
              <a key={imp.id} href={`#${imp.id}`} className="px-3 py-1.5 rounded-full border border-white/15 text-[11px] text-white/70 hover:border-amber-400/50 hover:text-amber-300 transition-colors">
                {imp.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-12">
        {loading ? (
          <GridSkeleton />
        ) : (
          <>
            {releases.length === 0 && (
              <div className="text-center py-16 flex flex-col items-center gap-3">
                <Disc3 className="h-10 w-10 text-white/20" />
                <p className="text-white/40 text-sm max-w-sm">No public releases yet — the catalog fills as artists publish from CrazyJam Studios.</p>
              </div>
            )}
            {IMPRINTS.map((imp) => {
              const list = byImprint(imp);
              return (
                <section key={imp.id} id={imp.id} className="flex flex-col gap-4 scroll-mt-20">
                  <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
                    <div>
                      <h3 className="text-xl font-bold text-amber-400">{imp.name}</h3>
                      <p className="text-[12px] text-white/50 mt-0.5">{imp.tagline}</p>
                    </div>
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">{releases.length} releases</span>
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

      <footer className="border-t border-white/10 px-6 py-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/40">CrazyJam Records · CrazyJam Music · CrazyJam Studios · CrazyJam</p>
          <p className="text-[11px] text-white/30">The AI-native music studio.</p>
        </div>
      </footer>
    </div>
  );
};

export const PublicReleasesPage: React.FC = () => (
  <PlaybackProvider>
    <PublicReleasesPageInner />
  </PlaybackProvider>
);
