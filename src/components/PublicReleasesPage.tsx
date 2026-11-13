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
import { Play, Pause, Music2, Disc3, ExternalLink, ArrowUpRight, MapPin } from "lucide-react";
import { discoverReleases } from "../utils/api";
import { PlaybackProvider, usePlayback, releaseToPlaybackItem, releaseCoverUrl } from "../context/PlaybackContext";

// CrazyJam Studios locations — embedded from Google Maps so visitors can find
// the studios. Johannesburg is the CrazyJam Records/Studios HQ; Cape Town is
// the Sans Mercantile head office; Kitakyushu is the Japan presence.
// `rating`/`reviews` come straight from our live Google listing (CrazyJam
// Records™, 118 Pritchard St) and are only rendered where Google has reviews.
const STUDIO_LOCATIONS = [
  {
    id: "johannesburg",
    name: "CrazyJam Studios — Johannesburg",
    role: "Records & Studios HQ",
    address: "118 Pritchard St, Johannesburg, 2000, South Africa",
    mapQuery: "CrazyJam Records 118 Pritchard St Johannesburg",
    rating: 5.0,
    reviews: 3,
  },
  {
    id: "cape-town",
    name: "CrazyJam Studios — Cape Town",
    role: "Head office",
    address: "Cape Town, Western Cape, South Africa",
    mapQuery: "Cape Town, South Africa",
    rating: null,
    reviews: 0,
  },
  {
    id: "kitakyushu",
    name: "CrazyJam Studios — Kitakyushu",
    role: "Japan presence",
    address: "Kitakyushu, Fukuoka, Japan",
    mapQuery: "Kitakyushu, Fukuoka, Japan",
    rating: null,
    reviews: 0,
  },
];

// Official CrazyJam Records releases. These are real, released albums — each
// links out so fans can open it in their preferred music service.
const FEATURED_RELEASES = [
  {
    id: "little-ben",
    title: "Little Ben",
    artist: "CrazyJam Records",
    kind: "Album · 12 tracks",
    url: "https://ditto.fm/little-ben",
    blurb: "A 12-track journey from Cracked Phone to 3 Times.",
    art: "/art/little-ben.jpg",
  },
  {
    id: "cradle-of-jazz-vol-1",
    title: "Cradle of Jazz, Vol. 1",
    artist: "CrazyJam Records",
    kind: "Album",
    url: "https://ditto.fm/cradle-of-jazz-vol-1",
    blurb: "The first volume in the Cradle of Jazz series.",
    art: "/art/cradle-of-jazz-vol-1.jpg",
  },
  {
    id: "letter-s-to-carli",
    title: "Letters to Carli",
    artist: "CrazyJam Records",
    kind: "Album",
    url: "https://ditto.fm/letter-s-to-carli",
    blurb: "An intimate, letter-by-letter release.",
    art: "/art/letters-to-carli.jpg",
  },
];

// Featured official-release card: links OUT to where fans can listen (these
// albums live on streaming services, not in the in-app player).
const FeaturedCard: React.FC<{ release: typeof FEATURED_RELEASES[number]; idx: number }> = ({ release, idx }) => (
  <a
    href={release.url}
    target="_blank"
    rel="noopener noreferrer"
    className="group relative bg-white/5 border border-amber-400/20 rounded-xl overflow-hidden transition-all duration-200 hover:border-amber-400/60 hover:shadow-[0_12px_40px_rgba(217,196,143,0.15)] hover:-translate-y-1 animate-fadeIn"
    style={{ animationDelay: `${idx * 60}ms` }}
  >
    <div className="relative aspect-square bg-gradient-to-br from-amber-400/15 via-white/5 to-transparent overflow-hidden">
      <img
        src={release.art}
        alt={`${release.title} album cover`}
        loading="lazy"
        width={1000}
        height={1000}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-400 text-black text-[9px] font-bold uppercase tracking-wider">Official</span>
      <span className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white/70 group-hover:bg-amber-400 group-hover:text-black group-hover:border-amber-400 transition-all">
        <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </div>
    <div className="p-4">
      <h3 className="text-[14px] font-semibold text-white group-hover:text-amber-300 transition-colors truncate">{release.title}</h3>
      <p className="text-[11px] text-amber-400/80 mt-0.5">{release.kind}</p>
      <p className="text-[11px] text-white/60 mt-1.5 leading-relaxed">{release.blurb}</p>
      <span className="inline-flex items-center gap-1 mt-3 text-[11px] font-medium text-amber-400 group-hover:underline">
        Listen on your service <ArrowUpRight className="h-3 w-3" />
      </span>
    </div>
  </a>
);

// The CrazyJam Artists roster — the names behind the label's released albums.
const ARTISTS = ["mF", "Ben", "Jay5", "JinO", "Cherry Stone", "Children of the Forest"];

