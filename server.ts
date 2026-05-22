/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// JSON Schema for direct structured outputs
const blueprintSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A stylish title for the music track." },
    genre: { type: Type.STRING, description: "The general music genre of the generated track." },
    tempo: { type: Type.INTEGER, description: "Musical tempo in BPM (between 75 and 140)." },
    scale: { type: Type.STRING, description: "The key and scale used (e.g. A Minor, C Major, F# Pentatonic)." },
    drumPatterns: {
      type: Type.OBJECT,
      properties: {
        kick: { type: Type.ARRAY, items: { type: Type.BOOLEAN }, description: "16 elements representing active steps for the Kick. True = trigger, False = rest." },
        snare: { type: Type.ARRAY, items: { type: Type.BOOLEAN }, description: "16 elements representing active steps for the Snare. True = trigger, False = rest." },
        hihat: { type: Type.ARRAY, items: { type: Type.BOOLEAN }, description: "16 elements representing active steps for the Hi-Hat. True = trigger, False = rest." },
        perc: { type: Type.ARRAY, items: { type: Type.BOOLEAN }, description: "16 elements representing active steps for the Percussion. True = trigger, False = rest." },
      },
      required: ["kick", "snare", "hihat", "perc"],
    },
    leadNotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.INTEGER, description: "The step index (0 to 15) when the note triggers." },
          note: { type: Type.STRING, description: "Note with octave (A4, B4, C5, D5, E5, F5, G5, A5) corresponding to the scale." },
        },
        required: ["step", "note"],
      },
      description: "Note triggers for the high-end Lead Synth line. Spread beautifully across the steps to create a catchy melody loop. Max 10.",
    },
    bassNotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.INTEGER, description: "The step index (0 to 15) when the note triggers." },
          note: { type: Type.STRING, description: "Low note with octave (A2, C3, D3, E3, G3) for the sub/bass synthesizer." },
        },
        required: ["step", "note"],
      },
      description: "Bass note triggers. Focus on strong downbeats (0, 4, 8, 12) or syncopated offbeats depending on the style. Max 8.",
    },
    padNotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.INTEGER, description: "Step index (0 to 15) when the chord or pad triggers." },
          note: { type: Type.STRING, description: "Mid-register note of the sustaining chord (e.g. A3, C4, E4, F4, G4) to fill the harmonic space." },
        },
        required: ["step", "note"],
      },
      description: "Harmonic pad/chord notes. Use the mid register to play sustained or rhythmic chord backings. Max 8.",
    },
    agentDebates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agentName: { type: Type.STRING, description: "Custom name of the agent (e.g., LofiMaster, BeatSqueeze, Harmona-7)." },
          role: { type: Type.STRING, description: "Agent's role (A&R, Groove, Harmonics, Mastering, System)." },
          message: { type: Type.STRING, description: "What this specific agent suggests or does to improve the track." },
          phase: { type: Type.STRING, description: "Workflow phase (e.g., A&R, Sequence, Harmonics, Mixdown)." },
        },
        required: ["agentName", "role", "message", "phase"],
      },
      description: "A transcript of 4-6 chat messages from specialized agents discussing how to implement this track prompt, showing collaborative synergy.",
    },
  },
  required: [
    "title",
    "genre",
    "tempo",
    "scale",
    "drumPatterns",
    "leadNotes",
    "bassNotes",
    "padNotes",
    "agentDebates",
  ],
};

import { exec } from "child_process";

interface PythonBridgeResult {
  status: "success" | "error";
  tempo: number;
  key: string;
  instruments: string[];
  complexity: number;
  genre: string;
  style: string;
  mood: string;
  notes_count: number;
  quality_score: number;
  agentDebatesExtensions: Array<{
    agentName: string;
    role: string;
    message: string;
    phase: string;
  }>;
  message?: string;
}

