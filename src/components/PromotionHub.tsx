import React, { useEffect, useMemo, useState } from "react";
import {
  getPromoCatalog,
  listChartBodies,
  createPlaylistCampaign,
  listPlaylistCampaigns,
  launchPlaylistCampaign,
  updateCampaignCurator,
  updateCampaignStats,
  registerForCharts,
  listChartRegistrations,
  confirmChartRegistration,
  getBeatportLabel,
  saveBeatportLabel,
  setupBeatportRelease,
  listBeatportReleases,
  submitBeatportDjChart,
  listBeatportDjCharts,
  type PromoRelease,
  type ChartBody,
} from "../utils/api";
import {
  ListMusic,
  Globe2,
  Disc3,
  Rocket,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  ExternalLink,
  BarChart3,
  Send,
} from "lucide-react";

type HubSection = "playlists" | "charts" | "beatport";

const TIERS = [
  { id: "starter", name: "Starter", price: 119, streams: "2-5K", curators: 10 },
  { id: "discovery", name: "Discovery", price: 249, streams: "8-15K", curators: 25 },
  { id: "growth", name: "Growth", price: 425, streams: "20-40K", curators: 50, popular: true },
  { id: "momentum", name: "Momentum", price: 599, streams: "40-75K", curators: 80 },
  { id: "anthem", name: "Anthem", price: 999, streams: "75-150K", curators: 130 },
  { id: "headline", name: "Headline", price: 1575, streams: "150K+", curators: 200 },
];

interface PromotionHubProps {
  addLog: (log: { agentName: string; role: string; avatar: string; message: string; phase: string; status: string }) => void;
}

