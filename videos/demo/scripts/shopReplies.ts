// Prints the SHOP replies that src/story.ts quotes, straight from a Leaf Doctor checkout's shared code.
// Usage: node scripts/shopReplies.ts <path to a checkout that has shared/src/remedyFinder.ts>
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const checkout = process.argv[2];
if (!checkout) throw new Error("Usage: node scripts/shopReplies.ts <checkout>");
const finder = await import(pathToFileURL(resolve(checkout, "shared/src/remedyFinder.ts")).href);
const SHOPS = [
  { name: "Othaya Farmers Agrovet", address: "Othaya town", phone: "0712 000001" },
  { name: "Mahiga Agro Supplies", address: "Mahiga", phone: null },
  { name: "Green Leaf Agrovet", address: "Karima", phone: "0712 000003" },
];
console.log(JSON.stringify({ askPlace: finder.ASK_PLACE_REPLY, agrovets: finder.formatRemedyReply(finder.remedyPlanFor("cercospora"), "Othaya", SHOPS) }, null, 2));
