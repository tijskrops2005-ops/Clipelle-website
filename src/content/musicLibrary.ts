/**
 * Background music for the edit screen (26 Nov 2026, Tijs). Our own tracks, synthesised for Clipelle
 * (scripts/music/synth.py), so there is no licence question: customers may use them in any video,
 * also in paid ads. Music from apps like CapCut is licensed for use inside that app only and cannot be
 * offered here. The files are in public/music; the render reaches them on the site's own address.
 */
export type MusicTrack = { key: string; title: string; mood: string; seconds: number; file: string };

export const MUSIC_LIBRARY: MusicTrack[] = [
  { key: "calm-morning", title: "Calm morning", mood: "Calm", seconds: 75.8, file: "/music/calm-morning.mp3" },
  { key: "warm-studio", title: "Warm studio", mood: "Warm", seconds: 68.6, file: "/music/warm-studio.mp3" },
  { key: "bright-day", title: "Bright day", mood: "Upbeat", seconds: 67.2, file: "/music/bright-day.mp3" },
  { key: "easy-drive", title: "Easy drive", mood: "Energetic", seconds: 60, file: "/music/easy-drive.mp3" },
];

export function musicTrack(key?: string | null): MusicTrack | null {
  return MUSIC_LIBRARY.find((t) => t.key === key) ?? null;
}

/** The track's address in the browser (same site). */
export function musicSrc(key?: string | null): string | null {
  return musicTrack(key)?.file ?? null;
}