export const PromotionHub: React.FC<PromotionHubProps> = ({ addLog }) => {
  const [section, setSection] = useState<HubSection>("playlists");
  const [catalog, setCatalog] = useState<PromoRelease[]>([]);
  const [chartBodies, setChartBodies] = useState<ChartBody[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [beatportLabel, setBeatportLabel] = useState<any>(null);
  const [beatportReleases, setBeatportReleases] = useState<any[]>([]);
  const [djCharts, setDjCharts] = useState<any[]>([]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, bodies, camps, regs, label, bpReleases, charts] = await Promise.all([
        getPromoCatalog(),
        listChartBodies(),
        listPlaylistCampaigns(),
        listChartRegistrations(),
        getBeatportLabel(),
        listBeatportReleases(),
        listBeatportDjCharts(),
      ]);
      setCatalog(cat);
      setChartBodies(bodies);
      setCampaigns(camps);
      setRegistrations(regs);
      setBeatportLabel(label);
      setBeatportReleases(bpReleases);
      setDjCharts(charts);
    } catch (e: any) {
      setError(e.message || "Failed to load promotion hub");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const sections = [
    { id: "playlists" as HubSection, label: "Playlist Promotion", icon: ListMusic, desc: "Genre-matched curator pitching" },
    { id: "charts" as HubSection, label: "Charts Registration", icon: Globe2, desc: "Worldwide chart eligibility" },
    { id: "beatport" as HubSection, label: "Beatport Label", icon: Disc3, desc: "Label profile + DJ charts" },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-brand-ink">Promotion Hub</h2>
          <p className="text-[12px] text-brand-ink-muted mt-1">
            Playlist pitching, worldwide chart registration, and Beatport label tools — modeled on the 4Labs workflow.
          </p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-surface-2 text-brand-ink-muted hover:text-brand-gold text-[12px] transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[12px]">{error}</div>
      )}

      {/* Section tabs */}
      <div className="grid grid-cols-3 gap-3">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                active
                  ? "border-brand-gold bg-brand-gold/10"
                  : "border-brand-border bg-brand-surface hover:border-brand-gold/40"
              }`}
            >
              <Icon className={`h-5 w-5 mb-2 ${active ? "text-brand-gold" : "text-brand-ink-muted"}`} />
              <div className={`text-[13px] font-semibold ${active ? "text-brand-gold" : "text-brand-ink"}`}>{s.label}</div>
              <div className="text-[11px] text-brand-ink-muted mt-0.5">{s.desc}</div>
            </button>
          );
        })}
      </div>

      {loading && catalog.length === 0 ? (
        <div className="p-10 text-center text-brand-ink-muted text-[13px]">Loading promotion hub…</div>
      ) : (
        <>
          {section === "playlists" && (
            <PlaylistSection
              catalog={catalog}
              campaigns={campaigns}
              onRefresh={loadAll}
              addLog={addLog}
            />
          )}
          {section === "charts" && (
            <ChartsSection
              catalog={catalog}
              chartBodies={chartBodies}
              registrations={registrations}
              onRefresh={loadAll}
              addLog={addLog}
            />
          )}
          {section === "beatport" && (
            <BeatportSection
              catalog={catalog}
              label={beatportLabel}
              releases={beatportReleases}
              djCharts={djCharts}
              onRefresh={loadAll}
              addLog={addLog}
            />
          )}
        </>
      )}
    </div>
  );
};

/* ============================= 1. PLAYLISTS ============================= */

const PlaylistSection: React.FC<{
  catalog: PromoRelease[];
  campaigns: any[];
  onRefresh: () => void;
  addLog: PromotionHubProps["addLog"];
}> = ({ catalog, campaigns, onRefresh, addLog }) => {
  const [selectedRelease, setSelectedRelease] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<string>("growth");
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const release = useMemo(() => catalog.find((r) => r.id === selectedRelease), [catalog, selectedRelease]);

  const handleCreate = async () => {
    if (!selectedRelease) return;
    setBusy(true);
    try {
      await createPlaylistCampaign({
        releaseId: selectedRelease,
        tier: selectedTier,
        trackTitle: selectedTrack || undefined,
        notes: notes || undefined,
      });
      addLog({
        agentName: "Promotion Hub",
        role: "Playlist Campaign",
        avatar: "🎧",
        message: `Playlist campaign created for ${release?.title} (${TIERS.find((t) => t.id === selectedTier)?.name} tier). Genre-matched curators queued for review.`,
        phase: "Promotion",
        status: "completed",
      });
      setNotes("");
      setSelectedTrack("");
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLaunch = async (id: string) => {
    try {
      await launchPlaylistCampaign(id);
      addLog({
        agentName: "Promotion Hub",
        role: "Playlist Campaign",
        avatar: "🚀",
        message: "Campaign launched. Curator outreach is now live — track responses in the campaign detail.",
        phase: "Promotion",
        status: "completed",
      });
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCurator = async (campaignId: string, curatorName: string, status: string) => {
    try {
      await updateCampaignCurator(campaignId, { curatorName, status });
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* New campaign */}
      <div className="lg:col-span-1 p-4 rounded-xl border border-brand-border bg-brand-surface space-y-4 h-fit">
        <h3 className="text-[13px] font-semibold text-brand-ink flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-gold" /> New Campaign
        </h3>

        <div>
          <label className="text-[11px] text-brand-ink-muted uppercase tracking-wide">Release</label>
          <select
            value={selectedRelease}
            onChange={(e) => { setSelectedRelease(e.target.value); setSelectedTrack(""); }}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink"
          >
            <option value="">Select release…</option>
            {catalog.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} — {r.primaryGenre}
              </option>
            ))}
          </select>
        </div>

        {release && (
          <div>
            <label className="text-[11px] text-brand-ink-muted uppercase tracking-wide">Focus Track</label>
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink"
            >
              <option value="">Album focus (default)</option>
              {release.tracks.map((t) => (
                <option key={t.n} value={t.title}>
                  {t.n}. {t.title}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-brand-ink-muted mt-1">
              Genre: <span className="text-brand-gold">{release.primaryGenre}</span>
              {release.subGenres.length > 0 && ` · ${release.subGenres.join(", ")}`}
            </p>
          </div>
        )}

        <div>
          <label className="text-[11px] text-brand-ink-muted uppercase tracking-wide">Package</label>
          <div className="mt-1 space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                className={`w-full p-2.5 rounded-lg border text-left transition ${
                  selectedTier === t.id ? "border-brand-gold bg-brand-gold/10" : "border-brand-border bg-brand-surface-2 hover:border-brand-gold/40"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-semibold text-brand-ink">
                    {t.name} {t.popular && <span className="text-[9px] text-brand-gold ml-1">★ POPULAR</span>}
                  </span>
                  <span className="text-[12px] font-bold text-brand-gold">${t.price}</span>
                </div>
                <div className="text-[10px] text-brand-ink-muted mt-0.5">
                  {t.streams} streams · {t.curators}+ curators pitched
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-brand-ink-muted uppercase tracking-wide">Notes for curators (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink resize-none"
            placeholder="Story behind the track, similar artists, mood…"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={!selectedRelease || busy}
          className="w-full py-2.5 rounded-lg bg-brand-gold text-brand-bg text-[13px] font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          <Rocket className="h-4 w-4" />
          {busy ? "Creating…" : "Create Campaign"}
        </button>
        <p className="text-[10px] text-brand-ink-muted text-center">Reviewed before launch · No bots, real curators</p>
      </div>

      {/* Campaign list */}
      <div className="lg:col-span-2 space-y-3">
        {campaigns.length === 0 && (
          <div className="p-10 rounded-xl border border-brand-border bg-brand-surface text-center text-brand-ink-muted text-[13px]">
            No campaigns yet. Create your first playlist campaign to start curator outreach.
          </div>
        )}
        {campaigns.map((c) => (
          <div key={c.id} className="rounded-xl border border-brand-border bg-brand-surface overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-brand-ink">{c.releaseTitle}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold font-medium uppercase">{c.tier}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="text-[11px] text-brand-ink-muted mt-1">
                  {c.trackTitle} · {c.genre} · Pitched: {c.stats.pitched} · Accepted: {c.stats.accepted} · Streams: {c.stats.streams}
                </div>
              </div>
              {expanded === c.id ? <ChevronUp className="h-4 w-4 text-brand-ink-muted" /> : <ChevronDown className="h-4 w-4 text-brand-ink-muted" />}
            </button>

            {expanded === c.id && (
              <div className="border-t border-brand-border p-4 space-y-3">
                {c.status === "pending_review" && (
                  <button
                    onClick={() => handleLaunch(c.id)}
                    className="px-4 py-2 rounded-lg bg-brand-gold text-brand-bg text-[12px] font-semibold hover:brightness-110 transition flex items-center gap-2"
                  >
                    <Send className="h-3.5 w-3.5" /> Approve Review & Launch Outreach
                  </button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {c.curators.map((cur: any) => (
                    <div key={cur.name} className="p-3 rounded-lg bg-brand-surface-2 border border-brand-border">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-brand-ink">{cur.name}</span>
                        <CuratorBadge status={cur.status} />
                      </div>
                      <div className="text-[10px] text-brand-ink-muted mt-1">
                        {cur.platform}
                        {cur.followers > 0 && ` · ${cur.followers.toLocaleString()} followers`}
                        {cur.channel && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-brand-gold/15 text-brand-gold text-[9px] uppercase">
                            {cur.channel === "editorial" ? "Editorial" : cur.channel === "submission_platform" ? "Platform" : "Curator"}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-brand-ink-muted mt-0.5">{cur.fit}</div>
                      {cur.contact && (
                        <a
                          href={cur.contact}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-brand-gold hover:underline"
                        >
                          Open submission <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {c.status === "live" && cur.status === "pitched" && (
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => handleCurator(c.id, cur.name, "accepted")}
                            className="flex-1 py-1 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          >
                            Accepted
                          </button>
                          <button
                            onClick={() => handleCurator(c.id, cur.name, "declined")}
                            className="flex-1 py-1 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25"
                          >
                            Declined
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================= 2. CHARTS ============================= */

const ChartsSection: React.FC<{
  catalog: PromoRelease[];
  chartBodies: ChartBody[];
  registrations: any[];
  onRefresh: () => void;
  addLog: PromotionHubProps["addLog"];
}> = ({ catalog, chartBodies, registrations, onRefresh, addLog }) => {
  const [selectedRelease, setSelectedRelease] = useState("");
  const [selectedBodies, setSelectedBodies] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const release = catalog.find((r) => r.id === selectedRelease);

  const toggleBody = (id: string) =>
    setSelectedBodies((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleRegister = async () => {
    if (!selectedRelease || selectedBodies.length === 0) return;
    setBusy(true);
    try {
      const res = await registerForCharts({ releaseId: selectedRelease, chartBodyIds: selectedBodies });
      addLog({
        agentName: "Promotion Hub",
        role: "Charts Registration",
        avatar: "🌍",
        message: `Registered ${release?.title} with ${res.count} chart ${res.count === 1 ? "body" : "bodies"}. UPC + ISRCs submitted — sales/streams now count toward official charts.`,
        phase: "Promotion",
        status: "completed",
      });
      setSelectedBodies([]);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await confirmChartRegistration(id);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-1 p-4 rounded-xl border border-brand-border bg-brand-surface space-y-4 h-fit">
        <h3 className="text-[13px] font-semibold text-brand-ink flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-brand-gold" /> Register a Release
        </h3>
        <p className="text-[11px] text-brand-ink-muted">
          Registration ties your UPC + ISRCs to the official chart bodies so every stream and sale counts.
        </p>

        <div>
          <label className="text-[11px] text-brand-ink-muted uppercase tracking-wide">Release</label>
          <select
            value={selectedRelease}
            onChange={(e) => setSelectedRelease(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink"
          >
            <option value="">Select release…</option>
            {catalog.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>

        {release && (
          <div className="p-3 rounded-lg bg-brand-surface-2 border border-brand-border text-[11px] space-y-1">
            <div className="flex justify-between"><span className="text-brand-ink-muted">UPC</span><span className="text-brand-ink font-mono">{release.upc || "—"}</span></div>
            <div className="flex justify-between"><span className="text-brand-ink-muted">Catalog #</span><span className="text-brand-ink font-mono">{release.catalogNumber || "—"}</span></div>
            <div className="flex justify-between"><span className="text-brand-ink-muted">Tracks</span><span className="text-brand-ink">{release.tracks.length}</span></div>
            <div className="flex justify-between"><span className="text-brand-ink-muted">Genre</span><span className="text-brand-gold">{release.primaryGenre}</span></div>
          </div>
        )}

        <div>
          <label className="text-[11px] text-brand-ink-muted uppercase tracking-wide">Chart Bodies</label>
          <div className="mt-1 space-y-1.5">
            {chartBodies.map((b) => (
              <button
                key={b.id}
                onClick={() => toggleBody(b.id)}
                className={`w-full p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                  selectedBodies.includes(b.id) ? "border-brand-gold bg-brand-gold/10" : "border-brand-border bg-brand-surface-2 hover:border-brand-gold/40"
                }`}
              >
                <div>
                  <div className="text-[12px] font-medium text-brand-ink">{b.name}</div>
                  <div className="text-[10px] text-brand-ink-muted">{b.territory} · Requires: {b.requires.join(", ")}</div>
                </div>
                {selectedBodies.includes(b.id) && <CheckCircle2 className="h-4 w-4 text-brand-gold shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={!selectedRelease || selectedBodies.length === 0 || busy}
          className="w-full py-2.5 rounded-lg bg-brand-gold text-brand-bg text-[13px] font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {busy ? "Registering…" : `Register with ${selectedBodies.length || ""} ${selectedBodies.length === 1 ? "Chart" : "Charts"}`}
        </button>
      </div>

      <div className="lg:col-span-2 space-y-3">
        {registrations.length === 0 && (
          <div className="p-10 rounded-xl border border-brand-border bg-brand-surface text-center text-brand-ink-muted text-[13px]">
            No chart registrations yet. Register a release to make its streams and sales count worldwide.
          </div>
        )}
        {registrations.map((r) => (
          <div key={r.id} className="p-4 rounded-xl border border-brand-border bg-brand-surface flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-brand-ink">{r.releaseTitle}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-[11px] text-brand-ink-muted mt-1">
                {r.chartBodyName} · {r.territory} · UPC {r.upc || "—"} · Submitted {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—"}
              </div>
            </div>
            {r.status === "submitted" && (
              <button
                onClick={() => handleConfirm(r.id)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/30 transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================= 3. BEATPORT ============================= */

const BeatportSection: React.FC<{
  catalog: PromoRelease[];
  label: any;
  releases: any[];
  djCharts: any[];
  onRefresh: () => void;
  addLog: PromotionHubProps["addLog"];
}> = ({ catalog, label, releases, djCharts, onRefresh, addLog }) => {
  const [labelName, setLabelName] = useState(label?.labelName || "CrazyJam");
  const [contactEmail, setContactEmail] = useState(label?.contactEmail || "");
  const [greenroomUrl, setGreenroomUrl] = useState(label?.greenroomUrl || "");
  const [bio, setBio] = useState(label?.bio || "");
  const [busy, setBusy] = useState(false);

  const [selectedRelease, setSelectedRelease] = useState("");
  const [chartTitle, setChartTitle] = useState("");
  const [chartUrls, setChartUrls] = useState("");

  useEffect(() => {
    if (label) {
      setLabelName(label.labelName || "CrazyJam");
      setContactEmail(label.contactEmail || "");
      setGreenroomUrl(label.greenroomUrl || "");
      setBio(label.bio || "");
    }
  }, [label]);

  const handleSaveLabel = async () => {
    setBusy(true);
    try {
      await saveBeatportLabel({ labelName, contactEmail, greenroomUrl, bio, status: greenroomUrl ? "claimed" : "setup" });
      addLog({
        agentName: "Promotion Hub",
        role: "Beatport Label",
        avatar: "🏷️",
        message: `Beatport label "${labelName}" saved. ${greenroomUrl ? "Greenroom profile linked — releases can now be staged under your label." : "Add your Greenroom URL once Beatport approves the label claim."}`,
        phase: "Promotion",
        status: "completed",
      });
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleStageRelease = async () => {
    if (!selectedRelease) return;
    setBusy(true);
    try {
      await setupBeatportRelease({ releaseId: selectedRelease });
      addLog({
        agentName: "Promotion Hub",
        role: "Beatport Label",
        avatar: "📦",
        message: "Release staged for Beatport with genre mapping applied. Set pre-order and release dates, then push via your distributor.",
        phase: "Promotion",
        status: "completed",
      });
      setSelectedRelease("");
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitChart = async () => {
    const urls = chartUrls.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!chartTitle || urls.length === 0) return;
    setBusy(true);
    try {
      await submitBeatportDjChart({ title: chartTitle, trackUrls: urls });
      addLog({
        agentName: "Promotion Hub",
        role: "Beatport DJ Charts",
        avatar: "📊",
        message: `DJ chart "${chartTitle}" submitted with ${urls.length} tracks. Featured charts appear on Beatport genre pages.`,
        phase: "Promotion",
        status: "completed",
      });
      setChartTitle("");
      setChartUrls("");
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Label profile */}
      <div className="p-4 rounded-xl border border-brand-border bg-brand-surface space-y-4 h-fit">
        <h3 className="text-[13px] font-semibold text-brand-ink flex items-center gap-2">
          <Disc3 className="h-4 w-4 text-brand-gold" /> Label Profile
        </h3>
        <div>
          <label className="text-[11px] text-brand-ink-muted uppercase tracking-wide">Label Name</label>
          <input value={labelName} onChange={(e) => setLabelName(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink" />
        </div>
        <div>
          <label className="text-[11px] text-brand-ink-muted uppercase tracking-wide">Contact Email</label>
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="label@yourdomain.com" className="mt-1 w-full px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink" />
        </div>
        <div>
          <label className="text-[11px] text-brand-ink-muted uppercase tracking-wide">Greenroom URL</label>
          <input value={greenroomUrl} onChange={(e) => setGreenroomUrl(e.target.value)} placeholder="https://greenroom.beatport.com/label/…" className="mt-1 w-full px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink" />
        </div>
        <div>
          <label className="text-[11px] text-brand-ink-muted uppercase tracking-wide">Label Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink resize-none" placeholder="Independent label pushing Afro-fusion and hip-hop…" />
        </div>
        <button onClick={handleSaveLabel} disabled={busy || !labelName} className="w-full py-2.5 rounded-lg bg-brand-gold text-brand-bg text-[13px] font-semibold hover:brightness-110 disabled:opacity-40 transition">
          {busy ? "Saving…" : label ? "Update Label" : "Create Label Profile"}
        </button>
        {label?.status && (
          <div className="text-center"><StatusBadge status={label.status} /></div>
        )}
        <p className="text-[10px] text-brand-ink-muted">
          Claim your label on{" "}
          <a href="https://greenroom.beatport.com/labels" target="_blank" rel="noreferrer" className="text-brand-gold hover:underline inline-flex items-center gap-0.5">
            Beatport Greenroom <ExternalLink className="h-2.5 w-2.5" />
          </a>{" "}
          — requires a business email and at least one distributed release.
        </p>
      </div>

      {/* Release staging + DJ charts */}
      <div className="lg:col-span-2 space-y-5">
        <div className="p-4 rounded-xl border border-brand-border bg-brand-surface space-y-4">
          <h3 className="text-[13px] font-semibold text-brand-ink flex items-center gap-2">
            <Plus className="h-4 w-4 text-brand-gold" /> Stage Release for Beatport
          </h3>
          <div className="flex gap-2">
            <select
              value={selectedRelease}
              onChange={(e) => setSelectedRelease(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink"
            >
              <option value="">Select release…</option>
              {catalog.map((r) => (
                <option key={r.id} value={r.id}>{r.title} — {r.primaryGenre}</option>
              ))}
            </select>
            <button
              onClick={handleStageRelease}
              disabled={!selectedRelease || busy}
              className="px-4 py-2 rounded-lg bg-brand-gold text-brand-bg text-[12px] font-semibold hover:brightness-110 disabled:opacity-40 transition"
            >
              Stage
            </button>
          </div>

          {releases.length > 0 && (
            <div className="space-y-2 pt-2">
              {releases.map((r) => (
                <div key={r.id} className="p-3 rounded-lg bg-brand-surface-2 border border-brand-border flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-medium text-brand-ink">{r.releaseTitle}</div>
                    <div className="text-[10px] text-brand-ink-muted">
                      Beatport genre: <span className="text-brand-gold">{r.beatportGenre}</span>
                      {r.beatportSubGenres?.length > 0 && ` · ${r.beatportSubGenres.join(", ")}`}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-surface space-y-4">
          <h3 className="text-[13px] font-semibold text-brand-ink flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-gold" /> Submit DJ Chart
          </h3>
          <input
            value={chartTitle}
            onChange={(e) => setChartTitle(e.target.value)}
            placeholder="Chart title, e.g. CrazyJam Afro Heat Picks"
            className="w-full px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink"
          />
          <textarea
            value={chartUrls}
            onChange={(e) => setChartUrls(e.target.value)}
            rows={3}
            placeholder="Beatport track URLs, one per line (in chart order)"
            className="w-full px-3 py-2 rounded-lg bg-brand-surface-2 border border-brand-border text-[12px] text-brand-ink resize-none font-mono"
          />
          <button
            onClick={handleSubmitChart}
            disabled={!chartTitle || !chartUrls.trim() || busy}
            className="px-4 py-2 rounded-lg bg-brand-gold text-brand-bg text-[12px] font-semibold hover:brightness-110 disabled:opacity-40 transition"
          >
            Submit Chart
          </button>

          {djCharts.length > 0 && (
            <div className="space-y-2 pt-2">
              {djCharts.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-brand-surface-2 border border-brand-border flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-medium text-brand-ink">{c.title}</div>
                    <div className="text-[10px] text-brand-ink-muted">{c.trackUrls.length} tracks · {new Date(c.submittedAt).toLocaleDateString()}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================= shared bits ============================= */

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    pending_review: "bg-amber-500/15 text-amber-400",
    live: "bg-emerald-500/15 text-emerald-400",
    submitted: "bg-sky-500/15 text-sky-400",
    confirmed: "bg-emerald-500/15 text-emerald-400",
    staged: "bg-sky-500/15 text-sky-400",
    setup: "bg-amber-500/15 text-amber-400",
    claimed: "bg-sky-500/15 text-sky-400",
    approved: "bg-emerald-500/15 text-emerald-400",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${styles[status] || "bg-brand-surface-2 text-brand-ink-muted"}`}>
      {status.replace("_", " ")}
    </span>
  );
};

const CuratorBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { cls: string; icon: any }> = {
    queued: { cls: "bg-brand-surface text-brand-ink-muted", icon: Clock },
    pitched: { cls: "bg-sky-500/15 text-sky-400", icon: Send },
    accepted: { cls: "bg-emerald-500/15 text-emerald-400", icon: CheckCircle2 },
    declined: { cls: "bg-red-500/15 text-red-400", icon: Clock },
  };
  const { cls, icon: Icon } = map[status] || map.queued;
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium uppercase inline-flex items-center gap-1 ${cls}`}>
      <Icon className="h-2.5 w-2.5" /> {status}
    </span>
  );
};
