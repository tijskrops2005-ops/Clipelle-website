/**
 * A project name from the uploaded file's name (31 Oct 2026): the customer is no longer asked for
 * one up front. "founder-story_v2.MP4" → "Founder story v2". The name is still editable under a
 * fold, and the draft that is sent is the field's value, as before.
 */
export function projectNameFromFile(fileName: string, fallback = "Translation"): string {
  const base = fileName.replace(/\.[a-z0-9]{1,5}$/i, "");
  const words = base
    .replace(/[_\-.]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (words.length < 2) return fallback;
  const name = words.charAt(0).toUpperCase() + words.slice(1);
  return name.length > 60 ? name.slice(0, 60).trimEnd() : name;
}
