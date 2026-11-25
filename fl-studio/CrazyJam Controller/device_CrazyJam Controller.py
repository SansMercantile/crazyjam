# name=CrazyJam Controller
# supportedDevices=CrazyJam Controller
#
# CrazyJam Controller — MIDI controller script for FL Studio.
# Applies CrazyJam AI mix/master moves to the FL mixer: track volume/pan/stereo-sep
# and the built-in 3-band EQ, driven by the CrazyJam Bridge (localhost:8787).
#
# Install: copy this folder (CrazyJam Controller/) into
#   Documents\Image-Line\FL Studio\Settings\Hardware\
# Then in FL Studio: MIDI Settings > select "CrazyJam Controller" as Controller type.

import mixer
import ui
import json
import urllib.request
import urllib.error

BRIDGE = "http://127.0.0.1:8787"

# FL EQ band indices (built-in 3-band EQ: 0=low shelf, 1=peaking, 2=high shelf).
EQ_LOW, EQ_MID, EQ_HIGH = 0, 1, 2


def _log(msg):
    ui.setHintMsg("CrazyJam: " + str(msg))


def _http(path, payload=None, method="POST", timeout=120):
    data = json.dumps(payload or {}).encode() if payload is not None else None
    req = urllib.request.Request(BRIDGE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def _db_to_norm(db):
    # FL EQ gain is 0..1 normalized; -18..+18 dB maps roughly onto it.
    return max(0.0, min(1.0, (db + 18.0) / 36.0))


def _hz_to_norm(hz):
    # FL EQ frequency is 0..1 normalized; log scale 20Hz..20kHz.
    import math
    lo, hi = 20.0, 20000.0
    return max(0.0, min(1.0, (math.log10(max(hz, lo)) - math.log10(lo)) / (math.log10(hi) - math.log10(lo))))


def _apply_eq(track, band, freq_hz=None, gain_db=None, q=None):
    if freq_hz is not None:
        mixer.setEqFrequency(track, band, _hz_to_norm(freq_hz))
    if gain_db is not None:
        mixer.setEqGain(track, band, _db_to_norm(gain_db))
    if q is not None:
        mixer.setEqBandwidth(track, band, max(0.0, min(1.0, q / 10.0)))


def apply_mix_moves(moves):
    """Apply a structured move list to the mixer. moves: list of dicts with
    {track, action, value} where action in
    volume|pan|stereo_sep|eq_low_gain|eq_mid_gain|eq_high_gain|eq_low_freq|eq_mid_freq|eq_high_freq|eq_q"""
    applied = 0
    for mv in moves:
        track = mv.get("track", 0)
        action = mv.get("action")
        value = mv.get("value")
        try:
            if action == "volume":
                mixer.setTrackVolume(track, max(0.0, min(1.0, float(value))))
            elif action == "pan":
                mixer.setTrackPan(track, max(-1.0, min(1.0, float(value))))
            elif action == "stereo_sep":
                mixer.setTrackStereoSep(track, max(-1.0, min(1.0, float(value))))
            elif action == "eq_low_gain":
                mixer.setEqGain(track, EQ_LOW, _db_to_norm(float(value)))
            elif action == "eq_mid_gain":
                mixer.setEqGain(track, EQ_MID, _db_to_norm(float(value)))
            elif action == "eq_high_gain":
                mixer.setEqGain(track, EQ_HIGH, _db_to_norm(float(value)))
            elif action == "eq_low_freq":
                mixer.setEqFrequency(track, EQ_LOW, _hz_to_norm(float(value)))
            elif action == "eq_mid_freq":
                mixer.setEqFrequency(track, EQ_MID, _hz_to_norm(float(value)))
            elif action == "eq_high_freq":
                mixer.setEqFrequency(track, EQ_HIGH, _hz_to_norm(float(value)))
            elif action == "eq_q":
                mixer.setEqBandwidth(track, EQ_MID, max(0.0, min(1.0, float(value) / 10.0)))
            applied += 1
        except Exception as e:
            _log("skip %s: %s" % (action, e))
    return applied


def OnInit():
    _log("ready (bridge: %s)" % BRIDGE)
    # try a no-op so the bridge can confirm the controller is present
    try:
        _http("/api/bridge/ping", {})
    except Exception:
        pass


def OnDeInit():
    _log("shut down")


def OnMidiIn(event):
    pass


def OnMidiMsg(event):
    # Custom trigger: a specific CC triggers a mix-apply cycle.
    # CC 20 = analyze + apply; CC 21 = apply master moves only.
    if event.status == 0xB0 and event.data1 == 20:
        try:
            result = _http("/api/bridge/mix-master/apply", {"render": False})
            if result.get("success") and result.get("moves"):
                n = apply_mix_moves(result["moves"])
                _log("applied %d mix moves" % n)
            else:
                _log(result.get("errorMessage", "no moves"))
        except Exception as e:
            _log("apply failed: %s" % e)
        event.handled = True
    elif event.status == 0xB0 and event.data1 == 21:
        try:
            result = _http("/api/bridge/mix-master/apply-master", {})
            if result.get("success") and result.get("moves"):
                n = apply_mix_moves(result["moves"])
                _log("applied %d master moves" % n)
            else:
                _log(result.get("errorMessage", "no master moves"))
        except Exception as e:
            _log("master apply failed: %s" % e)
        event.handled = True
