"""Our own background tracks (26 Nov 2026): synthesised here, so there is no licence question.
Usage: python3 synth.py <name> ; writes <name>.wav (mono 22050 Hz)."""
import math, random, struct, sys, wave
SR = 22050
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
TRACKS = {
  # name: bpm, bars per chord, chords (midi), parts
  "calm-morning": dict(bpm=76, bars=2, chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]], parts=["pad","arp_slow","bass_long"]),
  "bright-day":   dict(bpm=100, bars=1, chords=[[60,64,67],[55,59,62],[57,60,64],[53,57,60]], parts=["pad","arp","bass","kick_soft","hat"]),
  "warm-studio":  dict(bpm=84, bars=2, chords=[[50,54,57,61],[47,50,54,57],[43,47,50,54],[45,49,52,55]], parts=["keys","bass_long","kick_soft"]),
  "easy-drive":   dict(bpm=112, bars=1, chords=[[57,60,64],[53,57,60],[60,64,67],[55,59,62]], parts=["pad","arp","bass","kick","hat","clap"]),
}
name = sys.argv[1]; t = TRACKS[name]
beat = 60 / t["bpm"]; bar = 4 * beat
chord_len = bar * t["bars"]
cycles = max(1, round(64 / (chord_len * len(t["chords"]))))
total = chord_len * len(t["chords"]) * cycles
N = int(total * SR)
out = [0.0] * N
random.seed(7)
def add(start, buf, gain):
    i0 = int(start * SR)
    for k, v in enumerate(buf):
        j = i0 + k
        if j >= N: break
        out[j] += v * gain
def tone(freq, dur, attack, release, harmonics=((1,1.0),), detune=0.0):
    n = int(dur * SR); buf = []
    for k in range(n):
        x = k / SR
        env = min(1.0, x / attack) if attack > 0 else 1.0
        if x > dur - release: env *= max(0.0, (dur - x) / release)
        v = 0.0
        for h, a in harmonics:
            v += a * math.sin(2 * math.pi * freq * h * x)
            if detune: v += a * 0.6 * math.sin(2 * math.pi * freq * h * (1 + detune) * x)
        buf.append(v * env)
    return buf
def pluck(freq, dur=0.45, decay=0.16, harm=((1,1.0),(2,0.35),(3,0.12))):
    n = int(dur * SR)
    return [math.exp(-(k/SR)/decay) * sum(a*math.sin(2*math.pi*freq*h*k/SR) for h,a in harm) for k in range(n)]
def kick(soft=False):
    n = int(0.32 * SR); buf = []; ph = 0.0
    for k in range(n):
        x = k / SR; f = 45 + 75 * math.exp(-x / 0.04); ph += 2 * math.pi * f / SR
        buf.append(math.sin(ph) * math.exp(-x / (0.12 if soft else 0.18)))
    return buf
def noise(dur, decay, hp=True):
    n = int(dur * SR); prev = 0.0; buf = []
    for k in range(n):
        r = random.uniform(-1, 1); v = r - prev if hp else r; prev = r
        buf.append(v * math.exp(-(k/SR)/decay))
    return buf
cache = {}
for c in range(cycles):
    for ci, ch in enumerate(t["chords"]):
        s0 = (c * len(t["chords"]) + ci) * chord_len
        parts = t["parts"]
        if "pad" in parts:
            for n_ in ch:
                key = ("pad", n_, chord_len)
                if key not in cache: cache[key] = tone(midi(n_), chord_len + 0.4, 0.9, 1.0, ((1,1.0),(2,0.18)), detune=0.004)
                add(s0, cache[key], 0.05)
        if "keys" in parts:
            for b in range(t["bars"] * 2):
                for n_ in ch:
                    key = ("keys", n_)
                    if key not in cache: cache[key] = [v * (1 + 0.15*math.sin(2*math.pi*4.5*k/SR)) for k, v in enumerate(pluck(midi(n_+12), 2.2, 0.7, ((1,1.0),(2,0.5),(4,0.1))))]
                    add(s0 + b * 2 * beat + (0.012 * ch.index(n_)), cache[key], 0.07)
        steps = int(chord_len / (beat / 2))
        if "arp" in parts or "arp_slow" in parts:
            slow = "arp_slow" in parts
            seq = [ch[0]+12, ch[1]+12, ch[2]+12, ch[1]+12, ch[0]+24, ch[2]+12, ch[1]+12, ch[2]+12]
            for st in range(0, steps, 2 if slow else 1):
                n_ = seq[(st // (2 if slow else 1)) % len(seq)]
                key = ("arp", n_, slow)
                if key not in cache: cache[key] = pluck(midi(n_), 0.9 if slow else 0.45, 0.32 if slow else 0.15)
                add(s0 + st * beat / 2, cache[key], 0.085 if slow else 0.07)
        if "bass" in parts or "bass_long" in parts:
            long_ = "bass_long" in parts
            root = ch[0] - 12 if ch[0] >= 48 else ch[0]
            hits = [0] if long_ else list(range(0, int(chord_len / beat)))
            for h in hits:
                d = chord_len if long_ else beat * 0.9
                key = ("bass", root, round(d, 3))
                if key not in cache: cache[key] = tone(midi(root), d, 0.02, 0.3 if long_ else 0.08, ((1,1.0),(2,0.25)))
                add(s0 + h * beat, cache[key], 0.12 if long_ else 0.11)
        for b in range(int(chord_len / beat)):
            tb = s0 + b * beat
            if "kick" in parts: cache.setdefault("kick", kick()); add(tb, cache["kick"], 0.32)
            if "kick_soft" in parts and b % 2 == 0: cache.setdefault("kicks", kick(True)); add(tb, cache["kicks"], 0.22)
            if "hat" in parts: cache.setdefault("hat", noise(0.05, 0.012)); add(tb + beat / 2, cache["hat"], 0.05)
            if "clap" in parts and b % 2 == 1: cache.setdefault("clap", noise(0.18, 0.05, hp=False)); add(tb, cache["clap"], 0.05)
peak = max(1e-6, max(abs(v) for v in out))
with wave.open(f"{name}.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v / peak * 0.9)) * 32767)) for v in out))
print(name, round(total, 1))
