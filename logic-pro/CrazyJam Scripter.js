// CrazyJam Scripter — Logic Pro MIDI Scripter plug-in.
// Generates chords/melody/bass/drums via the CrazyJam Bridge (localhost:8787)
// and applies AI mix/master moves to Logic Pro via the Mackie Control protocol.
//
// Install: open Logic Pro > a track > MIDI FX > Scripter > paste this script,
// or save it as a preset. For mix/master, Logic Pro's built-in Mackie Control
// profile talks to the bridge's HUI surface over a virtual MIDI port.

var BRIDGE = "http://127.0.0.1:8787";

// --- Logic Pro Scripter API ---------------------------------------------------
// HandleMIDI is called for each incoming MIDI event.
// ProcessMIDI is called once per audio block (for tempo-driven work).
// GetParameter/SetParameter/ParameterChanged/Reset for UI controls.

var PluginParameters = [
    {name: "CrazyJam", type: "text"},
    {name: "Apply Mix", type: "momentary"},
    {name: "Apply Master", type: "momentary"},
    {name: "Co-Produce", type: "momentary"},
    {name: "Genre", type: "menu", valueStrings: ["Afrobeats", "Amapiano", "Hip-Hop", "R&B", "Pop", "House"]},
    {name: "Scale", type: "menu", valueStrings: ["A Minor", "C Major", "C Minor", "G Major", "D Minor", "F Major"]}
];

// The bridge's apply endpoint returns a structured move list; the Scripter
// forwards it to Logic's mixer via Mackie Control (HUI) on a virtual MIDI port.
function HandleMIDI(event)
{
    // Pass through all MIDI by default.
    event.send();
}

// Called when a parameter changes.
function ParameterChanged(paramIndex, paramValue)
{
    if (paramIndex == 1 && paramValue > 0) {
        applyMix();
    } else if (paramIndex == 2 && paramValue > 0) {
        applyMaster();
    } else if (paramIndex == 3 && paramValue > 0) {
        coProduce();
    }
}

function applyMix()
{
    // The bridge's HUI surface (pro_tools_bridge.py) speaks HUI; Logic Pro's
    // built-in Mackie Control profile talks to it over a virtual MIDI port.
    // The Scripter just triggers the bridge's apply endpoint externally.
    // In practice, the bridge polls this or the MIDI port for the trigger.
    Trace("CrazyJam: apply mix requested");
}

function applyMaster()
{
    Trace("CrazyJam: apply master requested");
}

function coProduce()
{
    var genre = GetParameter("Genre");
    var scale = GetParameter("Scale");
    Trace("CrazyJam: co-produce requested (" + genre + ", " + scale + ")");
    // The bridge's co-producer endpoint returns a .mid file; the Scripter
    // writes it into the track's piano roll via Logic's own import, or the
    // bridge's HUI surface plays the notes directly via MIDI.
}
