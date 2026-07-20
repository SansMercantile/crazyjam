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
  Music, 
  Sliders, 
  UploadCloud,
  Shuffle,
  Twitter,
  Apple,
  Chrome
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { AnimatedAvatar } from "./AnimatedAvatar";
import { loginAccount, registerAccount, fetchCurrentUser, exchangeAuth0Token, logout as apiLogout, isLoggedIn as hasToken } from "../utils/api";

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [emailForm, setEmailForm] = useState("");
  const [passwordForm, setPasswordForm] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isExchangingSocial, setIsExchangingSocial] = useState(false);

  const {
    loginWithRedirect,
    logout: auth0Logout,
    isAuthenticated: auth0Authenticated,
    isLoading: auth0Loading,
    getIdTokenClaims,
  } = useAuth0();

  const [userData, setUserData] = useState<{
    email: string;
    name: string;
    avatar: string;
    handle: string;
    styleAlign: string;
    tracksComposed: number;
    presetsSaved: number;
  }>({
    email: currentUserEmail || "",
    name: "Independent Producer",
    avatar: "🕵️",
    handle: "@jam_architect",
    styleAlign: "Moody Cyberpunk Synthwave",
    tracksComposed: 0,
    presetsSaved: 0
  });

  const [onboardingStep, setOnboardingStep] = useState(1);
  const [favStyle, setFavStyle] = useState("Lofi");
  const [engineerIntensity, setEngineerIntensity] = useState("Balanced");
  const [inputHandle, setInputHandle] = useState("");
  const [inputName, setInputName] = useState("");
  const [uploadError, setUploadError] = useState("");

  const rollRandomAvatar = () => {
    const AVATARS_POOL = ["🎧", "🎹", "🎙️", "🕵️", "👽", "🎚️", "🎸", "🥁", "⚡", "👾"];
    const randomAvatar = AVATARS_POOL[Math.floor(Math.random() * AVATARS_POOL.length)];
    setUserData(prev => ({ ...prev, avatar: randomAvatar }));
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Format unsupported. Please select an image file (.png, .jpg, .svg, or .webp).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setUploadError("Image is too large. Max size allowed is 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) setUserData(prev => ({ ...prev, avatar: result }));
    };
    reader.onerror = () => setUploadError("Error reading file.");
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (hasToken()) {
        try {
          const me = await fetchCurrentUser();
          const updated = { ...userData, email: me.email, name: me.name, avatar: me.avatar, handle: me.handle, styleAlign: me.styleAlign };
          setUserData(updated);
          setIsLoggedIn(true);
          onUserUpdate({ email: updated.email, name: updated.name, avatar: updated.avatar, handle: updated.handle, theme: updated.styleAlign });
        } catch {
          setIsLoggedIn(false);
        }
      }
    };
    bootstrap();
    const savedOnb = localStorage.getItem("crazyjam_onboarding_completed");
    onOnboardingFinishedChange(savedOnb === "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const exchangeAfterRedirect = async () => {
      if (auth0Authenticated && !hasToken() && !isExchangingSocial) {
        setIsExchangingSocial(true);
        try {
          const claims = await getIdTokenClaims();
          if (claims?.__raw) {
            const user = await exchangeAuth0Token(claims.__raw);
            const updated = { ...userData, email: user.email, name: user.name, avatar: user.avatar, handle: user.handle, styleAlign: user.styleAlign };
            setUserData(updated);
            setIsLoggedIn(true);
            onUserUpdate({ email: updated.email, name: updated.name, avatar: updated.avatar, handle: updated.handle, theme: updated.styleAlign });
          }
        } catch (err: any) {
          setValidationError(err.message || "Social login failed.");
        } finally {
          setIsExchangingSocial(false);
        }
      }
    };
    if (!auth0Loading) exchangeAfterRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth0Authenticated, auth0Loading]);

  const startSocialLogin = (connection: string) => {
    loginWithRedirect({ authorizationParams: { connection } });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.includes("@")) { setValidationError("Please input a valid email address."); return; }
    if (passwordForm.length < 6) { setValidationError("Password must be at least 6 characters."); return; }

    setIsAuthenticating(true);
    setValidationError("");
    try {
      const user = authMode === "login" ? await loginAccount(emailForm, passwordForm) : await registerAccount(emailForm, passwordForm);
      const updated = { ...userData, email: user.email, name: user.name, avatar: user.avatar, handle: user.handle, styleAlign: user.styleAlign };
      setUserData(updated);
      setIsLoggedIn(true);
      onUserUpdate({ email: updated.email, name: updated.name, avatar: updated.avatar, handle: updated.handle, theme: updated.styleAlign });
    } catch (err: any) {
      setValidationError(err.message || "Authentication failed. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignout = () => {
    apiLogout();
    setIsLoggedIn(false);
    localStorage.removeItem("crazyjam_onboarding_completed");
    onOnboardingFinishedChange(false);
    onUserUpdate(null);
    if (auth0Authenticated) auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handleProceedOnboarding = () => {
    if (onboardingStep < 3) {
      setOnboardingStep(prev => prev + 1);
    } else {
      const cleanedHandle = inputHandle.trim();
      const updated = {
        ...userData,
        name: inputName.trim() || userData.name,
        handle: cleanedHandle ? (cleanedHandle.startsWith("@") ? cleanedHandle : `@${cleanedHandle}`) : userData.handle,
        styleAlign: favStyle === "Lofi" ? "Nostalgic 86 Lofi Beats" : favStyle === "Techno" ? "Cinematic Industrial Dark Techno" : "Moody Cyberpunk Synthwave"
      };
      setUserData(updated);
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
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-2 animate-fadeIn" id="artist-profile-panel">
      {!onboardingFinished ? (
        isLoggedIn ? (
        <div className="xl:col-span-12 bg-brand-surface border border-brand-border rounded-2xl p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-brand-border pb-4">
            <div className="bg-brand-gold/10 p-2 rounded-lg text-brand-gold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-brand-ink-muted tracking-wide">Setup wizard</span>
              <h2 className="font-display text-xl text-brand-ink">Artist account setup</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 flex flex-col gap-2.5 border-r border-brand-border pr-4">
              {[
                { n: 1, label: "Sound alignment", desc: "Select musical preference" },
                { n: 2, label: "AI engineer rate", desc: "Configure assist autonomy" },
                { n: 3, label: "Moniker identity", desc: "Set producer tag" },
              ].map((s) => (
                <div key={s.n} className={`p-3.5 rounded-xl border transition-all ${onboardingStep === s.n ? "bg-brand-gold/10 border-brand-gold/30 text-brand-ink" : "bg-brand-surface-2 border-transparent text-brand-ink-muted"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`h-6 w-6 rounded-full text-xs flex items-center justify-center shrink-0 ${onboardingStep === s.n ? "bg-brand-gold text-brand-bg" : "bg-brand-surface-2"}`}>{s.n}</span>
                    <div>
                      <h4 className="text-[13px] font-medium">{s.label}</h4>
                      <p className="text-[11px] text-brand-ink-muted mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="md:col-span-8 flex flex-col gap-5 min-h-[220px] justify-center">
              {onboardingStep === 1 && (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  <div>
                    <h3 className="text-base font-display text-brand-ink">Choose your primary sound focus</h3>
                    <p className="text-[13px] text-brand-ink-muted mt-1">This sets the default musical atmosphere and drum kit presets.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {["Synthwave", "Lofi", "Techno"].map((style) => (
                      <button
                        key={style}
                        onClick={() => setFavStyle(style)}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                          favStyle === style ? "bg-brand-gold/10 border-brand-gold text-brand-gold" : "bg-brand-surface-2 border-brand-border text-brand-ink-muted"
                        }`}
                      >
                        <span className="text-sm font-medium">{style}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  <div>
                    <h3 className="text-base font-display text-brand-ink">Select assist level</h3>
                    <p className="text-[13px] text-brand-ink-muted mt-1">Controls how aggressively the swarm tweaks synthesizer levels automatically.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: "Conservative", desc: "Manual routing with gentle alerts only." },
                      { val: "Balanced", desc: "Automatically optimizes levels instantly." }
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => setEngineerIntensity(item.val)}
                        className={`p-4 rounded-xl border flex flex-col items-start gap-1.5 text-left transition-all ${
                          engineerIntensity === item.val ? "bg-brand-gold/10 border-brand-gold text-brand-ink" : "bg-brand-surface-2 border-brand-border text-brand-ink-muted"
                        }`}
                      >
                        <Sliders className="h-4 w-4" />
                        <span className="text-sm font-medium mt-1">{item.val}</span>
                        <span className="text-[11px] text-brand-ink-muted leading-normal">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="flex flex-col gap-4 animate-fadeIn text-left w-full">
                  <div>
                    <h3 className="text-base font-display text-brand-ink">Set your producer tag</h3>
                    <p className="text-[13px] text-brand-ink-muted mt-1">Pick an avatar or upload your own.</p>
                  </div>

                  {uploadError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] p-2.5 rounded-lg text-center">
                      {uploadError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch w-full">
                    <div className="lg:col-span-5 flex flex-col gap-3 bg-brand-surface-2 p-4 rounded-xl border border-brand-border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-brand-ink-muted">Avatar</span>
                        <button type="button" onClick={rollRandomAvatar} className="flex items-center gap-1 text-[11px] text-brand-gold hover:underline">
                          <Shuffle className="h-3 w-3" /> Shuffle
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0 select-none">
                          <AnimatedAvatar avatar={userData.avatar} size="lg" className="border border-brand-gold/40" />
                          <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-emerald-500 border border-brand-surface" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="flex items-center gap-2 justify-center py-2 px-3 bg-brand-surface hover:bg-brand-border/20 border border-brand-border rounded-lg cursor-pointer text-[12px] text-brand-ink transition-all">
                            <UploadCloud className="h-3.5 w-3.5 text-brand-gold" />
                            <span>Upload photo</span>
                            <input type="file" accept="image/*" onChange={handleAvatarFileUpload} className="hidden" />
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 bg-brand-surface p-1.5 rounded-lg border border-brand-border mt-1">
                        {["🎧", "🎹", "🎙️", "🕵️", "👽", "🎚️", "🎸", "🥁", "⚡", "👾"].map((pres) => (
                          <button
                            key={pres}
                            type="button"
                            onClick={() => setUserData(prev => ({ ...prev, avatar: pres }))}
                            className={`rounded-md p-0.5 flex items-center justify-center border transition-all ${userData.avatar === pres ? "border-brand-gold bg-brand-gold/10" : "border-transparent"}`}
                          >
                            <AnimatedAvatar avatar={pres} size="xs" interactive={false} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-7 flex flex-col justify-center gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-brand-ink-muted">Display name</label>
                        <input
                          type="text" required placeholder="e.g. Alan Walker"
                          value={inputName} onChange={(e) => setInputName(e.target.value)}
                          className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3 py-2 text-sm rounded-lg outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-brand-ink-muted">Producer handle</label>
                        <input
                          type="text" required placeholder="@e.g. DJ_Pulse"
                          value={inputHandle} onChange={(e) => setInputHandle(e.target.value)}
                          className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3 py-2 text-sm rounded-lg outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleProceedOnboarding}
                className="w-fit self-end flex items-center gap-2 bg-brand-gold hover:brightness-110 text-brand-bg px-6 py-2.5 font-semibold text-sm rounded-xl transition-all h-10"
              >
                <span>{onboardingStep === 3 ? "Complete setup & launch studio" : "Continue"}</span>
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        ) : (
          <div className="xl:col-span-12 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-4 max-w-md mx-auto w-full">
            <div className="flex items-center justify-center gap-1 border-b border-brand-border pb-3">
              <button
                onClick={() => { setAuthMode("login"); setValidationError(""); }}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition ${authMode === "login" ? "bg-brand-gold text-brand-bg" : "text-brand-ink-muted"}`}
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthMode("register"); setValidationError(""); }}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition ${authMode === "register" ? "bg-brand-gold text-brand-bg" : "text-brand-ink-muted"}`}
              >
                Create Account
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pb-3 border-b border-brand-border">
              <button onClick={() => startSocialLogin("google-oauth2")} disabled={isExchangingSocial} className="p-2.5 bg-brand-surface-2 hover:bg-brand-border/20 rounded-lg border border-brand-border flex items-center justify-center gap-2 transition-all disabled:opacity-40">
                <Chrome className="h-3.5 w-3.5 text-brand-gold" />
                <span className="text-[12px] font-medium text-brand-ink">Google</span>
              </button>
              <button onClick={() => startSocialLogin("windowslive")} disabled={isExchangingSocial} className="p-2.5 bg-brand-surface-2 hover:bg-brand-border/20 rounded-lg border border-brand-border flex items-center justify-center gap-2 transition-all disabled:opacity-40">
                <Mail className="h-3.5 w-3.5 text-brand-gold" />
                <span className="text-[12px] font-medium text-brand-ink">Microsoft</span>
              </button>
              <button onClick={() => startSocialLogin("twitter")} disabled={isExchangingSocial} className="p-2.5 bg-brand-surface-2 hover:bg-brand-border/20 rounded-lg border border-brand-border flex items-center justify-center gap-2 transition-all disabled:opacity-40">
                <Twitter className="h-3.5 w-3.5 text-brand-gold" />
                <span className="text-[12px] font-medium text-brand-ink">X</span>
              </button>
              <button onClick={() => startSocialLogin("apple")} disabled={isExchangingSocial} className="p-2.5 bg-brand-surface-2 hover:bg-brand-border/20 rounded-lg border border-brand-border flex items-center justify-center gap-2 transition-all disabled:opacity-40">
                <Apple className="h-3.5 w-3.5 text-brand-gold" />
                <span className="text-[12px] font-medium text-brand-ink">Apple</span>
              </button>
            </div>
            {isExchangingSocial && <p className="text-[11px] text-brand-gold text-center -mt-1">Completing sign-in...</p>}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
              <input
                type="email" required placeholder="Email address" value={emailForm}
                onChange={(e) => setEmailForm(e.target.value)}
                className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3.5 py-2.5 text-sm rounded-lg outline-none"
              />
              <input
                type="password" required placeholder="Password (min 6 characters)" value={passwordForm}
                onChange={(e) => setPasswordForm(e.target.value)}
                className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3.5 py-2.5 text-sm rounded-lg outline-none"
              />
              {validationError && <p className="text-[11px] text-red-400 text-center">{validationError}</p>}
              <button
                type="submit"
                disabled={isAuthenticating || !emailForm || !passwordForm}
                className="w-full h-10 bg-brand-gold hover:brightness-110 rounded-lg text-brand-bg font-semibold text-sm transition-all flex items-center justify-center disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <span className="h-4 w-4 rounded-full border-2 border-brand-bg border-t-transparent animate-spin" />
                ) : (
                  <span>{authMode === "login" ? "Log In" : "Create Account"}</span>
                )}
              </button>
            </form>
          </div>
        )
      ) : (
        <>
          <div className="xl:col-span-7 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center gap-2 text-brand-gold">
                <User className="h-4 w-4" />
                <h2 className="font-display text-base text-brand-ink">Artist profile</h2>
              </div>
              <button
                onClick={handleResetOnboarding}
                className="px-2.5 py-1 rounded-md text-[11px] bg-brand-surface-2 hover:bg-brand-gold hover:text-brand-bg text-brand-ink-muted border border-brand-border transition-all"
              >
                Setup wizard
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 bg-brand-surface-2 p-4 rounded-xl border border-brand-border">
              <div className="relative shrink-0 select-none">
                <AnimatedAvatar avatar={userData.avatar} size="lg" className="border border-brand-gold/40" />
                <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-emerald-500 border border-brand-surface" />
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-base font-display text-brand-ink truncate">{userData.name}</h3>
                  <span className="text-[10px] text-brand-gold bg-brand-gold/10 px-1.5 py-0.5 rounded border border-brand-gold/30">Pro</span>
                </div>
                <p className="text-[13px] text-brand-gold mt-0.5">{userData.handle}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2.5 text-[11px] text-brand-ink-muted">
                  <div className="flex items-center gap-1"><Music className="h-3.5 w-3.5" /> {userData.tracksComposed} tracks</div>
                  <div className="flex items-center gap-1"><Sliders className="h-3.5 w-3.5" /> {userData.presetsSaved} presets</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-brand-bg p-3 rounded-lg border border-brand-border text-left">
                <span className="text-[10px] text-brand-ink-muted block">Style alignment</span>
                <span className="text-[13px] text-brand-ink block mt-1">{userData.styleAlign}</span>
              </div>
              <div className="bg-brand-bg p-3 rounded-lg border border-brand-border text-left">
                <span className="text-[10px] text-brand-ink-muted block">Email</span>
                <span className="text-[13px] text-brand-ink-muted block truncate mt-1">{userData.email}</span>
              </div>
            </div>
          </div>

          <div className="xl:col-span-5 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center gap-2 text-brand-gold">
                <LogIn className="h-4 w-4" />
                <h2 className="font-display text-base text-brand-ink">Account</h2>
              </div>
              <button
                onClick={handleSignout}
                className="px-2.5 py-1 rounded-md text-[11px] bg-brand-surface-2 hover:bg-red-500/10 hover:text-red-400 text-brand-ink-muted border border-brand-border transition-all flex items-center gap-1"
              >
                <LogOut className="h-3 w-3" /> Sign Out
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-brand-bg rounded-xl border border-emerald-500/20 gap-3">
              <div className="bg-emerald-500/10 p-3.5 border border-emerald-500/30 text-emerald-400 rounded-full">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-[13px] text-brand-ink">Signed in</h4>
                <p className="text-[11px] text-brand-ink-muted mt-1 max-w-[240px] mx-auto">
                  Authenticated as <strong className="text-brand-ink">{userData.email}</strong>.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