// The label sections. These names are the SEO targets — searches for
// "CrazyJam Artists", "CrazyJam Music", "CrazyJam Studios" and "CrazyJam"
// should all surface this page.
const SECTIONS = [
  {
    id: "crazyjam-artists",
    name: "CrazyJam Artists",
    tagline: "The roster — original artist albums and singles.",
    match: ["crazyjam artists", "crazyjam records", "artists", "records"],
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
    tagline: "The AI-native music studio — every song our creators publish on the platform.",
    match: [], // special: shows ALL published songs
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
              {releaseCoverUrl(r) ? (
                <img src={releaseCoverUrl(r)} alt={`${r.title} cover`} className="w-full h-full object-cover" />
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
              <p className="text-[11px] text-white/60 truncate">{r.artistName}</p>
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
    document.title = "CrazyJam Releases | CrazyJam Artists · CrazyJam Music · CrazyJam Studios";
    discoverReleases().then(setReleases).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Group releases by section keyword match (artist name / genre / title).
  const bySection = (sec: typeof SECTIONS[number]) =>
    releases.filter((r) => {
      const hay = `${r.artistName || ""} ${r.genre || ""} ${r.title || ""}`.toLowerCase();
      return sec.match.some((m) => hay.includes(m));
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
              <p className="text-[10px] text-white/60">CrazyJam Records · CrazyJam Music · CrazyJam Studios</p>
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
            {SECTIONS.map((sec) => (
              <a key={sec.id} href={`#${sec.id}`} className="px-3 py-1.5 rounded-full border border-white/15 text-[11px] text-white/70 hover:border-amber-400/50 hover:text-amber-300 transition-colors">
                {sec.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-12">
        {/* Official CrazyJam Records releases */}
        <section id="official" className="flex flex-col gap-5 scroll-mt-20">
          <div className="flex items-baseline justify-between border-b border-amber-400/20 pb-3">
            <div>
              <h3 className="text-2xl font-bold text-amber-400">CrazyJam Records — Official Releases</h3>
              <p className="text-[12px] text-white/60 mt-1">Our released albums, out now on every major music service.</p>
            </div>
            <span className="text-[10px] text-white/60 uppercase tracking-wider">{FEATURED_RELEASES.length} albums</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURED_RELEASES.map((r, idx) => (
              <FeaturedCard key={r.id} release={r} idx={idx} />
            ))}
          </div>
        </section>

        {/* CrazyJam Studios locations */}
        <section id="crazyjam-studios-locations" className="flex flex-col gap-5 scroll-mt-20">
          <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-xl font-bold text-amber-400">CrazyJam Studios — Locations</h3>
              <p className="text-[12px] text-white/60 mt-0.5">Studio-crafted releases and production showcases — find the studios.</p>
            </div>
            <span className="text-[10px] text-white/60 uppercase tracking-wider">{STUDIO_LOCATIONS.length} locations</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STUDIO_LOCATIONS.map((loc, idx) => (
              <div
                key={loc.id}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:border-amber-400/50 hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] animate-fadeIn"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="relative h-44 bg-white/5">
                  <iframe
                    title={loc.name}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(loc.mapQuery)}&output=embed`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="p-4 flex flex-col gap-1.5">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[13px] font-semibold text-white">{loc.name}</h4>
                      <p className="text-[11px] text-amber-400/80">{loc.role}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/60 pl-6">{loc.address}</p>
                  {loc.rating != null ? (
                    <p className="text-[11px] pl-6">
                      <span className="text-amber-400 font-bold">★ {loc.rating.toFixed(1)}</span>{" "}
                      <span className="text-white/50">Google · {loc.reviews} reviews</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/40 pl-6">New location — no Google reviews yet</p>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.mapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 pl-6 text-[11px] font-medium text-amber-400 hover:underline"
                  >
                    Open in Google Maps <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CrazyJam Artists roster */}
        <section id="crazyjam-artists" className="flex flex-col gap-5 scroll-mt-20">
          <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-xl font-bold text-amber-400">CrazyJam Artists</h3>
              <p className="text-[12px] text-white/60 mt-0.5">The roster — original artist albums and singles.</p>
            </div>
            <span className="text-[10px] text-white/60 uppercase tracking-wider">{ARTISTS.length} artists</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ARTISTS.map((name, idx) => (
              <div
                key={name}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-center transition-all duration-200 hover:border-amber-400/50 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] animate-fadeIn"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="h-11 w-11 mx-auto rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mb-2.5">
                  <Music2 className="h-5 w-5 text-amber-400" />
                </div>
                <p className="text-[13px] font-medium text-white truncate">{name}</p>
                <p className="text-[10px] text-white/60 mt-0.5">CrazyJam Artists</p>
              </div>
            ))}
          </div>
        </section>

        {loading ? (
          <GridSkeleton />
        ) : (
          <>
            {releases.length === 0 && (
              <div className="text-center py-16 flex flex-col items-center gap-3">
                <Disc3 className="h-10 w-10 text-white/20" />
                <p className="text-white/60 text-sm max-w-sm">No public releases yet — the catalog fills as artists publish from CrazyJam Studios.</p>
              </div>
            )}
            {SECTIONS.filter((s) => s.id !== "crazyjam-artists").map((sec) => {
              // "CrazyJam" shows every song our creators publish on the platform.
              const list = sec.id === "crazyjam" ? releases : bySection(sec);
              return (
                <section key={sec.id} id={sec.id} className="flex flex-col gap-4 scroll-mt-20">
                  <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
                    <div>
                      <h3 className="text-xl font-bold text-amber-400">{sec.name}</h3>
                      <p className="text-[12px] text-white/60 mt-0.5">{sec.tagline}</p>
                    </div>
                    <span className="text-[10px] text-white/60 uppercase tracking-wider">{list.length} releases</span>
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
          <p className="text-[11px] text-white/60">CrazyJam Records · CrazyJam Music · CrazyJam Studios · CrazyJam</p>
          <p className="text-[11px] text-white/60">The AI-native music studio.</p>
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
