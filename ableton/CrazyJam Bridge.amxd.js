// CrazyJam Bridge — Max for Live device (JavaScript driver for the CrazyJam Bridge).
// This is the logic layer for the .amxd device. It talks to the local CrazyJam
// Bridge (http://127.0.0.1:8787) and applies AI co-production moves to Ableton Live.
//
// Install: copy this file into your User Library > Max MIDI Effect folder, then
// drag the device onto a MIDI track in Ableton Live.

inlets = 1;
outlets = 1;

var BRIDGE = "http://127.0.0.1:8787";

// --- HTTP helper (uses the `http` Max object via a sub-patcher in the real device;
//     here we stub it with a synchronous socket for the JS layer) --------------
function httpPost(path, payload) {
    // In the real .amxd this routes to a [http] object. For the JS layer we
    // return a promise-like result via a callback.
    var result = { success: false, errorMessage: "no http object" };
    // The .amxd handles the actual HTTP; this function is the interface.
    outlet(0, "http_post", path, JSON.stringify(payload));
    return result;
}

// --- Live Object Model helpers ------------------------------------------------
function liveObject(path) {
    var obj = new LiveAPI(path);
    return obj;
}

function setTrackVolume(trackIndex, value) {
    var track = liveObject("live_set tracks " + trackIndex);
    if (track) {
        track.set("volume", value);
    }
}

function setTrackPan(trackIndex, value) {
    var track = liveObject("live_set tracks " + trackIndex);
    if (track) {
        track.set("panning", value);
    }
}

function setTrackMute(trackIndex, muted) {
    var track = liveObject("live_set tracks " + trackIndex);
    if (track) {
        track.set("mute", muted ? 1 : 0);
    }
}

function setTrackSolo(trackIndex, solo) {
    var track = liveObject("live_set tracks " + trackIndex);
    if (track) {
        track.set("solo", solo ? 1 : 0);
    }
}

// --- Mix/master apply ---------------------------------------------------------
function applyMixMoves(moves) {
    var applied = 0;
    for (var i = 0; i < moves.length; i++) {
        var mv = moves[i];
        var track = mv.track || 0;
        var action = mv.action;
        var value = mv.value;
        try {
            if (action === "volume") {
                setTrackVolume(track, value);
            } else if (action === "pan") {
                setTrackPan(track, value);
            } else if (action === "mute") {
                setTrackMute(track, value);
            } else if (action === "solo") {
                setTrackSolo(track, value);
            }
            applied++;
        } catch (e) {
            post("CrazyJam: skip " + action + ": " + e + "\n");
        }
    }
    return applied;
}

// --- Public API (called from the .amxd) ---------------------------------------
function apply() {
    // Trigger the bridge's apply endpoint and apply the returned moves.
    var result = httpPost("/api/bridge/mix-master/apply", {});
    if (result.success && result.moves) {
        var n = applyMixMoves(result.moves);
        post("CrazyJam: applied " + n + " mix moves\n");
    } else {
        post("CrazyJam: apply failed: " + result.errorMessage + "\n");
    }
}

function applyMaster() {
    var result = httpPost("/api/bridge/mix-master/apply-master", {});
    if (result.success && result.moves) {
        var n = applyMixMoves(result.moves);
        post("CrazyJam: applied " + n + " master moves\n");
    } else {
        post("CrazyJam: master apply failed: " + result.errorMessage + "\n");
    }
}

function coProduce(prompt, genre, scale, tempo, bars) {
    var result = httpPost("/api/co-producer/generate", {
        prompt: prompt || "",
        genre: genre || "Afrobeats",
        scale: scale || "A Minor",
        tempo: tempo || 104,
        bars: bars || 1,
        parts: { chords: true, melody: true, bass: true, drums: false }
    });
    if (result.success && result.data) {
        // The .amxd writes these notes into a MIDI clip via the Live API.
        outlet(0, "co_producer_data", result.data);
        post("CrazyJam: generated " + (result.data.melody ? result.data.melody.length : 0) + " melody notes\n");
    } else {
        post("CrazyJam: generation failed: " + result.errorMessage + "\n");
    }
}
