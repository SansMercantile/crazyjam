// CrazyJam Controller — Studio One control surface script.
// Applies CrazyJam AI mix/master moves to the Studio One mixer via the CrazyJam
// Bridge (localhost:8787), using Studio One's Control Surface SDK (JavaScript).
//
// Install: copy this folder (CrazyJam Controller/) into
//   Documents\Studio One\Control Surfaces\CrazyJam Controller\
// Then in Studio One: Options > External Devices > Add > CrazyJam Controller.

var BRIDGE = "http://127.0.0.1:8787";

class CrazyJamController extends PreSonus.ControlSurfaceComponent
{
    onInit(hostComponent)
    {
        super.onInit(hostComponent);
        this.debugLog = true;
        this.log("CrazyJam Controller ready (bridge: " + BRIDGE + ")");
        this._applyMoves = [];
    }

    onExit()
    {
        this.log("CrazyJam Controller shut down");
        super.onExit();
    }

    // Called by the bridge's apply endpoint (via a MIDI trigger or polling).
    applyMixMoves(moves)
    {
        var applied = 0;
        for (var i = 0; i < moves.length; i++) {
            var mv = moves[i];
            var track = mv.track || 0;
            var action = mv.action;
            var value = mv.value;
            try {
                if (action === "volume") {
                    this.hostComponent.paramList.getParam("mixerChannel" + track + ".volume").value = value;
                } else if (action === "pan") {
                    this.hostComponent.paramList.getParam("mixerChannel" + track + ".pan").value = value;
                } else if (action === "mute") {
                    this.hostComponent.paramList.getParam("mixerChannel" + track + ".mute").value = value ? 1 : 0;
                } else if (action === "solo") {
                    this.hostComponent.paramList.getParam("mixerChannel" + track + ".solo").value = value ? 1 : 0;
                }
                applied++;
            } catch (e) {
                this.log("skip " + action + ": " + e);
            }
        }
        this.log("applied " + applied + " mix moves");
        return applied;
    }

    // Trigger: a mapped CC fires the bridge's apply endpoint.
    onMidiEvent(status, data1, data2)
    {
        if (status == 0xB0 && data1 == 20 && data2 > 0) {
            this._fetchAndApply("/api/bridge/mix-master/apply");
            return true; // consumed
        }
        if (status == 0xB0 && data1 == 21 && data2 > 0) {
            this._fetchAndApply("/api/bridge/mix-master/apply-master");
            return true;
        }
        return false; // let host handle the rest
    }

    _fetchAndApply(path)
    {
        // Studio One's scripting can't do HTTP directly; the bridge polls the
        // surface file or the MIDI port instead. This is the interface the
        // bridge calls into.
        this.log("apply requested: " + path);
        // The bridge's apply endpoint is polled externally; this just logs the trigger.
    }
}
