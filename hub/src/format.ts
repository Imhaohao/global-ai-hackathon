import type { FarmerReport } from "../../shared/src/localModel/index.ts";

export function maskSender(sender: string): string {
  const digits = sender.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : sender;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const BYTES_PER_MB = 1_000_000;
const BYTES_PER_GB = 1_000_000_000;

export function formatBytes(bytes: number): string {
  if (bytes >= BYTES_PER_GB) return `${(bytes / BYTES_PER_GB).toFixed(1)} GB`;
  return `${Math.round(bytes / BYTES_PER_MB)} MB`;
}

const PRODUCT_WORDS: Record<string, string> = {
  copper: "copper",
  other_fungicide: "a fungicide",
  insecticide: "an insecticide",
  herbicide: "a weedkiller",
  unknown: "an unnamed product",
};

const WHEN_WORDS: Record<string, string> = {
  today: " today",
  yesterday: " yesterday",
  this_week: " this week",
  earlier: " a while ago",
};

const RAIN_WORDS: Record<string, string> = {
  yes: ", then it rained",
  no: ", no rain after",
};

export function describeReading(reading: FarmerReport): string {
  if (reading.symptomsInEnglish) return reading.symptomsInEnglish;
  const product = PRODUCT_WORDS[reading.sprayProduct];
  if (!product) return `About ${reading.topic.replace("_", " ")}`;
  return `Sprayed ${product}${WHEN_WORDS[reading.sprayedWhen] ?? ""}${RAIN_WORDS[reading.rainAfterSpraying] ?? ""}`;
}
