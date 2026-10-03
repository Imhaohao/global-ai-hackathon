export const DISEASE_KEYS = ["cercospora", "healthy", "miner", "phoma", "rust", "mites", "weevil"] as const;

export type DiseaseKey = (typeof DISEASE_KEYS)[number];

export type Urgency = "none" | "low" | "medium" | "high";

export interface DiseaseInfo {
  key: DiseaseKey;
  name: string;
  look: string;
  tellApart?: string;
  symptomWords: string[];
  conditions?: string;
  actions: string[];
  urgency: Urgency;
  urgencyReason?: string;
  sources: string[];
}

export type DiseaseCatalog = Record<DiseaseKey, DiseaseInfo>;
