import type { ActionCard } from "./contract.ts";
import type { DiseaseKey } from "./types.ts";

export type PurchaseItem = "fertilizer" | "pruningTools" | "copperFungicide" | "sprayGear";

export interface ShoppingAdvice {
  items: PurchaseItem[];
  waitForOfficer: boolean;
}

const PRUNE_AND_FEED: PurchaseItem[] = ["fertilizer", "pruningTools"];
const COPPER_KIT: PurchaseItem[] = ["copperFungicide", "sprayGear"];
const NOTHING: ShoppingAdvice = { items: [], waitForOfficer: false };
const WAIT_FOR_OFFICER: ShoppingAdvice = { items: [], waitForOfficer: true };

type CardFacts = Pick<ActionCard, "condition" | "decision" | "needsPerson">;

const ADVICE_BY_CONDITION: Record<DiseaseKey, (card: CardFacts) => ShoppingAdvice> = {
  healthy: () => NOTHING,
  rust: (card) => ({
    items: card.decision === "spray" ? [...COPPER_KIT, ...PRUNE_AND_FEED] : PRUNE_AND_FEED,
    waitForOfficer: false,
  }),
  cercospora: () => ({ items: PRUNE_AND_FEED, waitForOfficer: false }),
  phoma: () => ({ items: [...PRUNE_AND_FEED, ...COPPER_KIT], waitForOfficer: false }),
  miner: () => WAIT_FOR_OFFICER,
  weevil: () => WAIT_FOR_OFFICER,
  mites: () => WAIT_FOR_OFFICER,
};

export function whatToBuy(card: CardFacts): ShoppingAdvice {
  if (card.needsPerson) return WAIT_FOR_OFFICER;
  if (card.condition === null) return NOTHING;
  return ADVICE_BY_CONDITION[card.condition](card);
}
