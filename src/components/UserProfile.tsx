/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  User, 
  LogIn, 
  LogOut, 
  Sparkles, 
  Mail, 
  ShieldCheck, 
  Users, 
  Music, 
  Sliders, 
  Cpu, 
  HelpCircle, 
  Wand2,
  Check,
  Disc,
  Chrome,
  UploadCloud,
  Shuffle
} from "lucide-react";
import { AnimatedAvatar } from "./AnimatedAvatar";

interface UserProfileProps {
  currentUserEmail: string | undefined;
  onUserUpdate: (userInfo: { email: string; name: string; avatar: string; handle: string; theme: string } | null) => void;
  onboardingFinished: boolean;
  onOnboardingFinishedChange: (state: boolean) => void;
}

export function UserProfile({
  currentUserEmail,
  onUserUpdate,
  onboardingFinished,
  onOnboardingFinishedChange
}: UserProfileProps) {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMethod, setAuthMethod] = useState<"gmail" | "microsoft" | "email" | null>(null);
  const [emailForm, setEmailForm] = useState("");
  const [passwordForm, setPasswordForm] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [validationError, setValidationError] = useState("");

  // User Profile States
  const [userData, setUserData] = useState<{
    email: string;
    name: string;
    avatar: string;
    handle: string;
    styleAlign: string;
    tracksComposed: number;
    presetsSaved: number;
  }>({
    email: currentUserEmail || "hello@sansmercantile.com",
    name: "Independent Producer",
    avatar: "🕵️",
    handle: "@jam_architect",
    styleAlign: "Moody Cyberpunk Synthwave",
    tracksComposed: 12,
    presetsSaved: 4
  });

  // Onboarding Wizard States
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [favStyle, setFavStyle] = useState("Lofi");
  const [engineerIntensity, setEngineerIntensity] = useState("Balanced");
  const [inputHandle, setInputHandle] = useState("");
  const [inputName, setInputName] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Shuffle random avatar helper
  const rollRandomAvatar = () => {
    const AVATARS_POOL = ["🎧", "🎹", "🎙️", "🕵️", "👽", "🎚️", "🎸", "🥁", "⚡", "👾"];
    const randomAvatar = AVATARS_POOL[Math.floor(Math.random() * AVATARS_POOL.length)];
    setUserData(prev => ({ ...prev, avatar: randomAvatar }));
  };

  // Upload avatar from local files
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Format unsupported. Please select an image file (.png, .jpg, .svg, or .webp).");
      return;
    }

    // Limit size to 4MB just to avoid giant laggy storage strings
    if (file.size > 4 * 1024 * 1024) {
      setUploadError("Image is too large. Max size allowed is 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setUserData(prev => ({ ...prev, avatar: result }));
      }
    };
    reader.onerror = () => {
      setUploadError("Error reading file.");
    };
    reader.readAsDataURL(file);
  };

  // Load from LocalStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("crazyjam_user_profile");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUserData(parsed);
      setIsLoggedIn(true);
    } else {
      // Check metadata email and assign default random avatar on first mount
      const AVATARS_POOL = ["🎧", "🎹", "🎙️", "🕵️", "👽", "🎚️", "🎸", "🥁", "⚡", "👾"];
      const randomAvatar = AVATARS_POOL[Math.floor(Math.random() * AVATARS_POOL.length)];
      if (currentUserEmail) {
        const prefilled = {
          ...userData,
          email: currentUserEmail,
          name: currentUserEmail.split("@")[0].toUpperCase(),
          handle: `@${currentUserEmail.split("@")[0]}`,
          avatar: randomAvatar
        };
        setUserData(prefilled);
        setInputName(prefilled.name);
        setInputHandle(prefilled.handle);
      } else {
        const prefilled = {
          ...userData,
          avatar: randomAvatar
        };
        setUserData(prefilled);
        setInputName(prefilled.name);
        setInputHandle(prefilled.handle);
      }
    }

    const savedOnb = localStorage.getItem("crazyjam_onboarding_completed");
    if (savedOnb === "true") {
      onOnboardingFinishedChange(true);
    } else {
      onOnboardingFinishedChange(false);
    }
  }, [currentUserEmail]);

  // Auth simulators
  const startSSO = (provider: "gmail" | "microsoft") => {
    setIsAuthenticating(true);
    setValidationError("");
    setAuthMethod(provider);

    setTimeout(() => {
      const mockMail = provider === "gmail" 
        ? (currentUserEmail || "artist.pulse@gmail.com") 
        : "studio.lead@outlook.com";
      const mockName = provider === "gmail" ? "Pulse Producer (Google)" : "Active Wave (Microsoft)";
      const mockHandle = provider === "gmail" ? "@pulse_google" : "@wave_outlook";

      const updated = {
        ...userData,
        email: mockMail,
        name: mockName,
        handle: mockHandle,
        avatar: provider === "gmail" ? "👽" : "🎹"
      };

      setUserData(updated);
      setIsLoggedIn(true);
      setIsAuthenticating(false);
      localStorage.setItem("crazyjam_user_profile", JSON.stringify(updated));
      onUserUpdate({ email: updated.email, name: updated.name, avatar: updated.avatar, handle: updated.handle, theme: updated.styleAlign });
    }, 1500);
  };

  const handleEmailLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.includes("@")) {
      setValidationError("Please input a valid email address.");
      return;
    }
    if (passwordForm.length < 5) {
      setValidationError("Password must contain at least 5 alphanumeric characters.");
      return;
    }

    setIsAuthenticating(true);
    setValidationError("");
    setAuthMethod("email");

    setTimeout(() => {
      const updated = {
        ...userData,
        email: emailForm,
        name: emailForm.split("@")[0].toUpperCase(),
        handle: `@${emailForm.split("@")[0]}`
      };
      setUserData(updated);
      setIsLoggedIn(true);
      setIsAuthenticating(false);
      localStorage.setItem("crazyjam_user_profile", JSON.stringify(updated));
      onUserUpdate({ email: updated.email, name: updated.name, avatar: updated.avatar, handle: updated.handle, theme: updated.styleAlign });
    }, 1200);
  };

  const handleSignout = () => {
    setIsLoggedIn(false);
    setAuthMethod(null);
    localStorage.removeItem("crazyjam_user_profile");
    onUserUpdate(null);
  };

  // Onboarding handlers
  const handleProceedOnboarding = () => {
    if (onboardingStep < 3) {
      setOnboardingStep(prev => prev + 1);
    } else {
      // Completed last step! Save all state.
      const cleanedHandle = inputHandle.trim();
      const updated = {
        ...userData,
        name: inputName.trim() || userData.name,
        handle: cleanedHandle ? (cleanedHandle.startsWith("@") ? cleanedHandle : `@${cleanedHandle}`) : userData.handle,
        styleAlign: favStyle === "Lofi" ? "Nostalgic 86 Lofi Beats" : favStyle === "Techno" ? "Cinematic Industrial Dark Techno" : "Moody Cyberpunk Synthwave"
      };
      setUserData(updated);
      localStorage.setItem("crazyjam_user_profile", JSON.stringify(updated));
      localStorage.setItem("crazyjam_onboarding_completed", "true");
      onUserUpdate({ email: updated.email, name: updated.name, avatar: updated.avatar, handle: updated.handle, theme: updated.styleAlign });
      onOnboardingFinishedChange(true);
    }
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem("crazyjam_onboarding_completed");
    onOnboardingFinishedChange(false);
    setOnboardingStep(1);
    setInputName(userData.name);
    setInputHandle(userData.handle);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6 animate-fadeIn" id="artist-profile-panel">
      {/* ONBOARDING PANEL */}
      {!onboardingFinished ? (
        <div className="xl:col-span-12 bg-gradient-to-br from-brand-card to-brand-dark border-2 border-brand-pink/30 rounded-[32px] p-8 flex flex-col gap-6 relative overflow-hidden" style={{ boxShadow: "0 0 30px rgba(255,0,255,0.1)" }}>
          {/* background glowing ambient vector lights */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-pink/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-cyan/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="bg-brand-pink/15 p-2 rounded-xl border border-brand-pink/30 text-brand-pink animate-pulse">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#e59632] font-black">CrazyJam Studio setup wizard</span>
              <h2 className="font-display font-black text-xl tracking-wide uppercase text-white">Artist Account Setup & Onboarding</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Steps Left Bar */}
            <div className="md:col-span-4 flex flex-col gap-3.5 border-r border-white/5 pr-4">
              <div className={`p-4 rounded-2xl border transition-all ${onboardingStep === 1 ? "bg-brand-pink/10 border-brand-pink/30 text-white" : "bg-white/5 border-transparent text-white/40"}`}>
                <div className="flex items-center gap-3">
                  <span className={`h-6 w-6 rounded-full font-mono font-bold text-xs flex items-center justify-center ${onboardingStep === 1 ? "bg-brand-pink text-white" : "bg-white/10"}`}>1</span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide">Sound Alignment</h4>
                    <p className="text-[9px] font-mono font-medium mt-0.5">Select musical preference</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${onboardingStep === 2 ? "bg-brand-pink/10 border-brand-pink/30 text-white" : "bg-white/5 border-transparent text-white/40"}`}>
                <div className="flex items-center gap-3">
                  <span className={`h-6 w-6 rounded-full font-mono font-bold text-xs flex items-center justify-center ${onboardingStep === 2 ? "bg-brand-pink text-white" : "bg-white/10"}`}>2</span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide">AI Engineer Rate</h4>
                    <p className="text-[9px] font-mono font-medium mt-0.5">Configure assist autonomy</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${onboardingStep === 3 ? "bg-brand-pink/10 border-brand-pink/30 text-white" : "bg-white/5 border-transparent text-white/40"}`}>
                <div className="flex items-center gap-3">
                  <span className={`h-6 w-6 rounded-full font-mono font-bold text-xs flex items-center justify-center ${onboardingStep === 3 ? "bg-brand-pink text-white" : "bg-white/10"}`}>3</span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide">Moniker Identity</h4>
                    <p className="text-[9px] font-mono font-medium mt-0.5">Set producer tag</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps Content Center */}
            <div className="md:col-span-8 flex flex-col gap-5 min-h-[220px] justify-center">
              {onboardingStep === 1 && (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">Choose Your Primary Synthesizer Sound Focus</h3>
                    <p className="text-xs text-white/50 mt-1">This sets the default musical atmosphere and drum kit presets generated by our neural agents.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {["Synthwave", "Lofi", "Techno"].map((style) => (
                      <button
                        key={style}
                        onClick={() => setFavStyle(style)}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102 ${
                          favStyle === style ? "bg-brand-cyan/10 border-brand-cyan text-brand-cyan" : "bg-white/5 border-white/5 text-white/60"
                        }`}
                      >
                        <Disc className="h-6 w-6" />
                        <span className="text-xs font-bold uppercase">{style}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">Select Master Sound Engineer Assisting Level</h3>
                    <p className="text-xs text-white/50 mt-1">Controls how aggressively the neural swarm tweaks synthesizer cutoff and release levels automatically during playback.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { val: "Conservative", desc: "Allows maximum manual routing with gentle level alerts only." },
                      { val: "Balanced", desc: "Automatically optimizes transient and master limiter levels instantly." }
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => setEngineerIntensity(item.val)}
                        className={`p-4 rounded-xl border flex flex-col items-start gap-1.5 text-left cursor-pointer transition-all hover:scale-102 ${
                          engineerIntensity === item.val ? "bg-brand-pink/10 border-brand-pink text-brand-pink" : "bg-white/5 border-white/5 text-white/60"
                        }`}
                      >
                        <Sliders className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase mt-1">{item.val} Engineer Assistance</span>
                        <span className="text-[10px] text-white/40 leading-normal">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="flex flex-col gap-4 animate-fadeIn text-left w-full">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">Set Your Producer Tag & Profile Moniker</h3>
                    <p className="text-xs text-white/50 mt-1">Select your active neural vector avatar or upload a custom studio photo below.</p>
                  </div>

                  {/* Upload error display */}
                  {uploadError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-2.5 rounded-xl text-center font-mono font-bold">
                      {uploadError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch w-full">
                    {/* Left: Avatar Management (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-3.5 bg-black/30 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-white/40 block uppercase tracking-wider font-bold">Studio Representer</span>
                        <button
                          type="button"
                          onClick={rollRandomAvatar}
                          className="flex items-center gap-1 text-[8px] font-mono font-bold text-brand-cyan bg-brand-cyan/10 hover:bg-brand-cyan/20 px-2 py-1 rounded border border-brand-cyan/20 cursor-pointer transition-all uppercase"
                        >
                          <Shuffle className="h-3 w-3" />
                          <span>Shuffle</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Active Avatar Preview */}
                        <div className="relative group shrink-0 select-none">
                          <AnimatedAvatar avatar={userData.avatar} size="lg" className="border-2 border-brand-cyan shadow-md shadow-brand-cyan/10" />
                          <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border border-brand-dark animate-pulse" />
                        </div>

                        {/* Local Upload Interaction */}
                        <div className="flex-1 space-y-2">
                          <label className="text-[10px] text-white/60 leading-tight block">Upload user profile picture (.png, .jpg, etc.):</label>
                          <label className="flex items-center gap-2 justify-center py-2 px-3 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-brand-pink/40 rounded-xl cursor-pointer text-xs font-mono font-bold text-white transition-all text-center">
                            <UploadCloud className="h-4 w-4 text-brand-pink animate-pulse" />
                            <span>Select Local File</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Selectable Presets */}
                      <div className="space-y-1 mt-1">
                        <span className="text-[8px] font-mono text-white/35 block uppercase font-bold">Or Select Animated Preset:</span>
                        <div className="grid grid-cols-5 gap-1.5 bg-black/25 p-1.5 rounded-xl border border-white/5">
                          {["🎧", "🎹", "🎙️", "🕵️", "👽", "🎚️", "🎸", "🥁", "⚡", "👾"].map((pres) => (
                            <button
                              key={pres}
                              type="button"
                              onClick={() => setUserData(prev => ({ ...prev, avatar: pres }))}
                              className={`rounded-lg p-0.5 flex items-center justify-center border transition-all hover:bg-white/5 hover:scale-105 cursor-pointer ${
                                userData.avatar === pres 
                                  ? "border-brand-cyan bg-brand-cyan/10" 
                                  : "border-transparent"
                              }`}
                            >
                              <AnimatedAvatar avatar={pres} size="xs" interactive={false} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Input Credentials (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col justify-center gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-white/40 block uppercase tracking-wider font-bold">Display Profile Moniker</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Alan Walker"
                          value={inputName}
                          onChange={(e) => setInputName(e.target.value)}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-brand-pink/50 text-white pl-4 pr-4 py-2 text-xs rounded-xl outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-white/40 block uppercase tracking-wider font-bold font-mono">Producer Handle</label>
                        <input
                          type="text"
                          required
                          placeholder="@e.g. DJ_Pulse"
                          value={inputHandle}
                          onChange={(e) => setInputHandle(e.target.value)}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-brand-pink/50 text-white pl-4 pr-4 py-2 text-xs rounded-xl outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation button */}
              <button
                onClick={handleProceedOnboarding}
                className="w-fit self-end flex items-center gap-1 bg-[#e59632] hover:scale-105 text-brand-dark px-6 py-2.5 font-black text-xs uppercase tracking-widest rounded-xl transition-all h-10 cursor-pointer"
              >
                <span>{onboardingStep === 3 ? "Complete Setup & Launch Studio" : "Proceed to next level"}</span>
                <Sparkles className="h-4 w-4 fill-current" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ALREADY ONBOARDED: DISPLAY NORMAL AUTHENTICATION & PROFILE DUAL CARDS */
        <>
          {/* USER PROFILE INFO BOX (LEFT) */}
          <div className="xl:col-span-7 bg-brand-card border border-white/10 rounded-[32px] p-6 flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-brand-cyan">
                <User className="h-4.5 w-4.5" />
                <h2 className="font-display font-black text-sm tracking-widest uppercase text-white">
                  Active Artist Studio Profile
                </h2>
              </div>
              <button
                onClick={handleResetOnboarding}
                className="px-2.5 py-1 rounded text-[8px] font-mono font-bold bg-white/5 hover:bg-brand-pink hover:text-white text-white/50 border border-white/10 uppercase tracking-widest cursor-pointer transition-all"
                title="Reset Workspace Preferences"
              >
                Onboarding Setup Wizard
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner">
              {/* Profile image vector */}
              <div className="relative shrink-0 select-none">
                <AnimatedAvatar avatar={userData.avatar} size="lg" className="border-2 border-brand-cyan" />
                <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border border-brand-dark animate-ping" />
                <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border border-brand-dark" />
              </div>

              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="font-black text-base text-white font-display truncate">{userData.name}</h3>
                  <span className="text-[9px] font-mono font-black uppercase text-brand-cyan bg-brand-cyan/10 px-1.5 py-0.5 rounded border border-brand-cyan/30">
                    Neural Pro Artist
                  </span>
                </div>
                <p className="text-xs text-brand-pink font-mono mt-0.5 font-bold">{userData.handle}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2.5 text-[10px] uppercase font-mono text-white/40">
                  <div className="flex items-center gap-1 text-white/70">
                    <Music className="h-3.5 w-3.5 text-brand-cyan" /> <span>Composed: <strong>{userData.tracksComposed}</strong> tracks</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/70">
                    <Sliders className="h-3.5 w-3.5 text-brand-pink" /> <span>Synced: <strong>{userData.presetsSaved}</strong> presets</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile specifications */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-dark p-3 rounded-xl border border-white/5 text-left">
                <span className="text-[8px] text-white/30 font-mono font-bold uppercase tracking-widest block">System Synthesis alignment</span>
                <span className="text-xs font-bold text-white uppercase block mt-1">{userData.styleAlign}</span>
              </div>
              <div className="bg-brand-dark p-3 rounded-xl border border-white/5 text-left">
                <span className="text-[8px] text-white/30 font-mono font-bold uppercase tracking-widest block">Core Connected Mailbox</span>
                <span className="text-xs font-mono text-white/75 block truncate mt-1">{userData.email}</span>
              </div>
            </div>
          </div>

          {/* GMAIL, MICROSOFT SSO AND EMAIL CREDENTIALS (RIGHT) */}
          <div className="xl:col-span-5 bg-brand-card border border-white/10 rounded-[32px] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-brand-pink">
                <LogIn className="h-4.5 w-4.5" />
                <h2 className="font-display font-black text-sm tracking-widest uppercase text-white">
                  OAuth SSO & Email Credentials Lock
                </h2>
              </div>
              {isLoggedIn && (
                <button
                  onClick={handleSignout}
                  className="px-2.5 py-1 rounded text-[8px] font-mono font-bold bg-white/5 hover:bg-red-600 text-white border border-white/10 uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>

            {!isLoggedIn ? (
              <div className="flex-1 flex flex-col gap-4 justify-between h-full">
                {/* Single Sign On OAuth providers */}
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-white/5">
                  <button
                    onClick={() => startSSO("gmail")}
                    disabled={isAuthenticating}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102"
                  >
                    <Chrome className="h-4 w-4 text-brand-pink" />
                    <span className="text-xs font-bold uppercase tracking-wide text-white">Gmail Access</span>
                  </button>

                  <button
                    onClick={() => startSSO("microsoft")}
                    disabled={isAuthenticating}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102"
                  >
                    <Mail className="h-4 w-4 text-brand-cyan" />
                    <span className="text-xs font-bold uppercase tracking-wide text-white">Microsoft SSO</span>
                  </button>
                </div>

                {/* Ordinary login form */}
                <form onSubmit={handleEmailLoginSubmit} className="flex flex-col gap-3.5">
                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Ordinary Email Address"
                      value={emailForm}
                      onChange={(e) => setEmailForm(e.target.value)}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-brand-pink/50 text-white pl-4 pr-4 py-2.5 text-xs rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      placeholder="Access Key / Lock Phrase"
                      value={passwordForm}
                      onChange={(e) => setPasswordForm(e.target.value)}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-brand-pink/50 text-white pl-4 pr-4 py-2.5 text-xs rounded-xl outline-none"
                    />
                  </div>

                  {validationError && (
                    <p className="text-[10px] font-mono text-red-400 text-center font-bold">
                      {validationError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthenticating || !emailForm || !passwordForm}
                    className="w-full h-10 cursor-pointer bg-gradient-to-r from-brand-purple to-brand-pink rounded-xl text-white font-black text-xs uppercase tracking-widest border-t border-white/20 hover:scale-102 transition-all flex items-center justify-center"
                  >
                    <span>Log In via Email Credentials</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-brand-dark rounded-2xl border border-emerald-500/20 shadow-neon-cyan animate-fadeIn gap-3">
                {isAuthenticating ? (
                  <div className="flex flex-col items-center gap-3">
                    <span className="h-7 w-7 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
                    <p className="text-xs text-white/50 font-mono">Verifying OAuth tokens in progress...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-emerald-500/10 p-4 border border-emerald-500/30 text-emerald-400 rounded-full">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white leading-normal">Credential Tokens Verified</h4>
                      <p className="text-[9px] font-mono text-white/40 mt-1 max-w-[240px] leading-normal mx-auto">
                        Authenticated as <strong className="text-white/70">{userData.email}</strong>. Session is verified securely.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
