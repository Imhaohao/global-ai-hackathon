import type { DiseaseKey, Urgency } from "./types.ts";

export type AppLanguage = "en" | "sw";

export type LeafConfidence = "confident" | "possible" | "unclear";

export interface LeafReading {
  photoUri: string;
  condition: DiseaseKey;
  probability: number;
  confidence: LeafConfidence;
  qualityPassed: boolean;
}

export type PlantVerdict =
  | { kind: "answer"; condition: DiseaseKey; agreeing: number; usable: number; total: number }
  | { kind: "retake"; usable: number; total: number }
  | { kind: "needsPerson"; reason: "leavesDisagree" | "tooFewClearLeaves"; usable: number; total: number };

export interface PlantCheck {
  readings: LeafReading[];
  verdict: PlantVerdict;
  modelVersion: string;
  checkedAt: string;
}

export type ReviewStatus = "unreviewed" | "sentToOfficer" | "officerConfirmed" | "officerCorrected";

export interface Observation {
  id: string;
  capturedAt: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  farmSection?: string;
  check: PlantCheck;
  reviewStatus: ReviewStatus;
}

export type FarmDecision = "spray" | "pruneAndClean" | "monitor" | "callOfficer";

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  verified: boolean;
  verifiedOn?: string;
  source: string;
}

export interface WetDays {
  wetDaysLast7: number;
  source: "CHIRPS" | "NASA POWER";
  asOf: string;
}

export interface ActionContext {
  language: AppLanguage;
  wetDays?: WetDays;
}

export type ActionInput =
  | { kind: "plant"; verdict: PlantVerdict }
  | { kind: "sms"; condition: DiseaseKey | null; confirmed: boolean };

export interface ActionCard {
  condition: DiseaseKey | null;
  decision: FarmDecision;
  urgency: Urgency;
  headline: string;
  doNow: string[];
  whatElseCouldItBe: string[];
  recheckInDays: number;
  needsPerson: boolean;
  contact: Contact;
  sourceUrls: string[];
  language: AppLanguage;
}

export interface CaseSummaryInput {
  observation: Observation;
  card: ActionCard;
}
