/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ServiceAgent, AgentLog } from "../types";
import { Users, Bot, Sliders, Shield, MessageSquare, Flame, Plus, Trash2, X, Sparkles } from "lucide-react";
import { AnimatedAvatar } from "./AnimatedAvatar";

interface AgentControlProps {
  agents: ServiceAgent[];
  onToggleAgent: (id: string) => void;
  onAgencyChange: (id: string, val: number) => void;
  onBiasChange: (id: string, val: number) => void;
  logs: AgentLog[];
  onAddAgent?: (agent: ServiceAgent) => void;
  onRemoveAgent?: (id: string) => void;
}

const PRESET_EMOJIS = ["🤖", "🕵️", "🎧", "🎹", "🎚️", "⚙️", "🔥", "🔮", "👽", "👾", "✨", "🌟"];
const PRESET_ROLES = [
  { val: "A&R", label: "A&R / Concept Analyst" },
  { val: "Groove", label: "Beats / Rhythm Synthesizer" },
  { val: "Harmonics", label: "Melody & Chords Planner" },
  { val: "Mastering", label: "EQ & Limiter Coordinator" },
  { val: "Sound Design", label: "Oscillator Node Expert" }
];

export function AgentControl({
  agents,
  onToggleAgent,
  onAgencyChange,
  onBiasChange,
  logs,
  onAddAgent,
  onRemoveAgent,
}: AgentControlProps) {
  const [showForm, setShowForm] = useState<boolean>(false);
  const [agentName, setAgentName] = useState<string>("");
  const [agentRole, setAgentRole] = useState<string>("Sound Design");
  const [agentSpecialty, setAgentSpecialty] = useState<string>("");
  const [agentDesc, setAgentDesc] = useState<string>("");
  const [agentAvatar, setAgentAvatar] = useState<string>("🤖");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !onAddAgent) return;

    const newAgent: ServiceAgent = {
      id: `custom-${Date.now()}`,
      name: agentName,
      role: agentRole,
      description: agentDesc || `Custom swarm specialist tasked with refining ${agentSpecialty || "synthesis properties"}`,
      avatar: agentAvatar,
      type: "genre",
      enabled: true,
      agencyLevel: 80,
      biasValue: 5,
      specialty: agentSpecialty || "Modular Synthesis Modulation"
    };

    onAddAgent(newAgent);
    
    // Reset Form
    setAgentName("");
    setAgentSpecialty("");
    setAgentDesc("");
    setShowForm(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5" id="agent-cluster">
      {/* List of Swarm Agents */}
      <div className="xl:col-span-7 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-brand-border pb-4">
          <div className="flex items-center gap-2 text-brand-gold">
            <Users className="h-4.5 w-4.5" />
            <h2 className="font-display font-semibold text-sm tracking-wide uppercase text-brand-ink">
              Swarm Agent Cluster (Active Controllers)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-brand-ink-muted font-medium mr-2">
              Active: {agents.filter((a) => a.enabled).length} / {agents.length}
            </span>
            {onAddAgent && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-medium bg-brand-gold/20 hover:bg-brand-gold text-brand-ink border border-[#ff00ff]/30 uppercase tracking-wide flex items-center gap-1 cursor-pointer transition-all"
              >
                {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{showForm ? "Cancel Space" : "Spawn Agent"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamically shown Spawn Agent node container */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 bg-brand-bg rounded-2xl border border-brand-gold/30 flex flex-col gap-3.5 animate-fadeIn">
            <div className="flex items-center gap-2 border-b border-brand-border pb-2 text-brand-gold">
              <Sparkles className="h-4 w-4" opacity={0.8} />
              <h4 className="text-xs font-mono font-medium uppercase tracking-wide">Configure Swarm Node</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-mono text-brand-ink-muted font-medium uppercase block mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AcidGrime-7"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full bg-brand-surface-2 hover:bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink pl-3 pr-3 py-2 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-brand-ink-muted font-medium uppercase block mb-1">Specialist Role</label>
                <select
                  value={agentRole}
                  onChange={(e) => setAgentRole(e.target.value)}
                  className="w-full bg-brand-bg/95 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3 py-2 rounded-xl text-xs outline-none transition-all"
                >
                  {PRESET_ROLES.map((r) => (
                    <option key={r.val} value={r.val}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-mono text-brand-ink-muted font-medium uppercase block mb-1">Core Specialty</label>
                <input
                  type="text"
                  placeholder="e.g. Resonant Glitch Sweeps"
                  value={agentSpecialty}
                  onChange={(e) => setAgentSpecialty(e.target.value)}
                  className="w-full bg-brand-surface-2 hover:bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink pl-3 pr-3 py-2 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-brand-ink-muted font-medium uppercase block mb-1">Select Avatar Node</label>
                <div className="flex flex-wrap gap-1 bg-brand-surface-2 p-1.5 rounded-xl border border-brand-border">
                  {PRESET_EMOJIS.map((em) => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => setAgentAvatar(em)}
                      className={`p-1 rounded-md transition-all cursor-pointer ${
                        agentAvatar === em ? "bg-brand-gold border border-brand-border select-none" : "hover:bg-brand-surface-2"
                      }`}
                    >
                      <AnimatedAvatar avatar={em} size={28} className="bg-transparent border-none shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-brand-ink-muted font-medium uppercase block mb-1">Functional Description</label>
              <textarea
                placeholder="What parameters or style loops does this AI specialize in managing?"
                rows={2}
                value={agentDesc}
                onChange={(e) => setAgentDesc(e.target.value)}
                className="w-full bg-brand-surface-2 hover:bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink pl-3 pr-3 py-2 rounded-xl text-xs outline-none transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-brand-purple to-brand-gold hover:brightness-105 text-brand-ink font-semibold text-xs uppercase tracking-wide py-2 rounded-xl cursor-pointer transition-all border-t border-brand-border"
            >
              SPAWN SWARM SPECIALIST NODE
            </button>
          </form>
        )}

        {/* List scrollbox */}
        <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={`p-4 rounded-2xl border transition-all ${
                agent.enabled
                  ? "bg-brand-bg/50 border-brand-gold/20 shadow-neon-glow"
                  : "bg-brand-bg/20 border-brand-border opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <AnimatedAvatar avatar={agent.avatar} size={40} />
                    {agent.enabled && (
                      <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-brand-gold border border-brand-bg animate-pulse shadow-neon-cyan" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-brand-ink flex items-center gap-2">
                      {agent.name}
                      {agent.id.startsWith("custom-") && (
                        <span className="text-[8px] font-mono bg-brand-gold/20 text-brand-gold border border-brand-gold/30 px-1 py-0.2 rounded uppercase font-medium text-slate-100">
                          Spawned
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] font-mono text-brand-gold uppercase tracking-wide font-medium">
                      {agent.role} &bull; {agent.specialty}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle & Trash Option */}
                <div className="flex items-center gap-3">
                  {agent.id.startsWith("custom-") && onRemoveAgent && (
                    <button
                      onClick={() => onRemoveAgent(agent.id)}
                      className="text-brand-ink-muted hover:text-red-400 p-1 rounded hover:bg-brand-surface-2 cursor-pointer transition-all"
                      title="Decommission Custom Agent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onToggleAgent(agent.id)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                      agent.enabled ? "bg-brand-gold shadow-neon-glow" : "bg-brand-surface-2"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-brand-surface-2 transition-transform duration-200 ${
                        agent.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <p className="text-xs text-brand-ink-muted mt-2.5 leading-relaxed font-medium">
                {agent.description}
              </p>

              {/* Sliders (Only if agent is enabled) */}
              {agent.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3.5 border-t border-brand-border">
                  {/* Agency Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-brand-ink-muted font-medium uppercase tracking-wide">
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-brand-gold" /> Autonomy Level
                      </span>
                      <span className="text-brand-gold font-semibold">
                        {agent.agencyLevel}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={agent.agencyLevel}
                      onChange={(e) => onAgencyChange(agent.id, Number(e.target.value))}
                      className="h-1.5 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-gold"
                    />
                  </div>

                  {/* Bias Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-brand-ink-muted font-medium uppercase tracking-wide">
                      <span className="flex items-center gap-1">
                        <Sliders className="h-3 w-3 text-brand-gold" /> Parameter Bias
                      </span>
                      <span className="text-brand-gold font-semibold">
                        {agent.biasValue > 0 ? `+${agent.biasValue}` : agent.biasValue}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={agent.biasValue}
                      onChange={(e) => onBiasChange(agent.id, Number(e.target.value))}
                      className="h-1.5 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-gold"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Swarm Communication Logs */}
      <div className="xl:col-span-5 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-brand-border pb-4">
          <div className="flex items-center gap-2 text-brand-gold">
            <MessageSquare className="h-4.5 w-4.5 animate-pulse" />
            <h2 className="font-display font-semibold text-sm tracking-wide uppercase text-brand-ink">
              Swarm Debates & logs
            </h2>
          </div>
          <span className="text-[10px] font-mono bg-brand-gold/15 text-brand-gold px-2 py-0.5 rounded-md border border-brand-gold/30 font-medium uppercase tracking-wide">
            Live Diagnostics
          </span>
        </div>

        {/* Scrollbox for logs */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[480px] pr-1">
          {logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-brand-border rounded-2xl my-4">
              <Bot className="h-8 w-8 text-brand-ink-muted animate-pulse mb-3" />
              <p className="text-xs text-brand-ink-muted font-sans max-w-[240px]">
                The agent swarm is waiting. Prompt a track to see their real-time deliberation logs here.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              // Custom colors for workflow phases inside Vibrant Palette
              let phaseStyles = { bg: "bg-brand-surface-2", text: "text-brand-ink-muted", border: "border-brand-border" };
              if (log.phase === "A&R") {
                phaseStyles = { bg: "bg-brand-purple/10", text: "text-brand-purple pb-0.5 font-medium", border: "border-brand-purple/20" };
              } else if (log.phase === "Sequence") {
                phaseStyles = { bg: "bg-brand-gold/10", text: "text-brand-gold pb-0.5 font-medium", border: "border-brand-gold/20" };
              } else if (log.phase === "Harmonics") {
                phaseStyles = { bg: "bg-brand-gold/10", text: "text-brand-gold pb-0.5 font-medium", border: "border-brand-gold/20" };
              } else if (log.phase === "Mixdown") {
                phaseStyles = { bg: "bg-orange-500/10", text: "text-orange-400 pb-0.5 font-medium", border: "border-orange-500/20" };
              } else if (log.phase === "System") {
                phaseStyles = { bg: "bg-yellow-500/10", text: "text-yellow-400 pb-0.5 font-medium", border: "border-yellow-500/20" };
              }

              return (
                <div
                  key={log.id}
                  className="p-3 bg-brand-bg/40 border border-brand-border rounded-2xl flex items-start gap-3 transition-colors hover:bg-brand-bg/80"
                >
                  <AnimatedAvatar avatar={log.avatar || "⚙️"} size={36} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <span className="font-medium text-xs text-brand-ink">
                        {log.agentName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-medium font-mono px-1.5 py-0.5 rounded uppercase border ${phaseStyles.bg} ${phaseStyles.text} ${phaseStyles.border} tracking-wide`}>
                          {log.phase}
                        </span>
                        <span className="text-[9px] font-mono text-brand-ink-muted font-medium">
                          {log.timestamp}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-brand-ink-muted leading-relaxed font-sans whitespace-pre-line font-medium">
                      {log.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