function runPythonCompositionBridge(params: {
  genre?: string;
  style?: string;
  mood?: string;
  tempo?: number;
  key?: string;
  prompt: string;
  complexity?: number;
}): Promise<PythonBridgeResult | null> {
  return new Promise((resolve) => {
    const inputArg = JSON.stringify(params);
    const escapedInput = inputArg.replace(/'/g, "'\\''");
    
    exec(`python3 core/bridge.py '${escapedInput}'`, (error, stdout, stderr) => {
      if (error) {
        console.warn("Python composition bridge failed. Falling back to default:", error.message);
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        console.warn("Fail to parse python bridge output:", stdout, err);
        resolve(null);
      }
    });
  });
}

// API Route: Generate Blueprint
app.post("/api/generate-blueprint", async (req, res): Promise<any> => {
  try {
    const { prompt, agentsSettings } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Run heuristics to detect genre, style, mood for the specialized Python engine
    let detectedGenre = "electronic";
    let detectedStyle = "techno";
    let detectedMood = "energetic";

    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("lofi") || lowerPrompt.includes("lo-fi") || lowerPrompt.includes("chill") || lowerPrompt.includes("relax")) {
      detectedGenre = "electronic";
      detectedStyle = "lofi";
      detectedMood = "calm";
    } else if (lowerPrompt.includes("classical") || lowerPrompt.includes("piano") || lowerPrompt.includes("symphony") || lowerPrompt.includes("acoustic")) {
      detectedGenre = "classical";
      detectedStyle = "classical";
      detectedMood = "bright";
    } else if (lowerPrompt.includes("jazz") || lowerPrompt.includes("swing") || lowerPrompt.includes("blues")) {
      detectedGenre = "jazz";
      detectedStyle = "jazz";
      detectedMood = "calm";
    } else if (lowerPrompt.includes("rock") || lowerPrompt.includes("guitar") || lowerPrompt.includes("metal") || lowerPrompt.includes("punk")) {
      detectedGenre = "rock";
      detectedStyle = "rock";
      detectedMood = "energetic";
    } else if (lowerPrompt.includes("pop") || lowerPrompt.includes("dance") || lowerPrompt.includes("disco")) {
      detectedGenre = "pop";
      detectedStyle = "pop";
      detectedMood = "upbeat";
    }

    // Call Python bridge to query core composition engine and genre specialist agents
    const pythonResult = await runPythonCompositionBridge({
      genre: detectedGenre,
      style: detectedStyle,
      mood: detectedMood,
      prompt,
      complexity: 0.7
    });

    const agentsContext = agentsSettings
      ? `Active Agents Configuration: ${JSON.stringify(agentsSettings)}`
      : "Default CrazyJam 100+ multi-agent swarm is active.";

    let pythonContext = "";
    let extraAgentDebates: any[] = [];
    if (pythonResult && pythonResult.status === "success") {
      extraAgentDebates = pythonResult.agentDebatesExtensions;
      pythonContext = `
        The CrazyJam specialized Python Composition Engine & Genre Specialist Agent in '/core' and '/agents' directories optimized these specifications:
        - Genre/Style parameters are calibrated to: ${pythonResult.genre} (${pythonResult.style})
        - Suggested optimal tempo is exactly: ${pythonResult.tempo} BPM
        - Suggested musical key is: ${pythonResult.key}
        - Quality composition index calculated: ${pythonResult.quality_score}

        You MUST feed these calibrated features directly and precisely into the JSON format:
        - 'tempo' should be set specifically to: ${pythonResult.tempo}
        - 'scale' should be set specifically to: "${pythonResult.key}"
        - Incorporate these specialized Python engineering agent debates inside the final 'agentDebates' array:
          ${JSON.stringify(extraAgentDebates)}
      `;
    }

    const systemPrompt = `
      You are the core of CrazyJam™ AI-Native Music Composition System.
      Your multi-agent network consists of 100+ neural specialized processors.
      We operate as a coordinated team:
      1. Genre Specialists: Set structural harmonics, scales, and style vibes.
      2. Groove Specialists: Synthesize drums and percussive syncopation patterns.
      3. Harmonic Architects: Construct bass sequences and chord pads in a specific scale.
      4. Production Experts / Mastering: Handle leveling, dynamic adjustments, pan, and effects.

      Given the user's prompt, generate a fully structured 16-step composition blueprint in JSON.
      Your output must strictly conform to the provided JSON schema. Ensure:
      - 'tempo' is an integer between 75 and 140.
      - 'scale' matches standard musical keys (e.g. "D minor", "G major", "E Phrygian").
      - Drum patterns are arrays of exactly 16 booleans for kick, snare, hihat, and perc. Make sure they sound rhythmically solid (avoid random noise).
      - Lead, bass, and pad steps MUST strictly be in the range [0..15].
      - Low bass note elements must be bass-register (A2, C3, D3, E3, G3, etc.).
      - Mid pad notes must support the chords (A3, C4, E4, etc.).
      - High lead notes must compose a solid melody line (C5, D5, E5, G5, etc.).
      - 'agentDebates' contains 4 to 6 entries of multi-agent debate and collaboration representing our inner swarm and how they decided on beat placements, bass loops, scales, and leveling coefficients to execute: "${prompt}".

      ${agentsContext}
      ${pythonContext}
    `;

    const userPromptMsg = `Compose a track blueprint for: "${prompt}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPromptMsg,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: blueprintSchema,
        temperature: 1.0,
      },
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("No text response from Gemini model.");
    }

    const compiledBlueprint = JSON.parse(textResult);
    
    // Inject extra debates from python bridge if they didn't get fully merged
    if (extraAgentDebates && extraAgentDebates.length > 0 && compiledBlueprint.agentDebates) {
      compiledBlueprint.agentDebates = [
        ...extraAgentDebates,
        ...compiledBlueprint.agentDebates.slice(0, 3)
      ];
    }
    
    return res.json(compiledBlueprint);
  } catch (error: any) {
    console.error("Gemini blueprint generation error:", error);
    return res.status(500).json({
      error: "Failed to generate track blueprint via CrazyJam Intelligent Swarm.",
      details: error.message,
    });
  }
});

// API Route: AI Powered Customer Support Chatbot
app.post("/api/customer-support", async (req, res): Promise<any> => {
  try {
    const { message, chatHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const systemInstruction = `
      You are the CrazyJam AI Customer Support and Studio Assistant.
      You help producers, musicians, and DJs learn how to use the CrazyJam DAW (Digital Audio Workstation).
      
      DAW features you can explain and teach:
      1. Sequencer Grid: 16-step modular sequencer for Kick, Snare, Hi-Hat, and Percussion.
      2. AI Agents: Active neural agent controllers that automatically shape synthesis release, transient limiters, and sound mix. Users can configure autonomy & bias levels.
      3. Synths & Effects: Cutoff filters, Resonance (Q), Delay Time, Delay Feedback, and Release envelope knobs which shape the audio. Fully interactive.
      4. Sampler presets: Presets such as Moody Cyberpunk Synthwave, Cinematic Industrial Dark Techno, Nostalgic 86 Lofi Beats.
      5. MIDI Instrumentation Console: Trigger customized arpeggiators, scales, and live pitch.
      6. Vocal Hum-To-Beat Recorder (NEW!): Users can record their voice (humming, singing, or beatboxing) to have the AI analyze and translate it into a custom sequencer arrangement! Explain this feature with excitement.
      
      IMPORTANT Integration: 
      If the user wants you to make them a song, make a beat, compose a track, or play a demo (e.g. "make a track for me", "compose a slow study lofi beat", "generate a techno banger", "make a song of your choice"), you MUST respond in text saying you are generating it, AND you must set "triggerComposition" key to true, and specify the prompt in "triggerCompositionPrompt" key.
      
      Always return a JSON object containing:
      {
        "text": "Your helpful textual reply assisting the user (in elegant markdown containing bold terms)",
        "triggerComposition": true or false,
        "triggerCompositionPrompt": "the exact composition description (or empty string)"
      }
    `;

    const chatHistoryParts = chatHistory ? chatHistory.map((h: any) => ({
      role: h.sender === "user" ? "user" : "model",
      parts: [{ text: h.text }]
    })) : [];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...chatHistoryParts,
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "Your friendly help text or response to request." },
            triggerComposition: { type: Type.BOOLEAN, description: "Set to true if user asked to generate, create, or play a song/track." },
            triggerCompositionPrompt: { type: Type.STRING, description: "The music description prompt to send to the DAW sequencer for creation." }
          },
          required: ["text", "triggerComposition", "triggerCompositionPrompt"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI support");
    const parsed = JSON.parse(resultText);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Support API error:", error);
    return res.status(500).json({
      error: "Support agent temporary failure",
      details: error.message
    });
  }
});

// API Route: Multimodal Audio Hum-to-Beat Analyzer
app.post("/api/hum-to-beat", async (req, res): Promise<any> => {
  try {
    const { audio, mimeType } = req.body;
    if (!audio) {
      return res.status(400).json({ error: "Audio base64 data is required" });
    }

    const systemPrompt = `
      You are the CrazyJam audio analyzer and rhythm fabricator.
      Listen to this hummed, sung, or beatboxed audio recording.
      Your goal is to parse the rhythm, key transitions, speed, and percussive transients.
      Then translate this organic human capture into a clean 16-step composition blueprint in JSON matching the specified schema format.
      Make sure to place percussion steps (kick, snare, hi-hat) exactly where the transients align in the recorded hums, clicks, or singing. Match the lead melody pitches with the average pitch profile of the voice!
      
      Generate a fully structured 16-step composition blueprint in JSON.
      Your output must strictly conform to the provided JSON schema. Ensure:
      - 'tempo' is matched as close as possible to the recorded rate (between 75 and 140).
      - 'scale' matches standard musical keys (e.g. "D minor", "G major", "E Phrygian").
      - Drum patterns are arrays of exactly 16 booleans for kick, snare, hihat, and perc. Make sure they sound rhythmically solid (avoid random noise).
      - Lead, bass, and pad steps MUST strictly be in the range [0..15].
      - 'agentDebates' contains 4 to 6 entries of multi-agent debate describing what they heard in the user's recorded vocal mic capture (e.g. "Heard beatboxing snare on step 4 and 12", "Extracted a G4 pitch humming on step 2") and how they structured the arrangement based on it.
    `;

    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: audio,
      },
    };

    const textPart = {
      text: "Transform this vocal humming/beatboxing/singing track into a structured music sequencer blueprint."
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [audioPart, textPart] },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: blueprintSchema,
        temperature: 0.9,
      },
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("No text response from audio analysis model.");
    }

    const compiledBlueprint = JSON.parse(textResult);
    return res.json(compiledBlueprint);
  } catch (error: any) {
    console.error("Gemini hum-to-beat error:", error);
    return res.status(500).json({
      error: "Failed to translate audio humming capture into DAW arrangement.",
      details: error.message,
    });
  }
});

// Setup Vite Dev server or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CrazyJam Engine Running on Port http://localhost:${PORT}`);
  });
}

startServer();
