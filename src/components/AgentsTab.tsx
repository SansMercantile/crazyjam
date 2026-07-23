import React, { useState } from "react";
import { AgentControl } from "./AgentControl";
import {
  Users,
  BrainCircuit,
  MessageSquareCode,
  Send,
} from "lucide-react";
import { ServiceAgent, AgentLog } from "../types";
import { customerSupport } from "../utils/api";

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
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || "");
  const [directMessage, setDirectMessage] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  const enabledAgents = agents.filter((a) => a.enabled);

  // Routes the instruction to a real Bedrock call, framed as feedback to
  // the selected agent - genuine AI output, not a canned if/else reply.
  const submitDirectInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMessage.trim() || isAnswering) return;

    const msg = directMessage;
    setDirectMessage("");
    setIsAnswering(true);

    const targetAgent = agents.find((a) => a.id === selectedAgentId);
    const agentName = targetAgent ? targetAgent.name : "Neural agent node";

    addLog({
      agentName: "Producer",
      role: "Instruction",
      avatar: "👤",
      message: `Direct instruction to ${agentName}:\n"${msg}"`,
      phase: "System",
      status: "thinking",
    });

    try {
      const result = await customerSupport(
        `You are acting as the CrazyJam swarm agent "${agentName}" (role: ${targetAgent?.role || "specialist"}, specialty: ${targetAgent?.specialty || "general production"}). ` +
        `The producer just gave you this direct instruction: "${msg}". Respond in-character as this agent, briefly confirming how you'll adjust your approach.`,
        []
      );
      addLog({
        agentName,
        role: "Advisory",
        avatar: targetAgent?.avatar || "🤖",
        message: result.text || "Acknowledged.",
        phase: "System",
        status: "completed",
      });
    } catch (err: any) {
      addLog({
        agentName,
        role: "Advisory",
        avatar: "⚠️",
        message: `Couldn't reach the swarm core: ${err.message || err}`,
        phase: "System",
        status: "alert",
      });
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Real agent state - not fake telemetry */}
        <div className="lg:col-span-7 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-brand-border pb-3 mb-4">
              <BrainCircuit className="h-5 w-5 text-brand-gold" />
              <div>
                <h3 className="font-display text-[15px] text-brand-ink">Active swarm configuration</h3>
                <p className="text-[11px] text-brand-ink-muted mt-0.5">These are the real autonomy/bias settings sent with your next generation.</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {enabledAgents.length === 0 ? (
                <p className="text-[12px] text-brand-ink-muted text-center py-6">No agents enabled - toggle some on below.</p>
              ) : (
                enabledAgents.map((ag) => (
                  <div key={ag.id} className="flex justify-between items-center text-[12px] bg-brand-surface-2 border border-brand-border p-3 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-brand-gold" />
                      <span className="text-brand-ink">{ag.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-brand-ink-muted">
                      <span>Autonomy {ag.agencyLevel}%</span>
                      <span>Bias {ag.biasValue > 0 ? `+${ag.biasValue}` : ag.biasValue}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-ink-muted">
            <span>{enabledAgents.length} of {agents.length} agents active</span>
          </div>
        </div>

        {/* Direct Advisory Console - now a real Bedrock call */}
        <div className="lg:col-span-5 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-between">
          <form onSubmit={submitDirectInstruction} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-brand-border pb-3">
              <MessageSquareCode className="h-5 w-5 text-brand-gold" />
              <div>
                <h3 className="font-display text-[15px] text-brand-ink">Direct instruction</h3>
                <p className="text-[11px] text-brand-ink-muted mt-0.5">Sends a real message to the swarm, in-character as the agent you pick.</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-brand-ink-muted block">Target agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-brand-surface-2 border border-brand-border py-2 px-3 rounded-lg text-sm text-brand-ink outline-none focus:border-brand-gold/50"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-brand-ink-muted block">Instruction</label>
              <textarea
                value={directMessage}
                onChange={(e) => setDirectMessage(e.target.value)}
                placeholder="e.g. 'boost snare dynamic swing and keep bass in minor keys'"
                disabled={isAnswering}
                className="w-full bg-brand-surface-2 border border-brand-border p-3 rounded-lg text-sm text-brand-ink placeholder-brand-ink-muted outline-none h-20 resize-none focus:border-brand-gold/50 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={!directMessage.trim() || isAnswering}
              className="w-full py-2.5 metal-gold font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isAnswering ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send instruction
                </>
              )}
            </button>
          </form>
        </div>
      </div>

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
