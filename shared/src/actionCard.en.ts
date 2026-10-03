export type CopyKey =
  | "headlineHealthy"
  | "headlineSpray"
  | "headlinePrune"
  | "headlineMonitor"
  | "headlineAskOfficer"
  | "headlineNotSure"
  | "headlineMightBe"
  | "headlineRetake"
  | "retakeDaylight"
  | "retakeSteady"
  | "retakeFillFrame"
  | "sendToOfficer"
  | "rainReason"
  | "labelRate"
  | "elseBerryDisease"
  | "elseBerryBorer"
  | "elseWilt"
  | "elseNutrition"
  | "smsDecisionSpray"
  | "smsDecisionPrune"
  | "smsDecisionMonitor"
  | "smsDecisionCallOfficer";

export const ENGLISH_COPY: Record<CopyKey, string> = {
  headlineHealthy: "Your leaves look healthy",
  headlineSpray: "{name}: protect healthy leaves and clean up",
  headlinePrune: "{name}: clean up and prune",
  headlineMonitor: "{name}: keep watching",
  headlineAskOfficer: "{name}: ask your field officer to check",
  headlineNotSure: "The app is not sure. Show these leaves to your field officer",
  headlineMightBe: "It might be {name}, but it is not confirmed. Show a field officer",
  headlineRetake: "Take clearer photos of more leaves",
  retakeDaylight: "Move into daylight, not deep shade or direct sun.",
  retakeSteady: "Hold the phone steady until the leaf looks sharp.",
  retakeFillFrame: "Fill the frame with one leaf.",
  sendToOfficer: "Send this case to your cooperative field officer by SMS, or show the leaves in person.",
  rainReason: "It rained on {n} of the last 7 days near you ({source}). Wet weather makes rust spread faster.",
  labelRate: "Use the rate on the product label.",
  elseBerryDisease: "Coffee berry disease: look at the berries for dark sunken patches.",
  elseBerryBorer: "Coffee berry borer: look for small holes in the berries.",
  elseWilt: "Coffee wilt: whole branches wilting and dying.",
  elseNutrition: "Poor soil or nutrition: yellowing across the whole tree.",
  smsDecisionSpray: "Decision: protect healthy leaves with copper at the label rate and clean up. Check again in {days} days.",
  smsDecisionPrune: "Decision: prune and clean up. Check again in {days} days.",
  smsDecisionMonitor: "Decision: keep watching. Check again in {days} days.",
  smsDecisionCallOfficer: "Decision: show your field officer.",
};
