# Background music

Our own tracks for the edit screen's Music tab (`src/content/musicLibrary.ts`), synthesised from code, so there is no licence question.

```
cd scripts/music
python3 synth.py calm-morning        # writes calm-morning.wav (mono, 22050 Hz)
```

Mastering (stereo, loudness −16 LUFS, fades) into `public/music/<name>.mp3`:

```
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 NAME.wav)
ffmpeg -i NAME.wav -af "aresample=44100,lowpass=f=7000,highpass=f=35,aecho=0.8:0.6:60|110:0.25|0.18,pan=stereo|c0=c0|c1=c0,stereotools=slev=1.15,loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=in:d=0.8,afade=t=out:st=$(python3 -c "print(round($d-2.5,2))"):d=2.5" -c:a libmp3lame -b:a 128k ../../public/music/NAME.mp3
```

Then add the track (key, title, mood, length in seconds) to `MUSIC_LIBRARY`.
