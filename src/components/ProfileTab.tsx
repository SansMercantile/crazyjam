import React, { useState } from "react";
import { 
  User, 
  LogIn, 
  LogOut, 
  Sparkles, 
  Mail, 
  ShieldCheck, 
  Music, 
  Sliders, 
  Chrome,
  Award,
  BookOpen,
  Palette,
  Check,
  Disc,
  UploadCloud,
  Layers,
  Heart
} from "lucide-react";
import { AnimatedAvatar } from "./AnimatedAvatar";

interface ProfileTabProps {
  currentUser: any;
  onUserUpdate: (userInfo: any) => void;
  onboardingFinished: boolean;
  onOnboardingFinishedChange: (state: boolean) => void;
  addLog: (log: any) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  currentUser,
  onUserUpdate,
  onboardingFinished,
  onOnboardingFinishedChange,
  addLog,
}) => {
  // Local edit states
  const [editName, setEditName] = useState(currentUser?.name || "Pulse DJ");
  const [editHandle, setEditHandle] = useState(currentUser?.handle || "@jam_architect");
  const [editBio, setEditBio] = useState(currentUser?.bio || "Composing high-fidelity synthetic micro-rhythms with neural multi-agent swarm grids.");
  const [editStyle, setEditStyle] = useState(currentUser?.styleAlign || "Moody Cyberpunk Synthwave");
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || "🕵️");
  const [accentColor, setAccentColor] = useState("pink"); // User customized theme accent: pink, cyan, purple, amber
  const [uploadError, setUploadError] = useState("");

  // Auth local states
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [validationError, setValidationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Available avatars
  const AVATARS = ["🎧", "🎹", "🎙️", "🕵️", "👽", "🎚️", "🎸", "🥁", "⚡", "👾"];

  // Available styles
  const STYLE_PRESETS = [
    "Moody Cyberpunk Synthwave",
    "Nostalgic 86 Lofi Beats",
    "Cinematic Industrial Dark Techno",
    "Heavy Underground Deep House",
    "Tropical Organic Ambient Groove"
  ];

  // Save modified profile trigger
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      setIsSaving(false);
      const cleanHandle = editHandle.startsWith("@") ? editHandle : `@${editHandle}`;
      const updatedUser = {
        ...currentUser,
        name: editName,
        handle: cleanHandle,
        bio: editBio,
        styleAlign: editStyle,
        avatar: editAvatar,
      };

      onUserUpdate(updatedUser);
      localStorage.setItem("crazyjam_user_profile", JSON.stringify(updatedUser));
      
      addLog({
        agentName: "System Swarm Manager",
        role: "System",
        avatar: "⚙️",
        message: `ARTIST STUDIO PROFILE SAVED CONTEXT:\nSuccessfully updated moniker identity of the Producer to "${editName}" (${cleanHandle}). Preferences synced to active sequenser channels!`,
        phase: "System",
        status: "completed"
      });
    }, 1000);
  };

  // Determine musician level rank based on compiled tracks
  const getProducerRank = () => {
    const tracks = currentUser?.tracksComposed || 0;
    if (tracks >= 25) return { label: "Musician Legend Conducteur", range: "Master Swarm Coordinator", levelColor: "text-amber-400" };
    if (tracks >= 15) return { label: "Platinum Multi-Agent Producer", range: "High-Fidelity Synthesizer master", levelColor: "text-brand-pink" };
    if (tracks >= 10) return { label: "Gold Swarm Arranger", range: "Acoustic Sequence expert", levelColor: "text-brand-cyan" };
    return { label: "Bronze Sample Pad Producer", range: "Getting started in the DAW", levelColor: "text-[#e2933a]" };
  };

  const rank = getProducerRank();

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Onboarding Wizard restart bar if completed */}
      {onboardingFinished && (
        <div className="bg-gradient-to-r from-purple-500/10 to-[#e2933a]/10 border border-purple-500/25 p-4 rounded-2xl flex max-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl animate-pulse">👑</span>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Completed setup onboarding successfully!</h4>
              <p className="text-[10px] text-white/50">Your workspace is fully dialed into your fav sounds. Tweak your preferences below.</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("crazyjam_onboarding_completed");
              onOnboardingFinishedChange(false);
            }}
            className="px-3.5 py-1.5 bg-purple-500/20 hover:bg-purple-500 hover:text-white border border-purple-500/30 text-purple-400 font-mono text-[9px] font-black uppercase rounded-lg transition cursor-pointer"
          >
            Launch Setup Wizard Again
          </button>
        </div>
      )}

      {/* Main Profile Modifying Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Form to edit profile */}
        <div className="lg:col-span-8 bg-brand-card border border-white/10 rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <User className="h-5 w-5 text-brand-cyan" />
              <div>
                <span className="text-[9px] uppercase font-mono tracking-widest text-brand-cyan font-bold">Artist account configurations</span>
                <h3 className="font-display font-black text-sm uppercase text-white leading-tight">Modify Producer Profile</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Display Name input */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-white/40 block uppercase tracking-wider font-bold">Musician Moniker / Display Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-brand-cyan hover:bg-neutral-800/40 text-xs py-2.5 px-3 rounded-xl text-white outline-none transition"
                  placeholder="e.g. David Guetta"
                />
              </div>

              {/* Producer Handle */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-white/40 block uppercase tracking-wider font-bold font-mono">Producer Handle</label>
                <input
                  type="text"
                  required
                  value={editHandle}
                  onChange={(e) => setEditHandle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-brand-cyan hover:bg-neutral-800/40 text-xs py-2.5 px-3 rounded-xl text-white outline-none transition font-sans"
                  placeholder="e.g. @jam_architect"
                />
              </div>
            </div>

            {/* Custom Bio text area */}
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-white/40 block uppercase tracking-wider font-bold">Biography Profile Pitch</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={2}
                className="w-full bg-black/40 border border-white/10 focus:border-brand-cyan hover:bg-neutral-800/40 text-xs py-2 px-3 rounded-xl text-white outline-none transition resize-none h-18 font-sans"
                placeholder="Share your musical inspirations..."
              />
            </div>

            {/* Avatar Selector Emojis */}
            <div className="space-y-1.5 bg-black/30 p-4 rounded-2xl border border-white/5 text-left w-full">
              <span className="text-[9px] font-mono text-white/40 block uppercase tracking-wider font-bold">Select Active Studio Avatar</span>
              
              {uploadError && (
                <p className="text-[9px] font-mono text-red-400 font-bold bg-red-400/10 p-2 rounded-lg text-center">{uploadError}</p>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Active selection preview */}
                <div className="relative shrink-0 select-none">
                  <AnimatedAvatar avatar={editAvatar} size="lg" className="border-2 border-brand-cyan shadow-md shadow-brand-cyan/10" />
                  <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border border-brand-dark animate-pulse" />
                </div>

                <div className="flex-1 space-y-3.5 w-full">
                  {/* Presets grid */}
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-white/35 block uppercase font-bold">Presets:</span>
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2 bg-black/25 p-2 rounded-xl border border-white/5">
                      {AVATARS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setUploadError("");
                            setEditAvatar(emoji);
                          }}
                          className={`rounded-lg p-0.5 flex items-center justify-center border transition-all hover:bg-white/10 hover:scale-105 cursor-pointer ${
                            editAvatar === emoji
                              ? "border-brand-cyan bg-brand-cyan/25 text-brand-cyan"
                              : "border-transparent bg-white/5"
                          }`}
                        >
                          <AnimatedAvatar avatar={emoji} size="xs" interactive={false} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Local upload input */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-pink/50 rounded-lg cursor-pointer text-[10px] font-mono font-bold text-white transition-all">
                      <UploadCloud className="h-3.5 w-3.5 text-brand-pink" />
                      <span>Upload Studio Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          setUploadError("");
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith("image/")) {
                            setUploadError("Format unsupported. Please select an image.");
                            return;
                          }
                          if (file.size > 4 * 1024 * 1024) {
                            setUploadError("Image is too large. Max is 4MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setEditAvatar(ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Style Align Focus preset list */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-white/40 block uppercase tracking-wider font-bold">Primary Rhythmic Genre Focus</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[110px] overflow-y-auto scrollbar-thin">
                {STYLE_PRESETS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEditStyle(st)}
                    className={`p-2.5 rounded-xl border text-left text-[10px] cursor-pointer transition ${
                      editStyle === st
                        ? "bg-brand-cyan/10 border-brand-cyan text-brand-cyan"
                        : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Disc className={`h-3 w-3 ${editStyle === st ? "animate-spin text-brand-cyan" : "text-white/30"}`} />
                      <span className="font-bold uppercase tracking-wide">{st}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom DAW color theme accent selection */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-white/40 block uppercase tracking-wider font-bold">DAW Interface Colored Accents</label>
              <div className="flex gap-4">
                {[
                  { id: "pink", label: "Pink Sunrise", color: "bg-brand-pink" },
                  { id: "cyan", label: "Electric Cyan", color: "bg-brand-cyan" },
                  { id: "purple", label: "Neon Purple", color: "bg-purple-500" },
                  { id: "amber", label: "Amber Sunlight", color: "bg-[#e2933a]" },
                ].map((tc) => (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => setAccentColor(tc.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-mono uppercase font-black transition cursor-pointer ${
                      accentColor === tc.id
                        ? "border-white/40 bg-white/10 text-white"
                        : "border-transparent bg-white/5 text-white/50"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${tc.color}`} />
                    <span>{tc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-brand-cyan hover:bg-cyan-600 font-display font-black uppercase text-xs tracking-widest text-brand-dark py-3.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-brand-cyan/10 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="h-4.5 w-4.5 border-2 border-brand-dark border-t-transparent animate-spin rounded-full" />
                  SAVING CODES TO DB ENGINE...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4.5 w-4.5" />
                  Deploy Modified Credentials
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Custom Musician levels and SSO Credential lockers */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Creator Badges Level Medal Card */}
          <div className="bg-brand-card border border-white/10 rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#e2933a]/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Award className="h-5 w-5 text-[#e2933a]" />
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-widest text-[#e2933a] font-bold">Creative Level Index</span>
                  <h3 className="font-display font-black text-sm uppercase text-white leading-tight">Producer Studio Rank</h3>
                </div>
              </div>

              <div className="flex flex-col items-center text-center p-4 bg-black/45 rounded-2xl border border-white/5 border-[#e2933a]/10 relative">
                <span className="text-5xl mb-2 animate-bounce">👑</span>
                <span className={`font-display font-black text-xs uppercase tracking-wide ${rank.levelColor}`}>
                  {rank.label}
                </span>
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5 leading-none block">
                  {rank.range}
                </span>

                <div className="w-full bg-white/5 h-2 rounded-full border border-white/10 overflow-hidden mt-4">
                  <div 
                    className="h-full bg-gradient-to-r from-[#e2933a] to-yellow-300"
                    style={{ width: `${Math.min(100, ((currentUser?.tracksComposed || 0) / 25) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between w-full text-[8px] font-mono text-white/35 uppercase mt-1">
                  <span>Track count: {currentUser?.tracksComposed || 0}</span>
                  <span>Goal: 25 legend</span>
                </div>
              </div>

              {/* Creator stats lists */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-brand-dark p-3 rounded-xl border border-white/5">
                  <span className="text-[8px] text-white/35 font-mono block uppercase tracking-wider font-bold">Session Mixdowns</span>
                  <span className="text-lg font-black text-brand-cyan font-mono block mt-0.5">{currentUser?.tracksComposed || 0}</span>
                </div>
                <div className="bg-brand-dark p-3 rounded-xl border border-white/5">
                  <span className="text-[8px] text-white/35 font-mono block uppercase tracking-wider font-bold">Saved Presets</span>
                  <span className="text-lg font-black text-brand-pink font-mono block mt-0.5">{currentUser?.presetsSaved || 0}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-[9px] font-mono text-white/35 text-center block">
              Continuous composing ranks you up recursively!
            </div>
          </div>

          {/* Connected OAuth SSO Locker info */}
          <div className="bg-brand-card border border-white/10 rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <LogIn className="h-5 w-5 text-brand-pink" />
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-widest text-brand-pink font-bold">Secure lock credential</span>
                  <h3 className="font-display font-black text-sm uppercase text-white leading-tight">SSO Connected Identities</h3>
                </div>
              </div>

              <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                CrazyJam incorporates secure Simulated Unified Google Account locks for multiplayer session coordination.
              </p>

              {isLoggedIn ? (
                <div className="flex flex-col items-center justify-center text-center p-4 bg-brand-dark rounded-2xl border border-emerald-500/25 shadow-neon-cyan animate-fadeIn gap-3">
                  <div className="bg-emerald-500/10 p-3 border border-emerald-500/30 text-emerald-400 rounded-full">
                    <ShieldCheck className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-white font-display select-none">Credentials verified live</h4>
                    <p className="text-[9px] font-mono text-purple-400 mt-1 max-w-[210px] leading-tight mx-auto font-bold truncate">
                      {currentUser?.email || "hello@sansmercantile.com"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button onClick={() => setIsLoggedIn(true)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-center gap-2 w-full cursor-pointer transition">
                    <Chrome className="h-4 w-4 text-brand-pink" />
                    <span className="text-[10px] font-bold uppercase text-white">Gmail Access Identity login</span>
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-[9px] font-mono text-white/35 text-center">
              Multi-factor tokens: active & verified
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
