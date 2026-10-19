/**
 * The one motion prompt for the product clip (fal.ai image-to-video). Pure and browser-safe:
 * the orchestrator sends exactly this text, and /dev/product-clip shows it as its default.
 * Camera and motion only; the product (and the person, when the photo shows one) must stay
 * as photographed. Product name and a short mood from the script replace the old
 * "Mood: <on-screen text>" ending.
 */
export type ClipPromptInput = {
  productName: string;
  /** Two or three words from the script, e.g. "elegant, calm, evening". */
  mood?: string;
  /** From the script step's look at the photo: a person wears or holds the product. */
  hasPerson: boolean;
};

export const DEFAULT_CLIP_MOOD = "clean, calm, product focus";

export function clipPrompt(input: ClipPromptInput) {
  const name = input.productName.trim() || "the product";
  const mood = input.mood?.trim() || DEFAULT_CLIP_MOOD;
  const subject = input.hasPerson
    ? `Smooth, slow showcase of ${name} worn by the person in the photo, soft studio light, subtle camera push-in, no text, keep the person and the garment exactly as shown, natural subtle movement, no change of face or outfit.`
    : `Smooth, slow product showcase of ${name} in the photo on a clean background, soft studio light, subtle camera push-in, no text, no people, keep the product exactly as shown.`;
  return `${subject} Mood: ${mood}.`;
}
