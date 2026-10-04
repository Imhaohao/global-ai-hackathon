import type { ComponentType } from "react";
import type { ShotName } from "@/components/stage/shots";
import { ClosingForeground, ClosingSlide } from "./slides/ClosingSlide";
import { EvidenceSlide, LimitsSlide, MapSlide, RegistrySlide } from "./slides/EvidenceSlides";
import { NoorSlide, PhonesSlide, ReachSlide, StatementSlide } from "./slides/StorySlides";
import { GuardrailsSlide, PersonSlide, ScanSlide, SmsSlide } from "./slides/SystemSlides";
import { TitleForeground, TitleSlide } from "./slides/TitleSlide";

export type SlideLayer = "behindStage" | "overStage";

export type SlideProps = { step: number; direction: 1 | -1; advance: () => void };

export type SlideDefinition = {
  id: string;
  title: string;
  layer: SlideLayer;
  /** One camera shot per click step; the slide has as many steps as shots. */
  shots: ShotName[];
  Content: ComponentType<SlideProps>;
  /** Copy that sits over the stage while the main content sits behind it. */
  Foreground?: ComponentType<SlideProps>;
};

export const slides: SlideDefinition[] = [
  { id: "title", title: "Leaf Doctor", layer: "behindStage", shots: ["title"], Content: TitleSlide, Foreground: TitleForeground },
  { id: "noor", title: "Noor's morning", layer: "overStage", shots: ["morning", "morningRust"], Content: NoorSlide },
  { id: "reach", title: "Who farms, and who helps", layer: "overStage", shots: ["aerial", "aerial"], Content: ReachSlide },
  { id: "phones", title: "Which phones farmers use", layer: "overStage", shots: ["featureIdle"], Content: PhonesSlide },
  { id: "statement", title: "Problem statement", layer: "overStage", shots: ["leaf", "leaf"], Content: StatementSlide },
  { id: "sms", title: "How a text gets answered", layer: "overStage", shots: ["featureSent", "hub", "hub", "featureReply"], Content: SmsSlide },
  { id: "scan", title: "The six-leaf scan", layer: "overStage", shots: ["bush", "bushScan", "bushScan"], Content: ScanSlide },
  { id: "person", title: "When the app is not sure", layer: "overStage", shots: ["officer", "officerPhone"], Content: PersonSlide },
  { id: "guardrails", title: "Guardrails", layer: "overStage", shots: ["cooperative"], Content: GuardrailsSlide },
  { id: "evidence", title: "Evidence so far", layer: "overStage", shots: ["rows", "rows", "rows"], Content: EvidenceSlide },
  { id: "map", title: "The cooperative's rust map", layer: "overStage", shots: ["map"], Content: MapSlide },
  { id: "registry", title: "Scale", layer: "overStage", shots: ["aerial", "aerial"], Content: RegistrySlide },
  { id: "limits", title: "Known limits", layer: "overStage", shots: ["morning"], Content: LimitsSlide },
  { id: "closing", title: "Closing", layer: "behindStage", shots: ["closing", "closing"], Content: ClosingSlide, Foreground: ClosingForeground },
];

export function shotFor(slide: SlideDefinition, step: number): ShotName {
  return slide.shots[Math.min(step, slide.shots.length - 1)];
}
