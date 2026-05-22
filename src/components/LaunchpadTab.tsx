import React, { useState, useEffect } from "react";
import { 
  Rocket, 
  Sparkles, 
  Globe, 
  HelpCircle, 
  RefreshCw, 
  PlusCircle, 
  CheckCircle2, 
  Import, 
  TrendingUp, 
  Music, 
  Compass, 
  Share2, 
  ArrowRight, 
  Sliders, 
  Lock, 
  Disc, 
  UploadCloud, 
  ExternalLink,
  ChevronRight,
  Activity,
  Check,
  Radio,
  FileAudio
} from "lucide-react";

// Types for callbacks
interface LaunchpadTabProps {
  currentTempo: number;
  currentScale: string;
  onApplyStyle: (prompt: string, tempo: number, scale: string, genre: string) => void;
  addLog: (log: any) => void;
  tracks: any[];
}

interface Web3Account {
  id: string;
  name: string;
  type: string;
  logoColor: string;
  connected: boolean;
  userHandle: string;
  stats: string;
}

interface Suggestion {
  id: string;
  styleName: string;
  tempo: number;
  scale: string;
  genre: string;
  source: string;
  prompt: string;
  description: string;
  attributes: string[];
}

export const LaunchpadTab: React.FC<LaunchpadTabProps> = ({
  currentTempo,
  currentScale,
  onApplyStyle,
  addLog,
  tracks
}) => {
  // ----------------------------------------
  // INTEGRATIONS STATE (Inspiration Stage)
  // ----------------------------------------
  const [accounts, setAccounts] = useState<Web3Account[]>([
    { id: "spotify", name: "Spotify", type: "Streaming", logoColor: "text-emerald-400 bg-emerald-500/10", connected: true, userHandle: "@pro_architect", stats: "482 Liked Tracks • Top Gen: Electro & Synthwave" },
    { id: "youtube", name: "YouTube Music", type: "Streaming", logoColor: "text-red-400 bg-red-400/10", connected: false, userHandle: "", stats: "" },
    { id: "deezer", name: "Deezer HiFi", type: "Streaming", logoColor: "text-pink-400 bg-pink-400/10", connected: false, userHandle: "", stats: "" },
    { id: "reverbnation", name: "ReverbNation", type: "Artist Hub", logoColor: "text-amber-400 bg-amber-500/10", connected: false, userHandle: "", stats: "" }
  ]);

  const [hoveredAcc, setHoveredAcc] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [typedHandle, setTypedHandle] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeSyncStep, setActiveSyncStep] = useState("");
  
  // Custom AI Suggested Sound Styles based on history
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      id: "suggestion-1",
      styleName: "Moody Cyberpunk Synthwave",
      tempo: 118,
      scale: "A Minor",
      genre: "Electro-Clash / Synthwave",
      source: "Spotify Profile",
      prompt: "Brooding retro bassline, neon analog synthesizer pads, gated snare drums, nostalgic and futuristic atmosphere, cyberpunk driving beat",
      description: "Based on your top played retro-synth and electronic bands. The AI detects a preference for rich minor chords, mid-tempo rhythms, and heavy spatial delay effects.",
      attributes: ["Retro Gated Snare", "Arpeggiated Sub Bass", "Atmospheric Reverb"]
    },
    {
      id: "suggestion-2",
      styleName: "Late-Night Chilled Lo-Fi Beats",
      tempo: 82,
      scale: "F Major",
      genre: "Lo-Fi Instrumental Hip-Hop",
      source: "YouTube Music Favorites",
      prompt: "Cozy chilled chord loop, crackly vinyl dust, warm rhodes keys, off-beat acoustic kick drums, jazzy saxophone notes, sleepy laidback study vibes",
      description: "Suggested by your liked bedtime study streams. Promotes mellow major scales, high swing values, and analog tape distortion textures.",
      attributes: ["Tape Hiss Overlay", "Rhodes Keyboard Emulation", "60% Swing Quantize"]
    }
  ]);

  // Handle account connection flow simulation
  const handleConnect = (id: string) => {
    setTypedHandle("");
    setIsLinking(id);
  };

  const confirmLinkAccount = (id: string, handle: string) => {
    if (!handle) return;
    setAccounts(prev => 
      prev.map(acc => 
        acc.id === id 
          ? { 
              ...acc, 
              connected: true, 
              userHandle: handle.startsWith("@") ? handle : `@${handle}`,
              stats: acc.id === "youtube" 
                ? "120 Subscriptions • Top Gen: Future-Jazz & Lo-Fi" 
                : acc.id === "deezer"
                ? "95 Playlists • Top Gen: Club Techno"
                : "Active Bio Feed • Rank: Spotlit Regional Artist"
            } 
          : acc
      )
    );
    setIsLinking(null);
    setTypedHandle("");
    
    addLog({
      agentName: "CrazyJam Syncer",
      role: "Account Integrator",
      avatar: "🔗",
      message: `Successfully established secure feed handshake with your external ${id.toUpperCase()} profile! Synchronizing streaming history.`,
      phase: "Inspiration",
      status: "completed"
    });
  };

  const handleDisconnect = (id: string) => {
    setAccounts(prev => 
      prev.map(acc => acc.id === id ? { ...acc, connected: false, userHandle: "", stats: "" } : acc)
    );
    addLog({
      agentName: "CrazyJam Syncer",
      role: "Account Integrator",
      avatar: "🔗",
      message: `Severed connection with external ${id.toUpperCase()}`,
      phase: "System",
      status: "alert"
    });
  };

  // Run AI History Sync to generate new genre recipes!
  const runAIEngineSync = () => {
    const activeConnected = accounts.filter(a => a.connected);
    if (activeConnected.length === 0) {
      alert("Please connect at least one streaming service (Spotify, YouTube Music, Deezer, etc.) to fetch your history!");
      return;
    }

    setIsSyncing(true);
    let step = 0;
    const steps = [
      "Establishing secure pipeline to active API handlers...",
      "Parsing user history, liked playlist arrays, and tempo-centroids...",
      "Calculating sound signature, spectral weight, and chord preferences...",
      "Prompting local CrazyJam Deep-Synth Composer with history clusters...",
      "Generating tailored Sound Style blueprints..."
    ];

    const interval = setInterval(() => {
      if (step < steps.length) {
        setActiveSyncStep(steps[step]);
        step++;
      } else {
        clearInterval(interval);
        setIsSyncing(false);
        setActiveSyncStep("");
        
        // Add a brand new suggestion based on connected services
        const names = activeConnected.map(a => a.name).join(" + ");
        const newSug: Suggestion = {
          id: `suggestion-${Date.now()}`,
          styleName: "Ethereal Progressive Wave",
          tempo: 125,
          scale: "D Minor",
          genre: "Melodic House & Techno",
          source: `${names} Synced Profile`,
          prompt: "Dripping ethereal synth chord swells, rolling 16th note basslines, snappy club hi-hats, sub-atmospheric soundscape, building climax drop",
          description: "Synthesized direct from your rich melodic history. Incorporates high-fidelity space delays, fast pumping sidechain compression, and 4-on-the-floor drum lines.",
          attributes: ["Melodic House Climax", "Rolling Arpeggiator Bass", "Sidechain Compressor Rack"]
        };
        setSuggestions(prev => [newSug, ...prev]);

        addLog({
          agentName: "CrazyJam AI Coach",
          role: "Creative Inspirer",
          avatar: "🧠",
          message: `Analyzed streaming histories across connected accounts! Suggested an immediate new sound recipe: 'Ethereal Progressive Wave'. Ready to apply.`,
          phase: "Inspiration",
          status: "completed"
        });
      }
    }, 1200);
  };

  // ----------------------------------------
  // SHIPPING & MASTERING STATE (Distribution)
  // ----------------------------------------
  const [releaseTitle, setReleaseTitle] = useState("After Hours Neon Reflection");
  const [artistName, setArtistName] = useState("Sonic Architect");
  const [selectedDistributor, setSelectedDistributor] = useState<"distrokid" | "ditto" | "landr" | "united">("distrokid");
  const [masteringIntensity, setMasteringIntensity] = useState<"low" | "medium" | "high">("medium");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, boolean>>({
    spotify: true,
    apple: true,
    youtube: true,
    deezer: true,
    tiktok: true,
    amazon: true
  });
  
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [shippingError, setShippingError] = useState("");
  const [isShipping, setIsShipping] = useState(false);
  const [shippingLogIndex, setShippingLogIndex] = useState(0);
  const [shippingLogs, setShippingLogs] = useState<string[]>([]);
  const [releaseSuccess, setReleaseSuccess] = useState<any | null>(null);

  const distributors = [
    { id: "distrokid", name: "DistroKid", speed: "Instant upload", fee: "Included in CJ-Pro", logoColor: "text-amber-400 border-amber-500/20" },
    { id: "ditto", name: "Ditto Music", speed: "Within 24 Hours", fee: "Free first release", logoColor: "text-cyan-400 border-cyan-500/20" },
    { id: "landr", name: "LANDR mastering & release", speed: "Mastering + Ship in 1 hr", fee: "Mastering Fee Apply", logoColor: "text-pink-400 border-pink-500/20" },
    { id: "united", name: "UnitedMasters", speed: "2-3 business days", fee: "10% commission option", logoColor: "text-purple-400 border-purple-500/20" }
  ];

  const handleArtworkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setShippingError("Please select a valid cover art image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setShippingError("File exceeds 5MB size limit.");
      return;
    }
    setShippingError("");
    setArtworkFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setArtworkUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShipRelease = () => {
    if (!releaseTitle.trim()) {
      setShippingError("Please state your track release title!");
      return;
    }
    if (!artistName.trim()) {
      setShippingError("Artist name cannot be blank!");
      return;
    }
    setShippingError("");
    setIsShipping(true);
    setShippingLogIndex(0);
    setReleaseSuccess(null);

    const targetStoreNames = Object.entries(selectedPlatforms)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key.toUpperCase());

    const trackingLogs = [
      "Extracting track stem buffers from Arranger...",
      `Assembling final high-fidelity mixdown (24-bit PCM Flac)...`,
      "Analyzing mastering curve: RMS Power of -8.5 LUFS...",
      `Feeding stream directly to the Real-Time LANDR Neural Master Engine...`,
      `Applying level expansion: ${masteringIntensity.toUpperCase()} INTENSITY saturation peaks...`,
      "Rendering final WAV distribution bundle successfully...",
      "Generating secure ISRC distribution code...",
      `Packaging artwork & injecting metadata: Artist="${artistName}", Title="${releaseTitle}"`,
      `Establishing secure API routing token with ${selectedDistributor.toUpperCase()}...`,
      `Delivering master and releasing metadata to stores: [${targetStoreNames.join(", ")}]...`,
      "Synchronizing platform metadata metrics...",
      `Track successfully processed, approved, and SHIPPED to music catalogs! 🎉`
    ];
    setShippingLogs(trackingLogs);

    let idx = 0;
    const streamTimer = setInterval(() => {
      if (idx < trackingLogs.length) {
        setShippingLogIndex(idx);
        idx++;
      } else {
        clearInterval(streamTimer);
        setIsShipping(false);
        
        // Conclude release info
        const generatedIsrc = `US-C1J-26-${Math.floor(10000 + Math.random() * 90000)}`;
        setReleaseSuccess({
          issrc: generatedIsrc,
          distributor: distributors.find(d => d.id === selectedDistributor)?.name || "DistroKid",
          title: releaseTitle,
          artist: artistName,
          platforms: targetStoreNames,
          masteringIntensity
        });

        addLog({
          agentName: "CrazyJam Distributor",
          role: "Label / Distribution Carrier",
          avatar: "🚀",
          message: `Direct deployment complete! Your song "${releaseTitle}" has been packaged, mastered in the cloud, and uploaded for catalog release via ${selectedDistributor.toUpperCase()}. ISRC: ${generatedIsrc}`,
          phase: "Distribution",
          status: "completed"
        });
      }
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* Visual Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#14141d]/80 via-[#22102f]/80 to-[#14141d]/80 border border-white/10 rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          {/* Tag */}
          <div className="inline-flex items-center gap-1 bg-brand-pink/10 border border-brand-pink/30 text-brand-pink text-[9px] uppercase font-mono px-2 py-0.5 rounded-full font-bold">
            <Rocket className="h-3 w-3" />
            <span>End-to-End Creative Ecosystem</span>
          </div>
          <h2 className="font-display font-black text-xl uppercase tracking-wider text-white">
            CrazyJam Global Production Launchpad
          </h2>
          <p className="text-[11px] text-white/50 max-w-2xl leading-relaxed font-sans">
            Inspiration, creation, mastering, and distribution. We have bridged the entire industry workflow. 
            Connect your Spotify or YouTube accounts to feed streaming habits right to the CrazyJam AI generator.
            When you're ready to publish, select LANDR, DistroKid, or Ditto to instantly master and ship your songs directly to all global stores!
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2.5 bg-black/40 border border-white/5 p-3.5 rounded-2xl">
          <Activity className="h-5 w-5 text-brand-cyan animate-pulse" />
          <div className="font-mono text-left">
            <span className="text-[9px] text-white/40 block uppercase">Catalog Releases</span>
            <span className="text-sm font-black text-white">ACTIVE HUB v3.1</span>
          </div>
        </div>
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-brand-pink/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-28 h-28 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ========================================================= */}
        {/* LEFT COLUMN: SOURCE INTEGRATION & AI SUGGESTION FEED      */}
        {/* ========================================================= */}
        <div className="xl:col-span-12 lg:col-span-12 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Streaming Handshakes Panel */}
            <div className="bg-brand-card border border-white/10 rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Compass className="h-5 w-5 text-brand-cyan animate-spin-slow" />
                    <div>
                      <span className="text-[9px] uppercase font-mono tracking-widest text-brand-cyan font-bold">History Integrations</span>
                      <h3 className="font-display font-black text-sm uppercase text-white leading-tight">Link Music Accounts</h3>
                    </div>
                  </div>
                  
                  <HelpCircle 
                    className="h-4 w-4 text-white/20 hover:text-white/40 cursor-help" 
                    title="CrazyJam uses your history and liked music to teach the AI coach your favorite styles, suggesting personalized tempos and structures." 
                  />
                </div>

                <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                  Toggle links to streaming profiles. Secure handshakes enable our neural engines to index your liked playlists, saved genres, and tempo profiles safely.
                </p>

                {/* Account list */}
                <div className="space-y-2.5">
                  {accounts.map((acc) => (
                    <div 
                      key={acc.id}
                      className={`p-3 rounded-2xl border transition-all duration-300 ${
                        acc.connected 
                          ? "bg-[#14141d]/80 border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.15)]" 
                          : "bg-black/20 border-white/5 hover:border-white/10"
                      }`}
                      onMouseEnter={() => setHoveredAcc(acc.id)}
                      onMouseLeave={() => setHoveredAcc(null)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-display font-black text-xs ${acc.logoColor}`}>
                            {acc.name[0]}
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-white block">{acc.name}</span>
                            {acc.connected ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-mono text-white/40">{acc.userHandle} • Linked</span>
                              </div>
                            ) : (
                              <span className="text-[9px] font-mono text-white/30 block mt-0.5">Disconnected</span>
                            )}
                          </div>
                        </div>

                        {acc.connected ? (
                          <button
                            onClick={() => handleDisconnect(acc.id)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-lg text-[9px] font-mono font-bold text-white/60 transition-all cursor-pointer"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(acc.id)}
                            className="px-2.5 py-1 bg-brand-cyan/15 hover:bg-brand-cyan text-brand-cyan hover:text-black border border-brand-cyan/20 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer"
                          >
                            Secure Link
                          </button>
                        )}
                      </div>

                      {acc.connected && acc.stats && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1 text-[9px] font-mono text-white/50 bg-black/10 p-1.5 rounded-lg border border-white/5">
                          <Activity className="h-3 w-3 text-brand-pink" />
                          <span>Metrical Feed: {acc.stats}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Secure Link Modal/Drawer (Overlay inside container for sleek styling) */}
                {isLinking && (
                  <div className="mt-3 p-4 bg-[#1e1526] border border-brand-pink/30 rounded-2xl animate-slideDown text-left">
                    <span className="text-[8px] font-mono text-brand-pink tracking-widest block uppercase font-black mb-1">
                      OAuth Gateway Handshake
                    </span>
                    <h4 className="text-xs font-bold text-white mb-2 leading-tight">
                      Connect to {accounts.find(a => a.id === isLinking)?.name} Catalog
                    </h4>
                    
                    <p className="text-[10px] text-white/40 leading-tight mb-3">
                      We'll import your personal historical playback markers and curated track lists. No security edits or writes are initialized.
                    </p>

                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Your profile username or handle (e.g. jam_master_42)"
                          value={typedHandle}
                          onChange={(e) => setTypedHandle(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white font-mono placeholder-white/20 focus:outline-none focus:border-brand-pink/50"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => setIsLinking(null)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-mono text-white/60 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => confirmLinkAccount(isLinking, typedHandle)}
                          disabled={!typedHandle.trim()}
                          className="px-3 py-1.5 bg-brand-pink/20 hover:bg-brand-pink disabled:bg-brand-pink/5 text-white disabled:text-white/20 border border-brand-pink/40 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer"
                        >
                          Authenticate Feed
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sync Trigger button */}
              <div className="border-t border-white/5 pt-4 mt-4">
                <button
                  onClick={runAIEngineSync}
                  disabled={isSyncing || accounts.filter(a => a.connected).length === 0}
                  className="w-full py-3 px-4 bg-gradient-to-r from-brand-pink to-purple-600 hover:from-brand-pink/90 hover:to-purple-500 text-white font-display font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition duration-300 shadow-md shadow-brand-pink/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>Syncing Playback Histories...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-white" />
                      <span>Sync All Liked Music Data</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Custom suggestions box */}
            <div className="bg-brand-card border border-white/10 rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-brand-pink animate-pulse" />
                    <div>
                      <span className="text-[9px] uppercase font-mono tracking-widest text-[#ff00ff] font-bold">Personalized Recipes</span>
                      <h3 className="font-display font-black text-sm uppercase text-white leading-tight">AI Suggested Sound Styles</h3>
                    </div>
                  </div>
                  
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded-full font-bold">
                    {suggestions.length} Style Blueprints
                  </span>
                </div>

                <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                  The CrazyJam AI analyzed your listening histories. Apply any blueprint directly to customize the local DAW workspace setup instantly!
                </p>

                {isSyncing && activeSyncStep && (
                  <div className="p-4 bg-black/40 border border-brand-cyan/20 rounded-2xl space-y-2 animate-pulse">
                    <span className="text-[9px] font-mono text-brand-cyan tracking-wider block uppercase font-bold">Deep Analyzer Active:</span>
                    <p className="text-[10px] font-mono text-white/80 leading-none">{activeSyncStep}</p>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div className="bg-brand-cyan h-full w-2/3 animate-ping" />
                    </div>
                  </div>
                )}

                {/* Suggestions Feed items */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {suggestions.map((sug) => (
                    <div 
                      key={sug.id}
                      className="p-3 bg-black/35 rounded-2xl border border-white/5 hover:border-brand-pink/20 transition-all text-left flex flex-col justify-between gap-3"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-white tracking-wide">
                            {sug.styleName}
                          </span>
                          <span className="text-[8px] font-mono text-brand-pink bg-brand-pink/10 border border-brand-pink/20 px-1.5 py-0.2 rounded-md font-bold">
                            Source: {sug.source}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-[9px] font-sans text-white/40 mt-1 leading-tight">
                          {sug.description}
                        </p>

                        {/* Blueprint values */}
                        <div className="grid grid-cols-2 gap-2 mt-2 bg-white/5 p-1.5 rounded-lg font-mono text-[9px]">
                          <div>
                            <span className="text-white/30 block uppercase">Tempo</span>
                            <span className="text-brand-cyan font-bold">{sug.tempo} BPM</span>
                          </div>
                          <div>
                            <span className="text-white/30 block uppercase">Harmonic Scale</span>
                            <span className="text-[#e2933a] font-bold">{sug.scale}</span>
                          </div>
                        </div>

                        {/* Pill tags */}
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {sug.attributes.map((attr, idx) => (
                            <span key={idx} className="text-[8px] font-mono text-white/40 bg-[#1d1d2b] px-1.5 py-0.5 rounded-md">
                              #{attr}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => {
                          onApplyStyle(sug.prompt, sug.tempo, sug.scale.split(" ")[0] || "A", "Electro");
                          addLog({
                            agentName: "CrazyJam AI Coach",
                            avatar: "🧠",
                            role: "Prompt Injector",
                            message: `Injected suggestion '${sug.styleName}' directly to studio workspace. Adjusted tempo to ${sug.tempo} BPM, scale to ${sug.scale}`,
                            phase: "Creation",
                            status: "completed"
                          });
                          alert(`Applied '${sug.styleName}'! Checked & synced Tempo to ${sug.tempo} BPM and Scale to ${sug.scale}. Check your Modular Arranger tab to see the customized AI suggestions!`);
                        }}
                        className="py-1.5 w-full bg-white/5 hover:bg-brand-cyan hover:text-black border border-white/10 hover:border-transparent text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-xl transition duration-300 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Import className="h-3 w-3" />
                        <span>Apply Sound Blueprint to Studio</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================= */}
        {/* LOWER SECTION: END-TO-END DISTRIBUTION CARRIER CONSOLE     */}
        {/* ========================================================= */}
        <div className="xl:col-span-12 space-y-6">
          <div className="bg-brand-card border border-white/10 rounded-[32px] p-6 relative overflow-hidden">
            
            <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 mb-5">
              <div className="flex items-center gap-2.5">
                <Rocket className="h-5 w-5 text-brand-pink" />
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-widest text-brand-pink font-bold">WAV Export & Direct Shipping</span>
                  <h3 className="font-display font-black text-sm uppercase text-white leading-tight">Master Carrier Publishing Portal</h3>
                </div>
              </div>
              <span className="text-[9px] font-mono text-white/30 tracking-wider">
                Lossless Audio • Global ISRC Generator Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Form parameters */}
              <div className="lg:col-span-4 space-y-4">
                <span className="text-[9px] font-mono text-white/35 uppercase tracking-widest block font-bold border-b border-white/5 pb-1">
                  1. Audio Metadata & Artwork
                </span>

                {shippingError && (
                  <p className="text-[10px] font-mono text-red-400 font-bold bg-red-400/10 p-2.5 rounded-xl text-center border border-red-500/20">
                    {shippingError}
                  </p>
                )}

                <div className="space-y-3">
                  {/* Title Box */}
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-mono text-white/40 block uppercase">Song/Release Title</label>
                    <input
                      type="text"
                      value={releaseTitle}
                      onChange={(e) => setReleaseTitle(e.target.value)}
                      placeholder="Type release title..."
                      className="w-full bg-[#14141d] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/30 font-display font-bold uppercase tracking-wider"
                    />
                  </div>

                  {/* Creator Box */}
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-mono text-white/40 block uppercase">Primary Artist Name</label>
                    <input
                      type="text"
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      placeholder="Artist handle..."
                      className="w-full bg-[#14141d] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-brand-pink/50 focus:ring-1 focus:ring-brand-pink/30 font-display font-black uppercase tracking-widest text-brand-pink"
                    />
                  </div>

                  {/* Artwork Image Container */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] font-mono text-white/40 block uppercase">Release Cover Artwork</label>
                    
                    <div className="flex gap-4 items-center">
                      {/* Preview Box */}
                      <div className="h-18 w-18 shrink-0 rounded-xl bg-[#14141d] border border-white/10 overflow-hidden flex items-center justify-center relative shadow-inner select-none">
                        {artworkUrl ? (
                          <img src={artworkUrl} alt="Cover Preview" className="h-full w-full object-cover" />
                        ) : (
                          <Disc className="h-6 w-6 text-white/10 animate-spin-slow" />
                        )}
                        <div className="absolute inset-0 bg-neutral-900/10 pointer-events-none" />
                      </div>

                      {/* Upload triggers */}
                      <div className="flex-1 space-y-1">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-brand-pink/40 rounded-xl cursor-pointer text-[10px] font-mono font-bold text-white transition-all">
                          <UploadCloud className="h-3.5 w-3.5 text-brand-pink" />
                          <span>Choose Cover Art</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleArtworkUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[8px] font-mono text-white/30 block leading-tight">
                          Supports JPEG or PNG. High-contrast square format recommended (min 1400x1400).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master / Cloud Configs */}
              <div className="lg:col-span-5 space-y-5 border-t lg:border-t-0 lg:border-x border-white/5 pt-4 lg:pt-0 lg:px-6">
                
                {/* Mastering curves */}
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-white/35 uppercase tracking-widest block font-bold border-b border-white/5 pb-1">
                    2. AI Cloud Remastering Parameters
                  </span>
                  <p className="text-[9px] text-white/40 leading-relaxed font-sans">
                    Integrate direct audio bounce with Cloud AI models. This simulates full mastering chains to optimize loudness, transients, and sub bass dynamics.
                  </p>
                  
                  <div className="flex items-center gap-2 pt-1.5">
                    {["low", "medium", "high"].map((level) => (
                      <button
                        key={level}
                        onClick={() => setMasteringIntensity(level as any)}
                        className={`flex-1 py-2 text-[10px] font-mono uppercase font-black tracking-widest border rounded-xl transition ${
                          masteringIntensity === level
                            ? "bg-brand-pink/15 border-brand-pink text-brand-pink shadow-md shadow-brand-pink/10"
                            : "bg-[#14141d]/40 border-white/5 hover:border-white/10 text-white/50"
                        }`}
                      >
                        {level} intensity
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distributor selection of Ditto, DistroKid, LANDR */}
                <span className="text-[9px] font-mono text-white/35 uppercase tracking-widest block font-bold border-b border-white/5 pb-1 pt-1.5">
                  3. Carrier System Handshake
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  {distributors.map((dist) => (
                    <button
                      key={dist.id}
                      onClick={() => setSelectedDistributor(dist.id as any)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${
                        selectedDistributor === dist.id 
                          ? "bg-brand-cyan/15 border-brand-cyan text-white shadow-md shadow-brand-cyan/10" 
                          : "bg-black/35 border-white/5 hover:border-white/10 text-white/50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-display font-black uppercase text-white tracking-wide">
                          {dist.name.split(" ")[0]}
                        </span>
                        {selectedDistributor === dist.id && (
                          <div className="h-1.5 w-1.5 rounded-full bg-brand-cyan animate-pulse" />
                        )}
                      </div>
                      <div className="space-y-0.5 mt-2">
                        <span className="text-[8px] font-mono text-white/40 block leading-none">{dist.speed}</span>
                        <span className="text-[8px] font-mono text-brand-cyan font-bold block leading-none">{dist.fee}</span>
                      </div>
                    </button>
                  ))}
                </div>

              </div>

              {/* Target Platforms Checkbox */}
              <div className="lg:col-span-3 space-y-4">
                <span className="text-[9px] font-mono text-white/35 uppercase tracking-widest block font-bold border-b border-white/5 pb-1">
                  4. Release Storefront Channels
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedPlatforms).map(([id, enabled]) => (
                    <button
                      key={id}
                      onClick={() => togglePlatform(id)}
                      className={`py-2 px-2.5 rounded-xl border flex items-center justify-between gap-1.5 transition text-[10px] font-bold uppercase tracking-wider ${
                        enabled 
                          ? "bg-amber-400/10 border-amber-400/30 text-white shadow-md shadow-amber-400/5 font-black"
                          : "bg-black/25 border-white/5 hover:border-white/10 text-white/35"
                      }`}
                    >
                      <span>{id}</span>
                      {enabled ? (
                        <Check className="h-3 w-3 text-amber-400" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-white/10 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="bg-[#14141d]/50 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-white/35 uppercase block"> DAW Mix Summary:</span>
                  <div className="flex gap-1.5 items-center text-[9px] font-mono text-emerald-400 font-bold">
                    <FileAudio className="h-3.5 w-3.5" />
                    <span>Active Audio Mix is Bounced ({tracks?.length || 4} channels)</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Ship Button Trigger */}
            <div className="border-t border-white/5 pt-5 mt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="text-left space-y-0.5">
                <span className="text-[10px] text-white/40 block leading-tight font-sans">
                  Ready to bounce, master, and upload? Handshaking locks in full commercial copyrights automatically.
                </span>
                <span className="text-[9px] font-mono text-brand-cyan font-bold block">
                  Active ISRC Namespace: CRAZYJAM-CLOUD-DISTRIBUTOR-VER9
                </span>
              </div>

              <div className="w-full md:w-auto flex gap-3">
                <button
                  onClick={handleShipRelease}
                  disabled={isShipping}
                  className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-brand-pink to-brand-cyan hover:from-white/95 hover:to-white hover:text-black text-white font-display font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2.5 transition duration-300 shadow-md shadow-brand-pink/10 disabled:opacity-40 cursor-pointer"
                >
                  <Rocket className="h-4.5 w-4.5" />
                  <span>{isShipping ? "Bouncing & Shipping Release..." : "Ship Release Worldwide"}</span>
                </button>
              </div>
            </div>

            {/* Tracking logs or Success state */}
            {isShipping && (
              <div className="mt-6 p-4 rounded-3xl bg-[#09090e]/95 border border-brand-cyan/20 space-y-3.5 animate-fadeIn text-left shadow-lg">
                <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
                  <span className="text-[9px] font-mono text-brand-cyan tracking-wider uppercase font-black flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-cyan" />
                    Mastering & Transit Stream: Step {shippingLogIndex + 1}/{shippingLogs.length}
                  </span>
                  <span className="text-[9px] font-mono text-white/30 truncate max-w-xs">{releaseTitle}</span>
                </div>

                {/* Progressive dynamic logs list styled with Mono */}
                <div className="space-y-1 bg-black/45 p-3 rounded-xl border border-white/5 max-h-[160px] overflow-y-auto font-mono text-[10px]">
                  {shippingLogs.map((log, i) => {
                    const isPassed = i < shippingLogIndex;
                    const isActive = i === shippingLogIndex;
                    return (
                      <div 
                        key={i} 
                        className={`transition-all duration-300 ${
                          isPassed 
                            ? "text-white/30" 
                            : isActive 
                            ? "text-brand-cyan font-bold ml-1 flex items-center gap-1.5" 
                            : "text-white/10"
                        }`}
                      >
                        {isActive && <div className="h-1 py-1 w-1 rounded-full bg-brand-cyan animate-ping" />}
                        <span>{isPassed ? "✓ " : isActive ? "▶ " : "• "}{log}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {releaseSuccess && (
              <div className="mt-6 p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 animate-fadeIn text-left shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex gap-3 items-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[8px] font-mono text-emerald-400 tracking-widest block uppercase font-black">Release Complete</span>
                    <h4 className="font-display font-black text-sm uppercase text-white leading-tight">
                      "{releaseSuccess.title}" Published Worldwide!
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/35 p-3 rounded-2xl border border-white/5 font-mono text-[9px] text-white/60">
                  <div className="space-y-0.5">
                    <span className="text-white/30 uppercase block">Copyright Owner</span>
                    <span className="font-bold text-white">{releaseSuccess.artist}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-white/30 uppercase block">Catalog Carrier</span>
                    <span className="font-bold text-brand-pink">{releaseSuccess.distributor}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-white/30 uppercase block">Mastering Profile</span>
                    <span className="font-bold text-brand-cyan">{releaseSuccess.masteringIntensity} intensity</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-white/30 uppercase block">Unique ISRC</span>
                    <span className="font-bold text-emerald-400 select-all">{releaseSuccess.issrc}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-white/40 block uppercase">Distributed Outlets Pending Inspection:</span>
                  <div className="flex flex-wrap gap-2">
                    {releaseSuccess.platforms.map((plat: string) => (
                      <span key={plat} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[9px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {plat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a 
                    href="https://spotify.com" 
                    target="_blank" 
                    rel="noreferrer"
                    className="py-2 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-mono font-bold text-white transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <span>View Spotify Catalog Pending Desk</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button 
                    onClick={() => {
                      alert(`Share link copied to clipboard: https://crazyjam.studio/releases/${releaseSuccess.issrc}`);
                    }}
                    className="py-2 px-4 bg-brand-cyan/25 hover:bg-brand-cyan hover:text-black rounded-xl text-[10px] font-mono font-bold text-brand-cyan transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Copy Shareable Smartlink</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
