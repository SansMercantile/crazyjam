import React, { useState } from "react";
import { AgentControl } from "./AgentControl";
import { 
  Users, 
  Cpu, 
  BrainCircuit, 
  Sparkles, 
  Gauge, 
  ShieldAlert, 
  MessageSquareCode, 
  Send,
  Sliders,
  Award
} from "lucide-react";
import { ServiceAgent, AgentLog } from "../types";

interface AgentsTabProps {
  agents: ServiceAgent[];
  onToggleAgent: (id: string) => void;
  onAgencyChange: (id: string, val: number) => void;
  onBiasChange: (id: string, val: number) => void;
  logs: AgentLog[];
  onAddAgent: (newAgent: ServiceAgent) => void;
  onRemoveAgent: (id: string) => void;
  addLog: (log: any) => void;
}

export const AgentsTab: React.FC<AgentsTabProps> = ({
  agents,
  onToggleAgent,
  onAgencyChange,
  onBiasChange,
  logs,
  onAddAgent,
  onRemoveAgent,
  addLog,
}) => {
  // Enhanced Swarm States
  const [selectedAgentId, setSelectedAgentId] = useState<string>("ar-critic");
  const [directMessage, setDirectMessage] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  // Advisory feedback simulation when producer issues direct orders to AI nodes
  const submitDirectInstruction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMessage.trim() || isAnswering) return;

    const msg = directMessage;
    setDirectMessage("");
    setIsAnswering(true);

    const targetAgent = agents.find(a => a.id === selectedAgentId);
    const agentName = targetAgent ? targetAgent.name : "Neural Agent Node";

    // Inject temporary user logs
    addLog({
      agentName: "DAW Producer",
      role: "Instruction",
      avatar: "👤",
      message: `DIRECT ORDER TO [${agentName}]:\n"${msg}"`,
      phase: "System",
      status: "thinking"
    });

    setTimeout(() => {
      setIsAnswering(false);
      
      let reply = "";
      if (selectedAgentId === "ar-critic") {
        reply = `A&R ANALYSIS UPDATED: Understood. Re-calibration underway to optimize viral parameters. Modifying concepto bounds to emphasize deeper sonic weight corresponding to modern Spotify charts.`;
      } else if (selectedAgentId === "lofi-beat") {
        reply = `RHYTHM TRANSIENT ENGINE UPDATED: Transposed snare ghost triggers and hi-hat velocity swing. Kick transients are now focused closer to 50Hz sub-boundaries.`;
      } else if (selectedAgentId === "harmonics") {
        reply = `HARMONIC ALIENMENT MATRIX: Tuned seventh and ninth chord extensions inside current ${selectedAgentId} scale registers. Melodic bounds aligned to higher harmonic tension.`;
      } else {
        reply = `SONIC CORRECTION SUB-ROUTINE: Limiter threshold gains squeezed by -0.15dB. Stereo panners expanded. Delay feedback echoes stabilized in the mix.`;
      }

      addLog({
        agentName: agentName,
        role: "Advisory Feed",
        avatar: targetAgent?.avatar || "🤖",
        message: reply,
        phase: "System",
        status: "completed"
      });
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Top Advisory Deck with Agreement Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Swarm Agreement Matrix */}
        <div className="lg:col-span-7 bg-brand-card border border-brand-border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-brand-border pb-3 mb-4">
              <BrainCircuit className="h-5 w-5 text-purple-400" />
              <div>
                <span className="text-[9px] uppercase font-mono tracking-wide text-purple-400 font-bold">Consensus telemetry</span>
                <h3 className="font-display font-semibold text-sm uppercase text-brand-ink leading-tight">Neural Swarm Consensus Status</h3>
              </div>
            </div>

            <p className="text-[10px] text-brand-ink-muted leading-relaxed font-sans mb-4">
              Real-time monitoring of AI Agent agreement coefficients. When compiling prompts, nodes synchronize synthesis metrics to prevent clashing frequencies.
            </p>

            <div className="space-y-3">
              {/* Agent agreements lists */}
              {[
                { name: "Zeitgeist A&R Critic", rate: 94, status: "Optimal Concept", color: "bg-emerald-500" },
                { name: "Groove Rhythm Spezialist", rate: 89, status: "High Swing Alignment", color: "bg-cyan-400" },
                { name: "Harmonic Architect Progressions", rate: 91, status: "Scales Verified", color: "bg-purple-500" },
                { name: "Sonic mastering EQ Coordinator", rate: 86, status: "Limiter Threshold Calibrated", color: "bg-brand-pink" },
              ].map((ag) => (
                <div key={ag.name} className="flex justify-between items-center text-[10px] bg-brand-surface-2 border border-brand-border p-2.5 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full ${ag.color}`} />
                    <span className="font-bold text-brand-ink-muted">{ag.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[9px] text-brand-ink-muted uppercase">{ag.status}</span>
                    <span className="text-brand-ink font-semibold">{ag.rate}% Synchrony</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-border flex items-center justify-between text-[10px] font-mono text-brand-ink-muted">
            <span className="flex items-center gap-1 font-bold text-brand-pink">
              ● Active Channels: 4 Swarms online
            </span>
            <span className="font-bold select-none text-right">Master Synchrony Index: 92.5%</span>
          </div>
        </div>

        {/* Direct Advisory Console */}
        <div className="lg:col-span-5 bg-brand-card border border-brand-border rounded-2xl p-6 relative flex flex-col justify-between">
          <form onSubmit={submitDirectInstruction} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-brand-border pb-3">
              <MessageSquareCode className="h-5 w-5 text-[#e59632]" />
              <div>
                <span className="text-[9px] uppercase font-mono tracking-wide text-[#e59632] font-semibold">Direct feedback routing</span>
                <h3 className="font-display font-semibold text-sm uppercase text-brand-ink leading-tight">Agent Advisory Pipeline</h3>
              </div>
            </div>

            <p className="text-[10px] text-brand-ink-muted leading-relaxed font-sans">
              Deploy special instruction directives directly to an agent's neural priority heap. Overrides general swarm behaviors.
            </p>

            {/* Select Target Agent */}
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase tracking-wide text-brand-ink-muted block">Select Agent Node</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-brand-surface-2 border border-brand-border py-2 px-3 rounded-xl text-xs text-brand-ink uppercase font-bold outline-none focus:border-[#e59632]"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id} className="bg-brand-card text-brand-ink uppercase text-xs">
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Instruction input */}
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase tracking-wide text-brand-ink-muted block">Custom Instruction Advisory</label>
              <textarea
                value={directMessage}
                onChange={(e) => setDirectMessage(e.target.value)}
                placeholder="Declare details... (e.g. 'boost snare dynamic swing and focus bass strictly on Minor keys')"
                disabled={isAnswering}
                className="w-full bg-brand-surface-2 border border-brand-border p-3 rounded-xl text-xs text-brand-ink placeholder-brand-ink-muted outline-none h-18 resize-none focus:border-[#e59632] transition font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={!directMessage.trim() || isAnswering}
              className="w-full py-2 bg-[#e59632] hover:bg-[#c97f26] disabled:bg-neutral-800 text-brand-dark font-display font-semibold uppercase text-[10px] tracking-wide rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isAnswering ? (
                <>
                  <span className="h-3 w-3 border-2 border-brand-dark border-t-transparent animate-spin rounded-full" />
                  Node Syncing...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Route Advisory Direct
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Multi-agent core control deck Component */}
      <div className="w-full">
        <AgentControl
          agents={agents}
          onToggleAgent={onToggleAgent}
          onAgencyChange={onAgencyChange}
          onBiasChange={onBiasChange}
          logs={logs}
          onAddAgent={onAddAgent}
          onRemoveAgent={onRemoveAgent}
        />
      </div>
    </div>
  );
};
