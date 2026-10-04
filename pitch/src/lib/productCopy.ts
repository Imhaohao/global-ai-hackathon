/**
 * Product text shown on slides. Each string is copied from the team's code output, not written for the deck:
 * - confirmFirst*: buildOfflineReply({ kind: "confirmFirst", best: rust }) in shared/src/smsReply.ts.
 * - card, unsure: buildActionCard in shared/src/actionCard.ts (branch part-2-rules), English, 4 wet days of 7.
 * - caseFields: formatCaseSummarySms in shared/src/caseSummary.ts (branch part-2-rules) on an example case.
 * farmerMessage is an example a farmer might send.
 */
export const copy = {
  farmerMessage: "Majani yana madoa ya manjano na unga wa machungwa chini ya jani",
  confirmFirstSwahili:
    "Huenda ni Kutu ya majani ya kahawa. Kutu ina unga wa machungwa chini ya jani, lakini doa la jicho la kahawia lina duara kavu za kahawia zenye katikati ya kijivu-nyeupe na halina unga. Jibu ukieleza unachoona ili tuhakikishe.",
  confirmFirstEnglish:
    "This might be Coffee leaf rust. Rust has orange powder on the underside of the leaf, while brown eye spot has dry brown rings with a grey-white centre and no powder. Reply with what you see so we can be sure.",
  card: {
    headline: "Coffee leaf rust: protect healthy leaves and clean up",
    rainLine: "It rained on 4 of the last 7 days near you (NASA POWER). Wet weather makes rust spread faster.",
    firstSteps: [
      "Check the underside of lower leaves often. Catching it early matters most.",
      "Pick off and burn or bury leaves and branches with orange spots.",
      "Prune and thin shade and weeds so air moves and leaves dry faster.",
    ],
  },
  unsure: {
    headline: "The app is not sure. Show these leaves to your field officer",
    doNow: "Send this case to your cooperative field officer by SMS, or show the leaves in person.",
  },
  caseFields: [
    ["Case", "NY-0412, 2026-10-03"],
    ["Section", "Lower terrace"],
    ["GPS", "-0.54800, 36.94300 (within 8 m)"],
    ["Result", "not sure, leaves disagree, 5 of 6 leaves clear enough"],
    ["Decision", "needs your visit"],
    ["Rain", "4 wet days of last 7 (NASA POWER)"],
  ] as const,
};
