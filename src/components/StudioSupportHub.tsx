/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Send,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Square,
  CheckCircle,
} from "lucide-react";
import { customerSupport, humToBeat } from "../utils/api";

interface SpeechBubble {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

interface StudioSupportHubProps {
  onTriggerComposition: (prompt: string) => void;
  onLoadAudioBlueprint: (blueprint: any) => void;
  isGeneratingTracks: boolean;
  audioCtx?: AudioContext | null;
  micGain?: number;       // 0-100
  highpassFreq?: number;  // Hz
  noiseGateEnabled?: boolean;
  reverbWet?: number;     // 0-100
}

export const StudioSupportHub: React.FC<StudioSupportHubProps> = ({
  onTriggerComposition,
  onLoadAudioBlueprint,
  isGeneratingTracks,
  audioCtx,
  micGain = 85,
  highpassFreq = 80,
  noiseGateEnabled = true,
  reverbWet = 40,
}) => {
  const [activeTab, setActiveTab] = useState<"support" | "voice">("support");

  const [messages, setMessages] = useState<SpeechBubble[]>([
    {
      id: "init",
      sender: "ai",
      text: "Welcome to **CrazyJam Studio Support**! I have direct access to the composition swarm. Ask how to use the DAW, or **ask me to make you a song** (e.g., *'Create a nostalgic lofi beat'*).",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [micState, setMicState] = useState<"idle" | "recording" | "processing" | "success" | "error">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micErrorMessage, setMicErrorMessage] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const processingNodesRef = useRef<AudioNode[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleQuickChip = (chipText: string) => sendMessage(chipText);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    const userMsg: SpeechBubble = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsSending(true);

    try {
      const historyPayload = messages.slice(-10).map((m) => ({
        sender: m.sender === "user" ? "user" : "ai",
        text: m.text
      }));

      const replyData = await customerSupport(textToSend, historyPayload);

      const aiMsg: SpeechBubble = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: replyData.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (replyData.triggerComposition && replyData.triggerCompositionPrompt) {
        const promptToCompose = replyData.triggerCompositionPrompt;
        setTimeout(() => onTriggerComposition(promptToCompose), 1200);
      }
    } catch (error: any) {
      console.error("Support chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `⚠️ **Connection disrupted.** The CrazyJam swarm couldn't reach the studio core. Please check your network or try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  /** Builds a real-time Web Audio processing chain (gain -> high-pass ->
   * compressor-as-noise-reduction -> simple delay-based space) and routes
   * it into a MediaStreamDestination, so the mic gain/high-pass/noise
   * reduction/reverb sliders in SupportTab genuinely shape what gets
   * recorded, instead of being decorative. */
  const buildProcessedStream = (rawStream: MediaStream): MediaStream => {
    if (!audioCtx) return rawStream;

    const source = audioCtx.createMediaStreamSource(rawStream);

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = Math.max(0.1, (micGain / 100) * 1.8);

    const highpass = audioCtx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = highpassFreq;

    const compressor = audioCtx.createDynamicsCompressor();
    if (noiseGateEnabled) {
      compressor.threshold.value = -45;
      compressor.knee.value = 6;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;
    } else {
      compressor.threshold.value = -100;
      compressor.ratio.value = 1;
    }

    const dry = audioCtx.createGain();
    dry.gain.value = 1 - reverbWet / 200; // keep dry signal dominant even at 100% wet

    const delay = audioCtx.createDelay(1.0);
    delay.delayTime.value = 0.18;
    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.3;
    const wet = audioCtx.createGain();
    wet.gain.value = reverbWet / 100;

    const destination = audioCtx.createMediaStreamDestination();

    source.connect(gainNode);
    gainNode.connect(highpass);
    highpass.connect(compressor);

    compressor.connect(dry);
    dry.connect(destination);

    compressor.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(destination);

    processingNodesRef.current = [source, gainNode, highpass, compressor, dry, delay, feedback, wet];

    return destination.stream;
  };

  const cleanupProcessingChain = () => {
    processingNodesRef.current.forEach((n) => {
      try { n.disconnect(); } catch {}
    });
    processingNodesRef.current = [];
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    setMicErrorMessage("");
    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      rawStreamRef.current = rawStream;

      if (audioCtx?.state === "suspended") await audioCtx.resume();
      const streamToRecord = buildProcessedStream(rawStream);

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(streamToRecord, { mimeType: "audio/webm" });
      } catch (e) {
        recorder = new MediaRecorder(streamToRecord);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        rawStreamRef.current?.getTracks().forEach((t) => t.stop());
        cleanupProcessingChain();
        await uploadVocalAudio(audioBlob);
      };

      setMicState("recording");
      setRecordingSeconds(0);
      recorder.start(250);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 7) {
            stopRecording();
            return 8;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Mic access denied:", err);
      setMicState("error");
      setMicErrorMessage(err.message || "Microphone access denied. Please grant permissions.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadVocalAudio = async (blob: Blob) => {
    setMicState("processing");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const cleanBase64 = base64data.split(",")[1];
        const blueprint = await humToBeat(cleanBase64, blob.type || "audio/webm");
        onLoadAudioBlueprint(blueprint);
        setMicState("success");
      };
    } catch (error: any) {
      console.error("Vocal synthesis upload failed:", error);
      setMicState("error");
      setMicErrorMessage(error.message || "Could not parse hummed frequencies");
    }
  };

  const resetMicState = () => {
    setMicState("idle");
    setRecordingSeconds(0);
    setMicErrorMessage("");
  };

  return (
    <div id="studio-support-container" className="h-full min-h-[460px] bg-brand-surface border border-brand-border rounded-2xl overflow-hidden flex flex-col justify-between">
      <div className="flex border-b border-brand-border bg-brand-surface-2">
        <button
          onClick={() => setActiveTab("support")}
          className={`flex-1 py-4 text-[12px] font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === "support" ? "text-brand-gold border-b-2 border-brand-gold" : "text-brand-ink-muted hover:text-brand-ink"
          }`}
        >
          <MessageSquare className="h-4 w-4" /> Studio guide &amp; support
        </button>
        <button
          onClick={() => setActiveTab("voice")}
          className={`flex-1 py-4 text-[12px] font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === "voice" ? "text-brand-gold border-b-2 border-brand-gold" : "text-brand-ink-muted hover:text-brand-ink"
          }`}
        >
          <Mic className="h-4 w-4" /> Hum-to-beat
        </button>
      </div>

      <div className="flex-1 p-5 overflow-y-auto max-h-[340px] flex flex-col justify-between">
        {activeTab === "support" ? (
          <div className="flex flex-col gap-4 h-full justify-between">
            <div className="flex-1 space-y-3 pr-1 overflow-y-auto max-h-[200px]">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col max-w-[85%] ${m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                  <span className="text-[10px] text-brand-ink-muted mb-1">
                    {m.sender === "user" ? "You" : "Studio support"} &bull; {m.timestamp}
                  </span>
                  <div className={`rounded-2xl p-3 text-[12px] leading-relaxed ${
                    m.sender === "user" ? "bg-brand-gold text-brand-bg rounded-tr-sm" : "bg-brand-surface-2 border border-brand-border text-brand-ink rounded-tl-sm"
                  }`}>
                    {m.text.split("**").map((chunk, i) =>
                      i % 2 === 1 ? <strong key={i} className={m.sender === "user" ? "" : "text-brand-gold font-medium"}>{chunk}</strong> : chunk
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex mr-auto items-start max-w-[85%]">
                  <div className="bg-brand-surface-2 border border-brand-border text-brand-ink-muted rounded-2xl rounded-tl-sm p-3 text-[11px] flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-gold" /> Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {messages.length < 3 && !isSending && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                <button onClick={() => handleQuickChip("Explain the synth controllers and LFOs")} className="bg-brand-surface-2 hover:bg-brand-border/20 border border-brand-border rounded-full px-2.5 py-1 text-[11px] text-brand-gold transition-all">
                  Synth knobs
                </button>
                <button onClick={() => handleQuickChip("Compose a slow lofi ambient melody")} className="bg-brand-surface-2 hover:bg-brand-border/20 border border-brand-border rounded-full px-2.5 py-1 text-[11px] text-brand-gold transition-all">
                  Make an ambient track
                </button>
                <button onClick={() => handleQuickChip("How do I record with my voice or samplers?")} className="bg-brand-surface-2 hover:bg-brand-border/20 border border-brand-border rounded-full px-2.5 py-1 text-[11px] text-brand-gold transition-all">
                  Recording guide
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center h-full gap-3">
            {micState === "idle" && (
              <>
                <div className="bg-brand-gold/10 border border-brand-gold/20 h-14 w-14 rounded-full flex items-center justify-center text-brand-gold">
                  <Mic className="h-7 w-7" />
                </div>
                <h4 className="text-[13px] text-brand-ink">Microphone idle</h4>
                <p className="text-[11px] text-brand-ink-muted leading-relaxed max-w-[280px]">
                  Hum a melody, sing a bassline, or beatbox a pattern - the swarm listens and translates it into sequencer steps.
                </p>
                <button
                  onClick={startRecording}
                  disabled={isGeneratingTracks}
                  className="mt-2 metal-gold text-[12px] font-semibold py-2 px-6 rounded-full transition-all flex items-center gap-2 disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Start recording
                </button>
              </>
            )}

            {micState === "recording" && (
              <>
                <div className="relative mb-2">
                  <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping h-14 w-14" />
                  <div className="bg-red-500 border border-red-400 h-14 w-14 rounded-full flex items-center justify-center text-white relative">
                    <Square className="h-5 w-5 fill-current" />
                  </div>
                </div>
                <h4 className="text-[13px] text-red-400">Recording...</h4>
                <p className="text-[11px] text-brand-ink-muted">{recordingSeconds}s / 8s limit</p>
                <div className="w-[180px] h-2 bg-brand-surface-2 rounded-full overflow-hidden border border-brand-border mt-1">
                  <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(recordingSeconds / 8) * 100}%` }} />
                </div>
                <button onClick={stopRecording} className="mt-3 bg-brand-surface-2 border border-brand-border hover:bg-brand-border/20 text-brand-ink text-[11px] font-medium py-1.5 px-5 rounded-full transition-all">
                  Finish
                </button>
              </>
            )}

            {micState === "processing" && (
              <>
                <div className="bg-brand-surface-2 border border-brand-border h-14 w-14 rounded-full flex items-center justify-center text-brand-gold">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
                <h4 className="text-[13px] text-brand-ink">Analyzing recording</h4>
                <p className="text-[11px] text-brand-ink-muted max-w-[240px]">
                  The CrazyJam swarm is listening and extracting rhythm and pitch...
                </p>
              </>
            )}

            {micState === "success" && (
              <>
                <div className="bg-emerald-500/10 border border-emerald-500/20 h-14 w-14 rounded-full flex items-center justify-center text-emerald-400">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <h4 className="text-[13px] text-emerald-400">Sequencer updated</h4>
                <p className="text-[11px] text-brand-ink-muted leading-relaxed max-w-[260px]">
                  Your recording has been translated into sequencer steps. Check the studio grid.
                </p>
                <button onClick={resetMicState} className="mt-2 bg-brand-surface-2 hover:bg-brand-border/20 border border-brand-border text-brand-ink text-[11px] font-medium py-1.5 px-5 rounded-full transition-all">
                  Record another
                </button>
              </>
            )}

            {micState === "error" && (
              <>
                <div className="bg-red-500/10 border border-red-500/20 h-14 w-14 rounded-full flex items-center justify-center text-red-400">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h4 className="text-[13px] text-red-400">Recording failed</h4>
                <p className="text-[11px] text-brand-ink-muted max-w-[240px] leading-relaxed">{micErrorMessage || "Something interrupted the capture."}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={startRecording} className="metal-gold text-[11px] font-semibold py-1.5 px-4 rounded-full transition-all">Retry</button>
                  <button onClick={resetMicState} className="bg-brand-surface-2 border border-brand-border text-brand-ink text-[11px] font-medium py-1.5 px-4 rounded-full transition-all">Reset</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {activeTab === "support" && (
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(inputVal); }}
          className="border-t border-brand-border p-3 bg-brand-surface-2 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={isGeneratingTracks ? "Studio composing in progress..." : "Ask support or type: 'Make a tech-house beat'..."}
            disabled={isSending || isGeneratingTracks}
            className="flex-1 bg-brand-surface border border-brand-border rounded-full px-4 py-2.5 text-[12px] text-brand-ink placeholder-brand-ink-muted focus:outline-none focus:border-brand-gold/50 transition-all"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isSending || isGeneratingTracks}
            className="metal-gold h-9 w-9 rounded-full flex items-center justify-center transition-all shrink-0 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
