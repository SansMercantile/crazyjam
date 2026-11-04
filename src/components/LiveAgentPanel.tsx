/**
 * LiveAgentPanel: real-time voice + live-avatar support agent.
 *
 * Connects to the Pipecat backend over WebSocket (/api/agent/support for
 * voice-only, /api/agent/avatar for voice + animated face). Streams mic PCM
 * to the agent, plays the Polly voice back, and (avatar mode) draws the
 * MuseTalk lip-synced face frames to a <canvas> as they arrive.
 *
 * Frame wire format from the backend (agent_service/transport.py):
 *   - TTS audio: raw 16kHz 16-bit mono PCM (binary message)
 *   - Face frame: 8-byte header 'FJ' + seq(u32) + reserved(u16,u16), then a JPEG
 */
import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, AlertTriangle, User } from "lucide-react";
import { openAgentSocket, AgentKind } from "../utils/api";

interface LiveAgentPanelProps {
  kind: AgentKind;
  audioCtx?: AudioContext | null;
}

const PCM_SAMPLE_RATE = 16000;

export const LiveAgentPanel: React.FC<LiveAgentPanelProps> = ({ kind, audioCtx }) => {
  const [state, setState] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [transcript, setTranscript] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // voice playback queue (PCM -> AudioBuffer, scheduled back-to-back)
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => () => stop(), []);

  const stop = () => {
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    processorRef.current?.disconnect();
    micSourceRef.current?.disconnect();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    processorRef.current = null;
    micSourceRef.current = null;
    micStreamRef.current = null;
    setState("idle");
  };

  /** Decode 16-bit PCM to an AudioBuffer and queue it for gapless playback. */
  const playPcm = (bytes: ArrayBuffer) => {
    const ctx = playbackCtxRef.current || audioCtx;
    if (!ctx) return;
    playbackCtxRef.current = ctx;
    const int16 = new Int16Array(bytes);
    const buf = ctx.createBuffer(1, int16.length, PCM_SAMPLE_RATE);
    const chan = buf.getChannelData(0);
    for (let i = 0; i < int16.length; i++) chan[i] = int16[i] / 32768;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    const start = Math.max(now + 0.05, nextPlayTimeRef.current);
    src.start(start);
    nextPlayTimeRef.current = start + buf.duration;
  };

  /** Draw one MuseTalk JPEG face frame to the canvas. */
  const drawFace = (jpeg: ArrayBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = new Blob([jpeg], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleBinary = (data: ArrayBuffer) => {
    const bytes = new Uint8Array(data);
    // face frame: magic 'FJ' (0x46 0x4A) at the start
    if (bytes.length > 10 && bytes[0] === 0x46 && bytes[1] === 0x4a) {
      drawFace(data.slice(8));
    } else {
      playPcm(data);
    }
  };

  const startMicStreaming = (ws: WebSocket, stream: MediaStream) => {
    const ctx = playbackCtxRef.current || audioCtx || new AudioContext();
    playbackCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    micSourceRef.current = source;
    // ScriptProcessor downsamples to 16kHz and ships Int16 PCM frames
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    const ratio = ctx.sampleRate / PCM_SAMPLE_RATE;
    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const outLen = Math.floor(input.length / ratio);
      const pcm = new Int16Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const s = input[Math.floor(i * ratio)];
        pcm[i] = Math.max(-1, Math.min(1, s)) * 32767;
      }
      ws.send(pcm.buffer);
    };
    source.connect(processor);
    processor.connect(ctx.destination);
  };

  const start = async () => {
    setState("connecting");
    setErrorMsg("");
    try {
      const ws = openAgentSocket(kind);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;
          startMicStreaming(ws, stream);
          setState("live");
        } catch (err: any) {
          setErrorMsg(err.message || "Microphone access denied");
          setState("error");
          ws.close();
        }
      };
      ws.onmessage = (ev) => {
        if (typeof ev.data === "string") {
          // control / transcript frames from Pipecat's serializer
          setTranscript(ev.data.slice(0, 400));
        } else {
          handleBinary(ev.data as ArrayBuffer);
        }
      };
      ws.onerror = () => {
        setErrorMsg("Connection to the agent dropped");
        setState("error");
      };
      ws.onclose = (ev) => {
        if (state === "connecting") {
          setErrorMsg(ev.code === 4401 || ev.code === 1008 ? "Not authorized - sign in again." : "Agent unavailable");
          setState("error");
        } else if (state === "live") {
          setState("idle");
        }
      };
    } catch (err: any) {
      setErrorMsg(err.message || "Could not open the agent");
      setState("error");
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-brand-border pb-3">
        <User className="h-4 w-4 text-brand-gold" />
        <div>
          <span className="text-[10px] text-brand-gold">Live agent</span>
          <h3 className="font-display text-[14px] text-brand-ink">
            {kind === "avatar" ? "Talk to the artist (voice + face)" : "Talk to support (voice)"}
          </h3>
        </div>
      </div>

      {kind === "avatar" && (
        <div className="bg-black rounded-xl overflow-hidden border border-brand-border aspect-video flex items-center justify-center">
          {state === "live" ? (
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] text-brand-ink-muted">Face stream appears here when live</span>
          )}
        </div>
      )}

      {transcript && (
        <div className="bg-brand-surface-2 border border-brand-border rounded-lg p-2.5 max-h-[90px] overflow-y-auto">
          <p className="text-[10px] text-brand-ink-muted leading-relaxed">{transcript}</p>
        </div>
      )}

      {state === "idle" && (
        <button
          onClick={start}
          className="metal-gold text-[12px] font-semibold py-2.5 px-6 rounded-full transition-all flex items-center justify-center gap-2 self-center"
        >
          <Mic className="h-3.5 w-3.5" /> Go live
        </button>
      )}
      {state === "connecting" && (
        <div className="flex items-center justify-center gap-2 text-brand-ink-muted text-[12px] py-2">
          <Loader2 className="h-4 w-4 animate-spin text-brand-gold" /> Connecting to the agent...
        </div>
      )}
      {state === "live" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            Live — speak now
          </div>
          <button
            onClick={stop}
            className="bg-red-500/90 hover:bg-red-500 text-white text-[11px] font-medium py-1.5 px-4 rounded-full transition-all flex items-center gap-1.5"
          >
            <Square className="h-3 w-3 fill-current" /> End
          </button>
        </div>
      )}
      {state === "error" && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-red-400 text-[12px]">
            <AlertTriangle className="h-4 w-4" /> {errorMsg || "Connection failed"}
          </div>
          <button onClick={start} className="metal-gold text-[11px] font-semibold py-1.5 px-5 rounded-full transition-all">
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
