# CrazyJam DAW Extension — FL Studio (first DAW)

Brings CrazyJam's three pillars into FL Studio:

1. **AI co-producer** — generate chords / melody / bass / drums straight into the
   FL Studio piano roll from your CrazyJam GPU models.
2. **Visuals + teasers** — cover art, AI video, and 15s teasers (via the bridge →
   the existing `/api/album-art` + `/api/video-director` cloud endpoints).
3. **Promotion + publishing** — playlist pitching, chart registration, Beatport
   (via the bridge → the existing `/api/promotion` endpoints).

The FL **Piano Roll Script** talks only to the local **CrazyJam Bridge**
(`http://127.0.0.1:8787`); the bridge holds your CrazyJam login token and forwards
to the real cloud backend, so **no credentials live in the DAW** and the same GPU
models + credits power both the DAW and the web studio.

```
FL Studio (Piano Roll script)  --HTTP-->  CrazyJam Bridge (localhost:8787)
                                              |
                                              v
                                   CrazyJam cloud backend (FastAPI)
                                   - co-producer blueprint (Bedrock)
                                   - album art / video director
                                   - promotion hub
```

## Files

| File | Purpose |
|---|---|
| `fl-studio/CrazyJam Co-Producer.pyscript` | The FL Studio Piano Roll script (install this into FL). |
| `backend/bridge/bridge_app.py` | The localhost CrazyJam Bridge (FastAPI). |
| `backend/start_bridge.ps1` | One-command bridge launcher. |

## 1. Install the FL Studio script

Copy `CrazyJam Co-Producer.pyscript` to:

```
Documents\Image-Line\FL Studio\Settings\Piano roll scripts\
```

In FL Studio: **Piano roll → hamburger (top-left) → Piano roll scripts → CrazyJam Co-Producer**.

## 2. Run the CrazyJam Bridge

```powershell
cd constellation\crazyjam\backend
# one-time: put your CrazyJam login token in bridge\.token (or set CRAZYJAM_TOKEN)
.\start_bridge.ps1
```

The bridge listens on `http://127.0.0.1:8787`. Point it at a remote backend with
`$env:CRAZYJAM_API = "https://your-alb"` (defaults to the local backend on :8000).

## 3. Use it

1. Open a channel's piano roll in FL Studio.
2. Run **CrazyJam Co-Producer**.
3. Set a prompt, genre, scale, tempo, bars, and which parts to write
   (Chords / Melody / Bass / Drums).
4. OK — the script calls the bridge, which calls your cloud blueprint model, and
   the generated notes drop straight into the piano roll (color-coded per part).

Notes land as **standard MIDI numbers** (60 = middle C) — FL Studio labels 60 as
"C5" in the UI, which is only cosmetic.

## How the parts map to the piano roll

| Part | Color | Group | Notes |
|---|---|---|---|
| Chords | 1 | auto | simultaneous, snapped to the chosen scale |
| Bass   | 2 | auto | clamped to C1–C3 register |
| Melody | 3 | auto | snapped to the chosen scale |
| Drums  | 4 | auto | GM map (36 kick, 38 snare, 42 hihat, 39 clap) |

## Roadmap (next DAWs)

- **Cubase** — Steinberg VST3 / MIDI Remote or Lua script calling the same bridge.
- **Pro Tools** — AAX (needs Avid SDK + iLok signing); alternatively a MIDI/clip
  workflow via the same bridge.
- **Ableton** — Max for Live device calling the same bridge (fastest after FL).
