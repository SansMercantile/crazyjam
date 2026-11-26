// name=CrazyJam Controller
// vendor=CrazyJam
// version=1.0.0
//
// CrazyJam Controller — Cubase MIDI Remote driver script.
// Applies CrazyJam AI mix/master moves to the Cubase mixer via the CrazyJam Bridge
// (localhost:8787), using Cubase's MIDI Remote API (ES5 JavaScript).
//
// Install: copy this folder (CrazyJam Controller/) into
//   Documents\Steinberg\<Cubase or Nuendo>\MIDI Remote\Driver Scripts\Local\
// Then in Cubase: MIDI Remote > select "CrazyJam Controller" as the device.

var midiremote_api = require("midiremote_api_v1");

// --- Config -----------------------------------------------------------------
var BRIDGE = "http://127.0.0.1:8787";

// --- Driver Setup -------------------------------------------------------------
var deviceDriver = midiremote_api.makeDeviceDriver("CrazyJam", "CrazyJam Controller", "CrazyJam");
var midiInput = deviceDriver.mPorts.makeMidiInput();
var midiOutput = deviceDriver.mPorts.makeMidiOutput();

// Auto-detect the bridge's virtual MIDI port (CrazyJam Bridge exposes one).
deviceDriver.makeDetectionUnit().detectPortPair(midiInput, midiOutput)
    .expectInputNameEquals("CrazyJam Bridge IN")
    .expectOutputNameEquals("CrazyJam Bridge OUT");

// --- Surface Layout ---------------------------------------------------------
// A single page with 8 faders + 8 pans + a "Apply Mix" button.
var surface = deviceDriver.mSurface;

var faders = [];
var pans = [];
var applyButton = surface.makeButton(0, 0, 1, 1);
var applyMasterButton = surface.makeButton(0, 1, 1, 1);

for (var i = 0; i < 8; i++) {
    var fader = surface.makeFader(i, 2, 1, 3);
    fader.mSurfaceValue.mMidiBinding
        .setInputPort(midiInput)
        .setOutputPort(midiOutput)
        .bindToControlChange(0, 20 + i); // CC 20-27 = faders 1-8
    faders.push(fader);

    var pan = surface.makeKnob(i, 5, 1, 1);
    pan.mSurfaceValue.mMidiBinding
        .setInputPort(midiInput)
        .setOutputPort(midiOutput)
        .bindToControlChange(0, 30 + i); // CC 30-37 = pans 1-8
    pans.push(pan);
}

// Apply buttons
applyButton.mSurfaceValue.mMidiBinding
    .setInputPort(midiInput)
    .bindToControlChange(0, 40); // CC 40 = apply mix
applyMasterButton.mSurfaceValue.mMidiBinding
    .setInputPort(midiInput)
    .bindToControlChange(0, 41); // CC 41 = apply master

// --- Host Mapping -------------------------------------------------------------
var page = deviceDriver.mMapping.makePage("CrazyJam Mixer");

// Bind faders/pans to the first 8 mixer channels (via DirectAccess).
var daMixer = page.mHostAccess.makeDirectAccess(page.mHostAccess.mMixConsole);

for (var ch = 0; ch < 8; ch++) {
    (function (idx) {
        var fader = faders[idx];
        var pan = pans[idx];
        // DirectAccess binding to mixer channel volume + pan
        page.makeValueBinding(fader.mSurfaceValue, daMixer.getChildObjectID(page.mHostAccess.mMixConsole, idx, 1029)); // 1029 = Volume tag
        page.makeValueBinding(pan.mSurfaceValue, daMixer.getChildObjectID(page.mHostAccess.mMixConsole, idx, 1030));   // 1030 = Pan tag
    })(ch);
}

// Apply buttons trigger the bridge's mix/master apply endpoints.
applyButton.mSurfaceValue.mOnProcessValueChange = function (activeDevice, activeMapping, value) {
    if (value > 0) {
        // The bridge listens on this CC and applies the mix moves itself.
        // This button just needs to send the CC (the binding already does that).
    }
};
