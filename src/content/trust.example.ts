import type { TrustContent } from "./trust";

/**
 * EXAMPLE LAYOUT ONLY. Shown in development and demo mode so the blocks can be judged.
 * Nothing here is real: no real customers, numbers or publications. Replace via trust.ts.
 */
export const trustExample: TrustContent = {
  logos: Array.from({ length: 6 }, (_, i) => ({ name: `Example brand ${i + 1}`, src: "" })),
  reviews: [
    { name: "Example name", role: "Example role, example shop", text: "Example review text. Replace with a real, approved quote from a real customer.", stars: 5 },
    { name: "Example name", role: "Example role, example brand", text: "Example review text. Replace with a real, approved quote from a real customer.", stars: 5 },
    { name: "Example name", role: "Example role, example agency", text: "Example review text. Replace with a real, approved quote from a real customer.", stars: 4 },
  ],
  numbers: [
    { value: "0", label: "example number" },
    { value: "0", label: "example number" },
    { value: "0", label: "example number" },
  ],
  press: Array.from({ length: 4 }, (_, i) => ({ name: `Example publication ${i + 1}`, src: "" })),
};
