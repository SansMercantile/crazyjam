import React, { useState, useEffect } from "react";
import {
  Sliders,
  Music,
  Users,
  MessageSquare,
  User,
  ChevronLeft,
  ChevronRight,
  Grid,
  Palette,
  Wand2,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Disc3
} from "lucide-react";
import { AnimatedAvatar } from "./AnimatedAvatar";

// @ts-ignore
import textLogo1 from "../assets/images/text-logo-1.png";
// @ts-ignore
import iconLogo1 from "../assets/images/CrazyJam-Icon-logo-1.png";

type ThemeMode = "light" | "dark" | "system";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  userInfo: { name: string; avatar: string; handle: string } | null;
  onLogout: () => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isExpanded,
  setIsExpanded,
  userInfo,
  onLogout,
  themeMode,
  onThemeModeChange,
}) => {
  const navItems = [
    { id: "create", label: "Create", icon: Wand2 },
    { id: "dashboard", label: "Control Room", icon: Sliders },
    { id: "sequencer", label: "CrazyJam Studio", icon: Music },
    { id: "launchpad", label: "Launchpad", icon: Grid },
    { id: "artwork", label: "Cover Art Studio", icon: Palette },
    { id: "music", label: "CrazyJam Music", icon: Disc3 },
    { id: "agents", label: "Neural Swarm", icon: Users },
    { id: "support", label: "Support", icon: MessageSquare },
    { id: "profile", label: "Creator Profile", icon: User },
  ];

  return (
    <aside
      id="daw-sidebar"
      className={`bg-brand-surface border-r border-brand-border h-screen fixed left-0 top-0 flex flex-col justify-between transition-all duration-300 z-50 ${
        isExpanded ? "w-64" : "w-18"
      }`}
    >
      {/* Top Brand Area */}
      <div className="flex flex-col">
        <div className={`flex items-center justify-between border-b border-brand-border h-[72px] transition-all ${
          isExpanded ? "px-5" : "px-3 relative"
        }`}>
          {/* Logo Area - the white CrazyJam wordmark keeps a soft shadow for contrast; icon mark stays clean */}
          <div className={`flex items-center overflow-hidden transition-all ${isExpanded ? "gap-3" : "w-full justify-center"}`}>
            {isExpanded ? (
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Collapse sidebar"
              >
                <img
                  src={textLogo1}
                  alt="CrazyJam"
                  className="h-7 w-auto object-contain [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.4))]"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div
                className="flex items-center justify-center cursor-pointer w-9 h-9"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Expand sidebar"
              >
                <img
                  src={iconLogo1}
                  alt="CrazyJam"
                  className="h-7 w-7 object-contain"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-brand-ink-muted hover:text-brand-gold transition shrink-0 ${
              isExpanded
                ? "p-1.5 rounded-lg hover:bg-brand-surface-2"
                : "absolute -right-3 top-6 p-1 bg-brand-surface hover:bg-brand-surface-2 border border-brand-border rounded-full"
            }`}
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation - expanded: label only, collapsed: icon only */}
        <nav className="p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`w-full flex items-center ${isExpanded ? "justify-start px-3.5" : "justify-center"} gap-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-brand-gold/10 text-brand-gold"
                    : "text-brand-ink-muted hover:text-brand-ink hover:bg-brand-surface-2"
                }`}
              >
                {isExpanded ? (
                  <span className="truncate">{item.label}</span>
                ) : (
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer: theme toggle, profile, sign out */}
      <div className="flex flex-col border-t border-brand-border p-3 gap-2">
        {/* Theme toggle */}
        {isExpanded ? (
          <div className="flex items-center gap-1 bg-brand-surface-2 rounded-lg p-1">
            {([
              { mode: "light" as ThemeMode, icon: Sun },
              { mode: "dark" as ThemeMode, icon: Moon },
              { mode: "system" as ThemeMode, icon: Monitor },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => onThemeModeChange(mode)}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all ${
                  themeMode === mode ? "bg-brand-gold" : "text-brand-ink-muted hover:text-brand-ink"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => onThemeModeChange(themeMode === "dark" ? "light" : themeMode === "light" ? "system" : "dark")}
            title={`Theme: ${themeMode}`}
            className="flex items-center justify-center p-2 rounded-lg text-brand-ink-muted hover:text-brand-gold hover:bg-brand-surface-2 transition-all"
          >
            {themeMode === "light" ? <Sun className="h-4 w-4" /> : themeMode === "dark" ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </button>
        )}

        {/* Profile + Sign out */}
        {isExpanded ? (
          <div className="flex items-center gap-2.5 p-2 bg-brand-surface-2 rounded-lg">
            <AnimatedAvatar avatar={userInfo?.avatar || "🕵️"} size="sm" className="border-brand-gold/40 shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="text-[12px] font-medium text-brand-ink truncate leading-tight">
                {userInfo?.name || "Independent Producer"}
              </h4>
              <p className="text-[10px] text-brand-ink-muted truncate leading-tight">
                {userInfo?.handle || "@jam_architect"}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="shrink-0 p-1.5 rounded-md text-brand-ink-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative" title={userInfo?.name || "Producer"}>
              <AnimatedAvatar avatar={userInfo?.avatar || "🕵️"} size="sm" className="border border-brand-gold/40" />
              <span className="absolute bottom-[-1px] right-[1px] h-2 w-2 rounded-full bg-emerald-500 border border-brand-surface" />
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-md text-brand-ink-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isExpanded && (
          <div className="pt-1 text-center">
            <span className="text-[9px] text-brand-ink-muted tracking-wide">Sans Mercantile Co.</span>
          </div>
        )}
      </div>
    </aside>
  );
};
