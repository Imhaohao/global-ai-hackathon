import type { CopyKey } from "./actionCard.en.ts";

export interface SwahiliLine {
  text: string;
  reviewed: boolean;
}

function draft(text: string): SwahiliLine {
  return { text, reviewed: false };
}

export const ACTION_CARD_SW: Record<CopyKey, SwahiliLine> = {
  headlineHealthy: draft("Majani yako yanaonekana mazima"),
  headlineSpray: draft("{name}: linda majani mazima na usafishe"),
  headlinePrune: draft("{name}: safisha na upogoe"),
  headlineMonitor: draft("{name}: endelea kuangalia"),
  headlineAskOfficer: draft("{name}: muombe afisa ugani akague"),
  headlineNotSure: draft("Programu haina uhakika. Mwonyeshe afisa ugani majani haya"),
  headlineMightBe: draft("Huenda ni {name}, lakini haijathibitishwa. Mwonyeshe afisa ugani"),
  headlineRetake: draft("Piga picha zilizo wazi zaidi za majani mengi zaidi"),
  retakeDaylight: draft("Nenda mahali penye mwanga wa mchana, si kivuli kizito wala jua kali."),
  retakeSteady: draft("Shikilia simu kimya hadi jani lionekane wazi."),
  retakeFillFrame: draft("Jaza picha kwa jani moja."),
  sendToOfficer: draft("Mtumie afisa ugani wa ushirika wako kesi hii kwa SMS, au mwonyeshe majani ana kwa ana."),
  rainReason: draft("Mvua ilinyesha siku {n} kati ya 7 zilizopita karibu nawe ({source}). Hali ya unyevu hufanya kutu ienee haraka."),
  labelRate: draft("Tumia kipimo kilichoandikwa kwenye lebo ya bidhaa."),
  elseBerryDisease: draft("Ugonjwa wa matunda ya kahawa: angalia matunda kama yana mabaka meusi yaliyobonyea."),
  elseBerryBorer: draft("Kunguni wa matunda ya kahawa: angalia matundu madogo kwenye matunda."),
  elseWilt: draft("Kunyauka kwa kahawa: matawi mazima yananyauka na kufa."),
  elseNutrition: draft("Udongo duni au ukosefu wa virutubisho: manjano kote kwenye mti."),
  smsDecisionSpray: draft("Uamuzi: linda majani mazima kwa dawa ya shaba kwa kipimo cha lebo na usafishe. Angalia tena baada ya siku {days}."),
  smsDecisionPrune: draft("Uamuzi: pogoa na usafishe. Angalia tena baada ya siku {days}."),
  smsDecisionMonitor: draft("Uamuzi: endelea kuangalia. Angalia tena baada ya siku {days}."),
  smsDecisionCallOfficer: draft("Uamuzi: mwonyeshe afisa ugani."),
};
