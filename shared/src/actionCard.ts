import type { ActionCard, ActionContext, ActionInput, Contact } from "./contract.ts";

export const PLACEHOLDER_CONTACT: Contact = {
  id: "cooperative-field-officer",
  name: "Cooperative field officer",
  role: "Extension",
  phone: "",
  verified: false,
  source: "Placeholder until Part 2 verifies contacts",
};

function conditionOf(input: ActionInput) {
  if (input.kind === "sms") return input.condition;
  return input.verdict.kind === "answer" ? input.verdict.condition : null;
}

export function buildActionCard(input: ActionInput, context: ActionContext): ActionCard {
  return {
    condition: conditionOf(input),
    decision: "callOfficer",
    urgency: "medium",
    headline: "Show these leaves to your field officer",
    doNow: [],
    whatElseCouldItBe: [],
    recheckInDays: 7,
    needsPerson: true,
    contact: PLACEHOLDER_CONTACT,
    sourceUrls: [],
    language: context.language,
  };
}
