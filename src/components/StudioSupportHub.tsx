import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Send,
  Sparkles,
  HelpCircle,
  MessageSquare,
  Volume2,
  AlertTriangle,
  Loader2,
  Square,
  CheckCircle,
  X,
  Play
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
}

export const StudioSupportHub: React.FC<StudioSupportHubProps> = ({
  onTriggerComposition,
  onLoadAudioBlueprint,
  isGeneratingTracks,
}) => {
  const [activeTab, setActiveTab] = useState<"support" | "voice">("support");

  // Chat Support State
  const [messages, setMessages] = useState<SpeechBubble[]>([
    {
      id: "init",
      sender: "ai",
      text: "Welcome to **CrazyJam Studio Support Hub**! 🎛️ I have direct access to our 100+ multi-agent synthesizer engine. You can ask me how to use the DAW controllers, or simply **ask me to make you a song** (e.g., *'Create a nostalgic lofi beat'*), and I will arrange it instantly!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio Recording State
  const [micState, setMicState] = useState<"idle" | "recording" | "processing" | "success" | "error">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micErrorMessage, setMicErrorMessage] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Handle Quick Assistance Chips
  const handleQuickChip = (chipText: string) => {
    sendMessage(chipText);
  };

  // Chat Client Call
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

      // If user requested AI to make a track, trigger modular sequencer blueprint generation
      if (replyData.triggerComposition && replyData.triggerCompositionPrompt) {
        const promptToCompose = replyData.triggerCompositionPrompt;
        setTimeout(() => {
          onTriggerComposition(promptToCompose);
        }, 1200);
      }

    } catch (error: any) {
      console.error("Support chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `⚠️ **Connection disrupted.** Gemini Studio Core could not formulate a diagnostic. Please check your network or try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Microphone hum/sing/beatbox recording capture
  const startRecording = async () => {
    audioChunksRef.current = [];
    setMicErrorMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: "audio/webm" };
      
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback for Safari/unsupported formats
        recorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await uploadVocalAudio(audioBlob);
      };

      setMicState("recording");
      setRecordingSeconds(0);
      recorder.start(250); // Get chunks every 250ms

      // Set recording countdown (hard limit 8s for speed & tokens)
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
      setMicErrorMessage(
        err.message || "Microphone access denied. Please grant iframe permissions."
      );
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
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        // Strip data url format
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
    <div id="studio-support-container" className="h-full min-h-[460px] bg-brand-card border border-white/10 rounded-[32px] overflow-hidden flex flex-col justify-between">
      {/* Sub-Header Tabs */}
      <div className="flex border-b border-white/10 bg-black/40">
        <button
          onClick={() => setActiveTab("support")}
          className={`flex-1 py-4 text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
            activeTab === "support"
              ? "text-brand-pink border-b-2 border-brand-pink bg-black/10"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          AI Studio Guide & Support
        </button>
        <button
          onClick={() => setActiveTab("voice")}
          className={`flex-1 py-4 text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
            activeTab === "voice"
              ? "text-purple-400 border-b-2 border-purple-400 bg-black/10"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <Mic className="h-4 w-4" />
          Hum-To-Beat Vocal Mic
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-5 overflow-y-auto max-h-[340px] scrollbar-thin flex flex-col justify-between">
        {activeTab === "support" ? (
          /* SUPPORT CHAT LAYOUT */
          <div className="flex flex-col gap-4 h-full justify-between">
            {/* Scrollable messages panel */}
            <div className="flex-1 space-y-3 pr-1 overflow-y-auto max-h-[200px]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col max-w-[85%] ${
                    m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <span className="text-[9px] text-white/35 font-mono mb-1">
                    {m.sender === "user" ? "Producer" : "Studio Support"} • {m.timestamp}
                  </span>
                  <div
                    className={`rounded-2xl p-3 text-[11px] leading-relaxed font-sans ${
                      m.sender === "user"
                        ? "bg-brand-pink text-white rounded-tr-none font-semibold text-right"
                        : "bg-white/5 border border-white/10 text-white/90 rounded-tl-none font-medium text-left"
                    }`}
                  >
                    {/* Render minimal formatting/bold terms */}
                    {m.text.split("**").map((chunk, i) =>
                      i % 2 === 1 ? <strong key={i} className="text-brand-pink font-bold">{chunk}</strong> : chunk
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex mr-auto items-start max-w-[85%] animate-pulse">
                  <div className="bg-white/5 border border-white/10 text-white/40 rounded-2xl rounded-tl-none p-3 text-[11px] font-mono flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-pink" />
                    AI Swarm formulation...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Helper Assistance Chips */}
            {messages.length < 3 && !isSending && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                <button
                  onClick={() => handleQuickChip("Explain Synth Controllers & LFOs")}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-2.5 py-1 text-[10px] text-brand-pink font-sans font-bold transition"
                >
                  ❓ Synth Knobs
                </button>
                <button
                  onClick={() => handleQuickChip("Compose a slow lofi ambient melody")}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-2.5 py-1 text-[10px] text-purple-400 font-sans font-bold transition"
                >
                  🎵 Make Ambient Track
                </button>
                <button
                  onClick={() => handleQuickChip("How do I record human voice or samplers?")}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-2.5 py-1 text-[10px] text-blue-450 font-sans font-bold transition"
                >
                  🎙️ Recording Guide
                </button>
              </div>
            )}
          </div>
        ) : (
          /* HUM-TO-BEAT MICROPHONE LAYOUT */
          <div className="flex flex-col items-center justify-center py-4 text-center h-full gap-3">
            {micState === "idle" && (
              <>
                <div className="bg-purple-500/10 border border-purple-500/20 h-14 w-14 rounded-full flex items-center justify-center text-purple-400 animate-pulse mb-1">
                  <Mic className="h-7 w-7" />
                </div>
                <h4 className="text-xs font-display font-black text-white uppercase tracking-wider">
                  Deploy Voice to Sequencer Grid
                </h4>
                <p className="text-[10px] text-white/50 leading-relaxed max-w-[280px] font-medium font-sans">
                  Hum melodies, sing basslines, or beatbox a kick/snare pattern! CrazyJam will listen, analyze frequency transients recursively, and fabricate custom steps on the sequencer.
                </p>
                <button
                  onClick={startRecording}
                  disabled={isGeneratingTracks}
                  className="mt-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-[11px] font-display font-black uppercase tracking-wider py-2 px-6 rounded-full transition shadow-lg shadow-purple-500/20 flex items-center gap-2"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Initialize Mic Capture
                </button>
              </>
            )}

            {micState === "recording" && (
              <>
                <div className="relative mb-2">
                  <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping h-14 w-14" />
                  <div className="bg-red-500 border border-red-400 h-14 w-14 rounded-full flex items-center justify-center text-white relative">
                    <Square className="h-5 w-5 fill-current text-white animate-pulse" />
                  </div>
                </div>
                <h4 className="text-xs font-display font-black text-red-400 uppercase tracking-wider animate-pulse">
                  Vocal Track Capturing...
                </h4>
                <p className="text-[11px] font-mono text-white/70">
                  {recordingSeconds}s / 8s Limit
                </p>
                <div className="w-[180px] h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 mt-1">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${(recordingSeconds / 8) * 100}%` }}
                  />
                </div>
                <button
                  onClick={stopRecording}
                  className="mt-3 bg-white hover:bg-neutral-100 text-black text-[10px] font-display font-black uppercase tracking-wider py-1.5 px-5 rounded-full transition"
                >
                  Finish & Synthesize
                </button>
              </>
            )}

            {micState === "processing" && (
              <>
                <div className="bg-white/5 border border-white/10 h-14 w-14 rounded-full flex items-center justify-center text-brand-pink mb-1">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
                <h4 className="text-xs font-display font-black text-white uppercase tracking-wider">
                  Analyzing Audio Harmonics
                </h4>
                <p className="text-[10px] text-white/40 max-w-[240px] font-mono">
                  Gemini-3.5-flash is listening and extracting rhythm transients + vocal formant chords...
                </p>
              </>
            )}

            {micState === "success" && (
              <>
                <div className="bg-green-500/10 border border-green-500/20 h-14 w-14 rounded-full flex items-center justify-center text-green-400 mb-1">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <h4 className="text-xs font-display font-black text-green-400 uppercase tracking-wider">
                  Rhythm Structure Deployed!
                </h4>
                <p className="text-[10px] text-white/50 leading-relaxed max-w-[260px] font-medium font-sans">
                  The sequencer triggers have been updated to replicate your hummed patterns! Check out the updated grid.
                </p>
                <button
                  onClick={resetMicState}
                  className="mt-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-display font-black uppercase tracking-wider py-1.5 px-5 rounded-full transition"
                >
                  Record Another
                </button>
              </>
            )}

            {micState === "error" && (
              <>
                <div className="bg-red-500/10 border border-red-500/20 h-14 w-14 rounded-full flex items-center justify-center text-red-500 mb-1">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h4 className="text-xs font-display font-black text-red-500 uppercase tracking-wider">
                  Microphone Capture Failed
                </h4>
                <p className="text-[10px] text-white/45 max-w-[240px] font-mono leading-relaxed">
                  {micErrorMessage || "Capture terminated raw."}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={startRecording}
                    className="bg-brand-pink text-white text-[10px] font-display font-black uppercase tracking-wider py-1.5 px-4 rounded-full transition"
                  >
                    Retry Record
                  </button>
                  <button
                    onClick={resetMicState}
                    className="bg-white/5 border border-white/10 text-white text-[10px] font-display font-black uppercase tracking-wider py-1.5 px-4 rounded-full transition"
                  >
                    Reset
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Input Tray for Support Chat (Only displayed under support tab) */}
      {activeTab === "support" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputVal);
          }}
          className="border-t border-white/10 p-3 bg-black/40 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={
              isGeneratingTracks
                ? "Studio composing in progress..."
                : "Ask support or type: 'Make a tech-house beat'..."
            }
            disabled={isSending || isGeneratingTracks}
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-brand-pink transition font-medium font-sans"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isSending || isGeneratingTracks}
            className="bg-brand-pink hover:bg-pink-600 disabled:bg-neutral-800 disabled:text-white/20 text-white h-9 w-9 rounded-full flex items-center justify-center transition shrink-0 shadow-md shadow-brand-pink/20"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
