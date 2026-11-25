"""Composes the walk-through: frames in a browser window on the ink stage, our own calm pad underneath,
a soft click at every click, fades at both ends. Usage: python3 compose.py <recdir> <stage bg.png>"""
import json, math, subprocess, sys, wave, struct, os
rec, bg = sys.argv[1], sys.argv[2]
FPS = 24
frames = len([f for f in os.listdir(f"{rec}/frames") if f.endswith(".jpg")])
dur = frames / FPS
clicks = json.load(open(f"{rec}/clicks.json"))

# Music: Am - F - C - G, 4 s per chord, soft swells, low-passed, a little echo; made here, no licence needed.
chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 261.63, 329.63], [196.0, 246.94, 293.66]]
def chord_expr(fs):
    return "+".join(f"0.55*sin(2*PI*{f}*t)+0.25*sin(2*PI*{f/2}*t)+0.08*sin(2*PI*{f*2}*t)" for f in fs)
k = "floor(mod(t,16)/4)"
expr = "if(eq(%s,0),%s,if(eq(%s,1),%s,if(eq(%s,2),%s,%s)))" % (k, chord_expr(chords[0]), k, chord_expr(chords[1]), k, chord_expr(chords[2]), chord_expr(chords[3]))
env = "min(1,mod(t,4)/1.4)*min(1,(4-mod(t,4))/1.1)*0.6+0.4*min(1,mod(t,4)/0.3)"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"aevalsrc='({expr})*({env})*0.09':s=44100:d={dur + 2:.2f}",
                "-af", f"lowpass=f=1800,aecho=0.8:0.7:220|440:0.35|0.22,volume=11dB,afade=t=in:d=1.5,afade=t=out:st={dur - 2.2:.2f}:d=2.2",
                "-c:a", "pcm_s16le", f"{rec}/music.wav"], check=True)

# Click: a short, soft tick (a decaying noise burst through a band-pass), written once.
sr = 44100
with wave.open(f"{rec}/click.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    import random
    random.seed(3)
    n = int(0.035 * sr)
    samples = []
    for i in range(n):
        env_c = math.exp(-i / (0.006 * sr))
        samples.append(int(max(-1, min(1, (random.uniform(-1, 1) * 0.6 + math.sin(2 * math.pi * 1800 * i / sr) * 0.4) * env_c * 0.35)) * 32767))
    w.writeframes(b"".join(struct.pack("<h", s) for s in samples))

# Mix: music + a delayed copy of the click per click moment.
inputs = ["-i", f"{rec}/music.wav"]
filters = []
for i, tsec in enumerate(clicks):
    inputs += ["-i", f"{rec}/click.wav"]
    filters.append(f"[{i + 1}:a]adelay={int(tsec * 1000)}|{int(tsec * 1000)}[c{i}]")
mix_in = "[0:a]" + "".join(f"[c{i}]" for i in range(len(clicks)))
filters.append(f"{mix_in}amix=inputs={len(clicks) + 1}:normalize=0:duration=first[a]")
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[a]", "-t", f"{dur:.2f}", "-c:a", "aac", "-b:a", "128k", f"{rec}/audio.m4a"], check=True)

# Picture: the frames in the browser frame on the stage, with a fade at both ends.
subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", bg, "-framerate", str(FPS), "-i", f"{rec}/frames/f%05d.jpg", "-i", f"{rec}/audio.m4a",
                "-filter_complex", f"[1:v]scale=1560:975:flags=lanczos[r];[0:v][r]overlay=180:96:shortest=1,scale=1600:900:flags=lanczos,fade=t=in:st=0:d=0.6,fade=t=out:st={dur - 0.9:.2f}:d=0.9,format=yuv420p[v]",
                "-map", "[v]", "-map", "2:a", "-r", str(FPS), "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", f"{rec}/walkthrough.mp4"], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "1", "-i", f"{rec}/walkthrough.mp4", "-frames:v", "1", "-q:v", "3", f"{rec}/poster.jpg"], check=True)
print("done", dur)
