import React, { useState, useEffect } from "react";
import {
  User,
  LogIn,
  ShieldCheck,
  Award,
  Disc,
  UploadCloud,
} from "lucide-react";
import { AnimatedAvatar } from "./AnimatedAvatar";
import { fetchCurrentUser, updateProfile } from "../utils/api";

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
  const [editName, setEditName] = useState(currentUser?.name || "");
  const [editHandle, setEditHandle] = useState(currentUser?.handle || "");
  const [editBio, setEditBio] = useState("");
  const [editStyle, setEditStyle] = useState(currentUser?.styleAlign || "Moody Cyberpunk Synthwave");
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || "🕵️");
  const [uploadError, setUploadError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [tracksComposed, setTracksComposed] = useState(currentUser?.tracksComposed || 0);
  const [presetsSaved, setPresetsSaved] = useState(currentUser?.presetsSaved || 0);

  // Pull the freshest profile (including bio, which the app-level user
  // object doesn't carry) directly from the backend on mount.
  useEffect(() => {
    fetchCurrentUser()
      .then((me) => {
        setEditName(me.name || "");
        setEditHandle(me.handle || "");
        setEditBio(me.bio || "");
        setEditStyle(me.styleAlign || "Moody Cyberpunk Synthwave");
        setEditAvatar(me.avatar || "🕵️");
        setTracksComposed(me.tracksComposed || 0);
        setPresetsSaved(me.presetsSaved || 0);
      })
      .catch(() => {});
  }, []);

  const AVATARS = ["🎧", "🎹", "🎙️", "🕵️", "👽", "🎚️", "🎸", "🥁", "⚡", "👾"];

  const STYLE_PRESETS = [
    "Moody Cyberpunk Synthwave",
    "Nostalgic 86 Lofi Beats",
    "Cinematic Industrial Dark Techno",
    "Heavy Underground Deep House",
    "Tropical Organic Ambient Groove"
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setValidationError("");
    try {
      const updated = await updateProfile({
        name: editName,
        handle: editHandle,
        bio: editBio,
        avatar: editAvatar,
        styleAlign: editStyle,
      });
      setEditHandle(updated.handle);
      onUserUpdate({ ...currentUser, name: updated.name, handle: updated.handle, avatar: updated.avatar, theme: updated.styleAlign });
      addLog({
        agentName: "Profile",
        role: "Account",
        avatar: "👤",
        message: `Profile updated - now "${updated.name}" (${updated.handle}).`,
        phase: "System",
        status: "completed"
      });
    } catch (err: any) {
      setValidationError(err.message || "Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const getProducerRank = () => {
    if (tracksComposed >= 25) return { label: "Legend Conductor", range: "Master swarm coordinator" };
    if (tracksComposed >= 15) return { label: "Platinum Producer", range: "High-fidelity synthesizer master" };
    if (tracksComposed >= 10) return { label: "Gold Arranger", range: "Sequence expert" };
    return { label: "Bronze Producer", range: "Getting started in the DAW" };
  };

  const rank = getProducerRank();

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {onboardingFinished && (
        <div className="bg-brand-gold/10 border border-brand-gold/25 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4">
          <div>
            <h4 className="text-[13px] font-medium text-brand-ink">Setup complete</h4>
            <p className="text-[11px] text-brand-ink-muted">Your workspace is dialed into your sound. Tweak preferences below anytime.</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("crazyjam_onboarding_completed");
              onOnboardingFinishedChange(false);
            }}
            className="px-3.5 py-1.5 bg-brand-surface-2 hover:bg-brand-gold hover:text-brand-bg border border-brand-gold/30 text-brand-gold text-[11px] font-medium rounded-lg transition-all"
          >
            Run setup wizard again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-between">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex items-center gap-2 border-b border-brand-border pb-3">
              <User className="h-5 w-5 text-brand-gold" />
              <h3 className="font-display text-base text-brand-ink">Producer profile</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-brand-ink-muted block">Display name</label>
                <input
                  type="text" required value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold text-sm py-2.5 px-3 rounded-lg text-brand-ink outline-none transition-all"
                  placeholder="e.g. David Guetta"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-brand-ink-muted block">Producer handle</label>
                <input
                  type="text" required value={editHandle}
                  onChange={(e) => setEditHandle(e.target.value)}
                  className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold text-sm py-2.5 px-3 rounded-lg text-brand-ink outline-none transition-all"
                  placeholder="e.g. jam_architect"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-brand-ink-muted block">Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={2}
                className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold text-sm py-2 px-3 rounded-lg text-brand-ink outline-none transition-all resize-none"
                placeholder="Share your musical inspirations..."
              />
            </div>

            <div className="space-y-2 bg-brand-surface-2 p-4 rounded-xl border border-brand-border">
              <span className="text-[11px] text-brand-ink-muted block">Avatar</span>
              {uploadError && <p className="text-[11px] text-red-400 bg-red-400/10 p-2 rounded-lg text-center">{uploadError}</p>}

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative shrink-0 select-none">
                  <AnimatedAvatar avatar={editAvatar} size="lg" className="border border-brand-gold/40" />
                  <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-emerald-500 border border-brand-surface" />
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2 bg-brand-surface p-2 rounded-lg border border-brand-border">
                    {AVATARS.map((emoji) => (
                      <button
                        key={emoji} type="button"
                        onClick={() => { setUploadError(""); setEditAvatar(emoji); }}
                        className={`rounded-md p-0.5 flex items-center justify-center border transition-all ${editAvatar === emoji ? "border-brand-gold bg-brand-gold/10" : "border-transparent"}`}
                      >
                        <AnimatedAvatar avatar={emoji} size="xs" interactive={false} />
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 px-3 py-1.5 w-fit bg-brand-surface hover:bg-brand-border/20 border border-brand-border rounded-lg cursor-pointer text-[12px] text-brand-ink transition-all">
                    <UploadCloud className="h-3.5 w-3.5 text-brand-gold" />
                    <span>Upload photo</span>
                    <input
                      type="file" accept="image/*"
                      onChange={(e) => {
                        setUploadError("");
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/")) { setUploadError("Format unsupported."); return; }
                        if (file.size > 4 * 1024 * 1024) { setUploadError("Max size 4MB."); return; }
                        const reader = new FileReader();
                        reader.onload = (ev) => { if (ev.target?.result) setEditAvatar(ev.target.result as string); };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-brand-ink-muted block">Primary style focus</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STYLE_PRESETS.map((st) => (
                  <button
                    key={st} type="button" onClick={() => setEditStyle(st)}
                    className={`p-2.5 rounded-lg border text-left text-[12px] transition-all ${
                      editStyle === st ? "bg-brand-gold/10 border-brand-gold text-brand-gold" : "bg-brand-surface-2 border-brand-border text-brand-ink-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Disc className="h-3 w-3" />
                      <span>{st}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {validationError && <p className="text-[11px] text-red-400 text-center">{validationError}</p>}

            <button
              type="submit" disabled={isSaving}
              className="w-full metal-gold font-semibold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Save changes
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-brand-border pb-3">
                <Award className="h-5 w-5 text-brand-gold" />
                <h3 className="font-display text-base text-brand-ink">Producer rank</h3>
              </div>

              <div className="flex flex-col items-center text-center p-4 bg-brand-surface-2 rounded-xl border border-brand-border">
                <span className="text-[13px] font-medium text-brand-gold">{rank.label}</span>
                <span className="text-[11px] text-brand-ink-muted mt-0.5">{rank.range}</span>

                <div className="w-full bg-brand-surface h-1.5 rounded-full border border-brand-border overflow-hidden mt-4">
                  <div className="h-full bg-brand-gold" style={{ width: `${Math.min(100, (tracksComposed / 25) * 100)}%` }} />
                </div>
                <div className="flex justify-between w-full text-[10px] text-brand-ink-muted mt-1">
                  <span>{tracksComposed} tracks</span>
                  <span>Goal: 25</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-brand-bg p-3 rounded-lg border border-brand-border">
                  <span className="text-[10px] text-brand-ink-muted block">Tracks composed</span>
                  <span className="text-lg font-medium text-brand-gold block mt-0.5">{tracksComposed}</span>
                </div>
                <div className="bg-brand-bg p-3 rounded-lg border border-brand-border">
                  <span className="text-[10px] text-brand-ink-muted block">Saved presets</span>
                  <span className="text-lg font-medium text-brand-gold block mt-0.5">{presetsSaved}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-brand-border pb-3">
                <LogIn className="h-5 w-5 text-brand-gold" />
                <h3 className="font-display text-base text-brand-ink">Account</h3>
              </div>
              <div className="flex flex-col items-center justify-center text-center p-4 bg-brand-bg rounded-xl border border-emerald-500/25 gap-3">
                <div className="bg-emerald-500/10 p-3 border border-emerald-500/30 text-emerald-400 rounded-full">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-[13px] text-brand-ink">Signed in</h4>
                  <p className="text-[11px] text-brand-gold mt-1 max-w-[210px] mx-auto truncate">{currentUser?.email || ""}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
