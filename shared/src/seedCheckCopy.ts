import type { SwahiliLine } from "./actionCard.sw.ts";

export const SEED_CHECK_EN = {
  stepSticker: "Find the KEPHIS sticker on the seed packet.",
  stepScratch: "Scratch the sticker to show the code.",
  stepText: "Text the code to {shortCode}. It is free.",
  result: "KEPHIS replies to say if the seed is genuine. A genuine code does not prove the seed was stored well.",
  coverage: "This works for certified seed sold in packets. Nursery seedlings usually have no sticker, so ask your field officer about them.",
  noContact: "Ask your field officer how to check if a seed packet is genuine.",
};

export type SeedCheckKey = keyof typeof SEED_CHECK_EN;

function draft(text: string): SwahiliLine {
  return { text, reviewed: false };
}

export const SEED_CHECK_SW: Record<SeedCheckKey, SwahiliLine> = {
  stepSticker: draft("Tafuta kibandiko cha KEPHIS kwenye pakiti ya mbegu."),
  stepScratch: draft("Kwangua kibandiko ili uone namba ya siri."),
  stepText: draft("Tuma namba hiyo kwa SMS kwenda {shortCode}. Ni bure."),
  result: draft("KEPHIS itakujibu kama mbegu ni halisi. Namba halisi haithibitishi kwamba mbegu ilihifadhiwa vizuri."),
  coverage: draft("Hii ni kwa mbegu zilizothibitishwa zinazouzwa kwenye pakiti. Miche ya kitalu mara nyingi haina kibandiko, kwa hiyo muulize afisa ugani."),
  noContact: draft("Muulize afisa ugani jinsi ya kujua kama pakiti ya mbegu ni halisi."),
};
