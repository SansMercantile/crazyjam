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
      <div className="xl:col-span-7 bg-brand-card border border-white/10 rounded-[32px] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2 text-brand-pink">
            <Users className="h-4.5 w-4.5" />
            <h2 className="font-display font-black text-sm tracking-widest uppercase text-white">
              Swarm Agent Cluster (Active Controllers)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/40 font-bold mr-2">
              Active: {agents.filter((a) => a.enabled).length} / {agents.length}
            </span>
            {onAddAgent && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold bg-brand-pink/20 hover:bg-brand-pink text-white border border-[#ff00ff]/30 uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
              >
                {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{showForm ? "Cancel Space" : "Spawn Agent"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamically shown Spawn Agent node container */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 bg-brand-dark rounded-2xl border border-brand-pink/30 flex flex-col gap-3.5 animate-fadeIn">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-brand-pink">
              <Sparkles className="h-4 w-4" opacity={0.8} />
              <h4 className="text-xs font-mono font-bold uppercase tracking-widest">Configure Swarm Node</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-mono text-white/40 font-bold uppercase block mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AcidGrime-7"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-brand-pink/50 text-white pl-3 pr-3 py-2 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-white/40 font-bold uppercase block mb-1">Specialist Role</label>
                <select
                  value={agentRole}
                  onChange={(e) => setAgentRole(e.target.value)}
                  className="w-full bg-brand-dark/95 border border-white/10 focus:border-brand-pink/50 text-white px-3 py-2 rounded-xl text-xs outline-none transition-all"
                >
                  {PRESET_ROLES.map((r) => (
                    <option key={r.val} value={r.val}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-mono text-white/40 font-bold uppercase block mb-1">Core Specialty</label>
                <input
                  type="text"
                  placeholder="e.g. Resonant Glitch Sweeps"
                  value={agentSpecialty}
                  onChange={(e) => setAgentSpecialty(e.target.value)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-brand-pink/50 text-white pl-3 pr-3 py-2 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-white/40 font-bold uppercase block mb-1">Select Avatar Node</label>
                <div className="flex flex-wrap gap-1 bg-white/5 p-1.5 rounded-xl border border-white/10">
                  {PRESET_EMOJIS.map((em) => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => setAgentAvatar(em)}
                      className={`p-1 rounded-md transition-all cursor-pointer ${
                        agentAvatar === em ? "bg-brand-pink border border-white/20 select-none" : "hover:bg-white/5"
                      }`}
                    >
                      <AnimatedAvatar avatar={em} size={28} className="bg-transparent border-none shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-white/40 font-bold uppercase block mb-1">Functional Description</label>
              <textarea
                placeholder="What parameters or style loops does this AI specialize in managing?"
                rows={2}
                value={agentDesc}
                onChange={(e) => setAgentDesc(e.target.value)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-brand-pink/50 text-white pl-3 pr-3 py-2 rounded-xl text-xs outline-none transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-brand-purple to-brand-pink hover:scale-102 text-white font-black text-xs uppercase tracking-widest py-2 rounded-xl cursor-pointer transition-all border-t border-white/20"
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
                  ? "bg-brand-dark/50 border-brand-pink/20 shadow-neon-glow"
                  : "bg-brand-dark/20 border-white/5 opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <AnimatedAvatar avatar={agent.avatar} size={40} />
                    {agent.enabled && (
                      <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-brand-cyan border border-brand-dark animate-pulse shadow-neon-cyan" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      {agent.name}
                      {agent.id.startsWith("custom-") && (
                        <span className="text-[8px] font-mono bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 px-1 py-0.2 rounded uppercase font-bold text-slate-100">
                          Spawned
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] font-mono text-brand-pink uppercase tracking-widest font-bold">
                      {agent.role} &bull; {agent.specialty}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle & Trash Option */}
                <div className="flex items-center gap-3">
                  {agent.id.startsWith("custom-") && onRemoveAgent && (
                    <button
                      onClick={() => onRemoveAgent(agent.id)}
                      className="text-white/40 hover:text-red-400 p-1 rounded hover:bg-white/5 cursor-pointer transition-all"
                      title="Decommission Custom Agent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onToggleAgent(agent.id)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                      agent.enabled ? "bg-brand-pink shadow-neon-glow" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        agent.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <p className="text-xs text-white/50 mt-2.5 leading-relaxed font-medium">
                {agent.description}
              </p>

              {/* Sliders (Only if agent is enabled) */}
              {agent.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3.5 border-t border-white/5">
                  {/* Agency Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-white/40 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-brand-pink" /> Autonomy Level
                      </span>
                      <span className="text-brand-pink font-black">
                        {agent.agencyLevel}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={agent.agencyLevel}
                      onChange={(e) => onAgencyChange(agent.id, Number(e.target.value))}
                      className="h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-pink"
                    />
                  </div>

                  {/* Bias Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-white/40 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Sliders className="h-3 w-3 text-brand-cyan" /> Parameter Bias
                      </span>
                      <span className="text-brand-cyan font-black">
                        {agent.biasValue > 0 ? `+${agent.biasValue}` : agent.biasValue}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={agent.biasValue}
                      onChange={(e) => onBiasChange(agent.id, Number(e.target.value))}
                      className="h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Swarm Communication Logs */}
      <div className="xl:col-span-5 bg-brand-card border border-white/10 rounded-[32px] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2 text-brand-cyan">
            <MessageSquare className="h-4.5 w-4.5 animate-pulse" />
            <h2 className="font-display font-black text-sm tracking-widest uppercase text-white">
              Swarm Debates & logs
            </h2>
          </div>
          <span className="text-[10px] font-mono bg-brand-cyan/15 text-brand-cyan px-2 py-0.5 rounded-md border border-brand-cyan/30 font-bold uppercase tracking-widest">
            Live Diagnostics
          </span>
        </div>

        {/* Scrollbox for logs */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[480px] pr-1">
          {logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl my-4">
              <Bot className="h-8 w-8 text-white/20 animate-pulse mb-3" />
              <p className="text-xs text-white/45 font-sans max-w-[240px]">
                The agent swarm is waiting. Prompt a track to see their real-time deliberation logs here.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              // Custom colors for workflow phases inside Vibrant Palette
              let phaseStyles = { bg: "bg-white/5", text: "text-white/40", border: "border-white/10" };
              if (log.phase === "A&R") {
                phaseStyles = { bg: "bg-brand-purple/10", text: "text-brand-purple pb-0.5 font-bold", border: "border-brand-purple/20" };
              } else if (log.phase === "Sequence") {
                phaseStyles = { bg: "bg-brand-cyan/10", text: "text-brand-cyan pb-0.5 font-bold", border: "border-brand-cyan/20" };
              } else if (log.phase === "Harmonics") {
                phaseStyles = { bg: "bg-brand-pink/10", text: "text-brand-pink pb-0.5 font-bold", border: "border-brand-pink/20" };
              } else if (log.phase === "Mixdown") {
                phaseStyles = { bg: "bg-orange-500/10", text: "text-orange-400 pb-0.5 font-bold", border: "border-orange-500/20" };
              } else if (log.phase === "System") {
                phaseStyles = { bg: "bg-yellow-500/10", text: "text-yellow-400 pb-0.5 font-bold", border: "border-yellow-500/20" };
              }

              return (
                <div
                  key={log.id}
                  className="p-3 bg-brand-dark/40 border border-white/5 rounded-2xl flex items-start gap-3 transition-colors hover:bg-brand-dark/80"
                >
                  <AnimatedAvatar avatar={log.avatar || "⚙️"} size={36} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <span className="font-bold text-xs text-white">
                        {log.agentName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded uppercase border ${phaseStyles.bg} ${phaseStyles.text} ${phaseStyles.border} tracking-wider`}>
                          {log.phase}
                        </span>
                        <span className="text-[9px] font-mono text-white/30 font-medium">
                          {log.timestamp}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed font-sans whitespace-pre-line font-medium">
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
