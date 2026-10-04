// The bot's replies for the SHOP exchange, exactly as shared/src/remedyFinder.ts formats them (commit 4ef8721).
// The three shops are the fixture list from shared/src/remedyFinder.test.ts; the live bot fills this list from Google
// Places. Regenerate with: node scripts/shopReplies.ts <path to a Leaf Doctor checkout>
/** The Messages bridge starts every reply with this (bridge/src/sessionRules.ts REPLY_PREFIX). */
export const REPLY_PREFIX = "Leaf Doctor: ";

/** The last exchange of ScreenRecording 22-52-31, copied word for word, so the SHOP thread continues it. */
export const FERTILIZER_EXCHANGE = {
  question: "How can I get these fertilizers?",
  answer:
    "Leaf Doctor: Manure is the cheapest: use well-rotted manure from your own cattle, goats or chickens, or ask neighbours. For balanced fertilizer, ask your extension officer or a local farm input shop which one suits coffee and how much to use. Farmer groups or cooperatives often buy together at a lower price. I cannot give doses.",
} as const;

export const SHOP_REPLIES = {
  askPlace: "Which town or market are you near? Reply with its name, for example: Othaya.",
  agrovets:
    "Agrovets near Othaya (Google Maps, not checked by us): 1) Othaya Farmers Agrovet, Othaya town, 0712 000001. 2) Mahiga Agro Supplies, Mahiga. 3) Green Leaf Agrovet, Karima, 0712 000003. Ask for a balanced fertilizer with nitrogen and potassium. Good feeding often controls brown eye spot. Ask your officer before buying any fungicide.",
} as const;
