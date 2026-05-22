import React, { useState, useEffect } from "react";
import {
  Sliders,
  Music,
  Users,
  MessageSquare,
  User,
  ChevronLeft,
  ChevronRight,
  Grid 
} from "lucide-react";
import { AnimatedAvatar } from "./AnimatedAvatar";

// Import local images from assets location
// @ts-ignore
import textLogo1 from "../assets/images/text-logo-1.png";
// @ts-ignore
import textLogo2 from "../assets/images/text-logo-2.png";
// @ts-ignore
import textLogo3 from "../assets/images/text-logo-3.png";
// @ts-ignore
import iconLogo1 from "../assets/images/CrazyJam-Icon-logo-1.png";
// @ts-ignore
import iconLogo2 from "../assets/images/CrazyJam-Icon-logo-2.png";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  userInfo: { name: string; avatar: string; handle: string } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isExpanded,
  setIsExpanded,
  userInfo,
}) => {
  // Logo indexes - 5 minute rotation
  const [textLogoIdx, setTextLogoIdx] = useState(0); 
  const [iconLogoIdx, setIconLogoIdx] = useState(0); 
  const [timeLeft, setTimeLeft] = useState(300); 

  const textLogos = [textLogo1, textLogo2, textLogo3];
  const iconLogos = [iconLogo1, iconLogo2];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTextLogoIdx((prevIdx) => (prevIdx + 1) % 3);
          setIconLogoIdx((prevIdx) => (prevIdx + 1) % 2);
          return 300; 
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Sync document favicon dynamically when active icon logo changes
  useEffect(() => {
    const currentLogo = iconLogos[iconLogoIdx];
    if (currentLogo) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "shortcut icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = currentLogo;
    }
  }, [iconLogoIdx]);

  const triggerManualCycle = () => {
    setTextLogoIdx((prev) => (prev + 1) % 3);
    setIconLogoIdx((prev) => (prev + 1) % 2);
    setTimeLeft(300); 
  };

  const navItems = [
    { id: "dashboard", label: "Control Room", icon: Sliders, color: "text-brand-pink" },
    { id: "sequencer", label: "Modular Arranger", icon: Music, color: "text-brand-cyan" },
    { id: "launchpad", label: "Launchpad Grid", icon: Grid, color: "text-rose-400" },
    { id: "agents", label: "Neural Swarm", icon: Users, color: "text-purple-400" },
    { id: "support", label: "Audio & Hum Support", icon: MessageSquare, color: "text-yellow-400" },
    { id: "profile", label: "Creator Profile", icon: User, color: "text-emerald-400" },
  ];

  return (
    <aside
      id="daw-sidebar"
      className={`bg-[#14141d]/50 backdrop-blur-xl border-r border-white/10 h-screen fixed left-0 top-0 flex flex-col justify-between transition-all duration-300 z-50 shadow-xl ${
        isExpanded ? "w-64" : "w-18"
      }`}
    >
      {/* Top Brand Area */}
      <div className="flex flex-col">
        <div className={`flex items-center justify-between border-b border-white/5 bg-black/20 h-20 transition-all ${
          isExpanded ? "p-4" : "p-3 relative"
        }`}>
          {/* Logo Area */}
          <div className={`flex items-center overflow-hidden transition-all ${isExpanded ? "gap-3" : "w-full justify-center"}`}>
            {isExpanded ? (
              <div 
                className="flex flex-col items-start cursor-pointer group"
                onClick={() => {
                  triggerManualCycle();
                  setIsExpanded(!isExpanded);
                }}
                title="Click to alternate logos and collapse sidebar"
              >
                <img
                  src={textLogos[textLogoIdx]}
                  alt="CrazyJam Text Logo"
                  className="h-10 w-auto object-contain transition-all duration-300 transform-gpu [will-change:filter] group-hover:scale-105 [filter:drop-shadow(0_0_6px_rgba(255,0,128,0.35))] group-hover:[filter:drop-shadow(0_0_16px_rgba(255,0,128,0.8))]"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallbackEl = document.getElementById("text-logo-fallback");
                    if (fallbackEl) fallbackEl.classList.remove("hidden");
                  }}
                  referrerPolicy="no-referrer"
                />
                <span id="text-logo-fallback" className="hidden font-display font-black text-sm uppercase tracking-wide bg-gradient-to-r from-brand-pink to-brand-cyan bg-clip-text text-transparent">
                  CrazyJam DAW
                </span>
              </div>
            ) : (
              <div 
                className="flex flex-col items-center justify-center cursor-pointer group w-11 h-11"
                onClick={() => {
                  triggerManualCycle();
                  setIsExpanded(!isExpanded);
                }}
                title="Click to alternate logos and expand sidebar"
              >
                <img
                  src={iconLogos[iconLogoIdx]}
                  alt="CrazyJam Icon Logo"
                  className="h-9 w-9 object-contain transition-all duration-300 transform-gpu [will-change:filter] group-hover:rotate-12 group-hover:scale-110 [filter:drop-shadow(0_0_6px_rgba(0,255,255,0.4))] group-hover:[filter:drop-shadow(0_0_16px_rgba(0,255,255,0.85))]"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallbackEl = document.getElementById("icon-logo-fallback");
                    if (fallbackEl) fallbackEl.classList.remove("hidden");
                  }}
                  referrerPolicy="no-referrer"
                />
                <div id="icon-logo-fallback" className="hidden h-8 w-8 rounded-lg bg-gradient-to-br from-brand-pink to-brand-cyan items-center justify-center font-display font-black text-xs text-brand-dark">
                  CJ
                </div>
              </div>
            )}
          </div>

          {/* Toggle Expand Bar */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-white/40 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition shrink-0 ${
              isExpanded 
                ? "p-1.5 ml-1 rounded-lg" 
                : "absolute -right-3 top-7 p-1 bg-brand-dark hover:bg-white/10 z-50 border border-white/20 shadow-lg rounded-full"
            }`}
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-display font-black tracking-wider uppercase transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-white/[0.08] to-transparent text-white border-l-4 border-brand-pink"
                    : "text-white/50 hover:text-white/90 hover:bg-white/[0.03]"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? item.color : "text-white/40"}`} />
                {isExpanded && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Combined Utility and Corporate Footer Container */}
      <div className="flex flex-col border-t border-white/5 bg-black/15 p-3 font-mono">
        {/* Profile Preview Block */}
        <div className="pb-2 select-none text-left">
          {isExpanded ? (
            <div className="flex items-center gap-3 p-2 bg-white/5 border border-white/5 rounded-xl">
              <AnimatedAvatar avatar={userInfo?.avatar || "🕵️"} size="sm" className="border-brand-cyan shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-black font-display text-white truncate uppercase tracking-wide leading-none mb-0.5">
                  {userInfo?.name || "Independent Pro"}
                </h4>
                <p className="text-[9px] font-mono font-bold text-brand-cyan truncate leading-none">
                  {userInfo?.handle || "@jam_architect"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center relative select-none" title={`${userInfo?.name || 'Producer'} is online`}>
              <AnimatedAvatar avatar={userInfo?.avatar || "🕵️"} size="sm" className="border border-brand-cyan" />
              <span className="absolute bottom-[-1px] right-[1px] h-2.5 w-2.5 rounded-full bg-emerald-500 border border-brand-dark" />
            </div>
          )}
        </div>

        {/* Corporate Branding Footer Anchor */}
        {isExpanded ? (
          <div className="border-t border-white/5 pt-3 text-[9px] text-zinc-600 font-semibold space-y-0.5 text-center">
            <div>SANS MERCANTILE CO.</div>
            <div className="tracking-wider">REIMAGINE &bull; REBUILD &bull; TRANSCEND</div>
          </div>
        ) : (
          <div className="border-t border-white/5 pt-2 text-[8px] font-black text-zinc-600 text-center select-none" title="Sans Mercantile Accounts">
            S·M
          </div>
        )}
      </div>
    </aside>
  );
};