# The walk-through video

`public/demo/clipelle-walkthrough.mp4` is a real recording of the app in demo mode: a drawn cursor glides to real
elements, types and clicks, and the app reacts. Re-record it when the app changes:

```bash
NEXT_PUBLIC_DEMO_MODE=true NEXT_PUBLIC_SUPPORT_ASSISTANT=on npx next build && NEXT_PUBLIC_DEMO_MODE=true npx next start -p 3002
node scripts/demo/record.mjs http://localhost:3002 /tmp/rec            # frames + clicks.json
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --screenshot=/tmp/rec/bg.png --window-size=1920,1080 "file://$PWD/scripts/demo/stage.html"
python3 scripts/demo/compose.py /tmp/rec /tmp/rec/bg.png               # music, clicks, browser frame → walkthrough.mp4 + poster.jpg
cp /tmp/rec/walkthrough.mp4 public/demo/clipelle-walkthrough.mp4 && cp /tmp/rec/poster.jpg public/demo/clipelle-walkthrough.jpg
```

The music is synthesised in `compose.py` (a calm Am–F–C–G pad), so no licence is involved. `src/content/demoVideo.ts` holds the length shown next to the video.
