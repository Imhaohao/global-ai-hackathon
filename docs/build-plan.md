# Leaf Doctor build plan: three parallel parts

Written Sat 3 Oct 2026, 15:30 PDT. Submission closes at the end of Sun 4 Oct 2026 (Hack-Nation Global AI Hackathon, "Small AI for Development", agriculture track). Confirm the exact cut-off time on the Hack-Nation event page.

This file is the whole brief for a build agent. Read it top to bottom before touching code. You are one of three agents working at the same time on different folders. Do not edit files outside your part's "Owns" list. If you need something from another part, use the stub from Step 0 and write down the need in your final report. A fourth person owns the leaf model and works from `docs/model-plan.md`; nobody else edits `training/`, `mobile/assets/model/`, `classifyLeaf.ts` or `modelDecision.ts`. The model is frozen at Sun 4 Oct 12:00.

## The product in one paragraph

Noor grows coffee on 2 hectares. Her yields are falling and an extension officer visits twice a year. Leaf Doctor lets her photograph up to six leaves of a sick coffee tree on the household smartphone. An 8 MB image model runs on the phone with no internet and names the problem, or says it is not sure. The app turns that into one decision (spray, prune and clean, monitor, or call the officer), with the reasons, what else it could be, and when to check again. When the app is not sure, it builds a short case summary and sends it to the officer by SMS, which works without mobile data. On weekdays, when the smartphone is away, Noor can text the cooperative's number from her own basic phone. A hub phone at the cooperative answers with the same rules. Swahili is supported. Kikuyu, which is likely her home language, is a stated, measured gap.

## Ground rules for every part

- Base branch: `main` after Step 0. Work on your own branch (`part-1-evidence`, `part-2-rules`, `part-3-app`), ideally in its own git worktree: `git worktree add ../leaf-part-N -b part-N-... main`.
- Commits: use the repo's default git user. Never add an AI co-author or attribution line. One commit per finished, verified piece of work, with a message that says what changed.
- Every function stays at cyclomatic complexity 15 or lower. The lint already enforces this (`complexity: ["error", 15]` in `eslint.config.js` and `mobile/eslint.config.js`). A complexity error counts as a failing test.
- Code explains itself through names. Comments only for tricky logic.
- No emojis anywhere. Icons come from `phosphor-react-native` in the apps.
- Mobile styling uses NativeWind (Tailwind classes) with the tokens in `mobile/src/colors.json` and `mobile/tailwind.config.js`. Do not add raw hex colours or new font declarations in components; extend the tokens if you need a new one.
- Never combine rounded corners with a visible coloured border on one element. Never use gradient text. Never set text in all caps unless it is an acronym.
- Expo changes every release. Before using any Expo or React Native API, read the `expo` major version in `mobile/package.json` (currently SDK 57) and open `https://docs.expo.dev/versions/v57.0.0/`. Install native packages with `npx expo install <package>`, never `npm install`.
- Do not invent data or numbers. Every figure in a document needs a source URL and date, or a file in this repo that produced it. If you cannot get a number, write "not measured" and say why.
- Farmer-facing Swahili must come from reviewed text. Existing reviewed text lives in `shared/src/diseases.sw.ts` and `SWAHILI_WORDING` in `shared/src/smsReply.ts`. Any new Swahili string you write is unreviewed: store it with `reviewed: false`, and show English for that line until a native speaker marks it reviewed.
- Advice rules: cheap non-chemical steps first (inspect, prune, clean up, shade, nutrition). Never state a pesticide dose; say "use the rate on the product label". Never claim a yield gain for Leaf Doctor.
- Do not write summary markdown files, backups, or copies of files. The only documents to create are the ones this plan names.
- Do not deploy, publish, send real SMS, create accounts, or accept dataset terms on a website. When a step needs one of those, stop that step, finish the rest, and list it under "Needs a human" in your report.
- Close any emulator, dev server, browser or long-running process you started before you finish.

### Commands

| What | Command (run from repo root unless noted) |
|---|---|
| Shared and backend typecheck | `npm run typecheck` |
| Shared and backend tests | `npm test` |
| Shared and backend lint | `npm run lint` |
| Mobile typecheck / lint | `cd mobile && npx tsc --noEmit && npx expo lint` |
| Hub typecheck / lint / tests | `cd hub && npx tsc --noEmit && npx eslint . && npm test` |
| Mobile model contract check | `node training/check_mobile_contract.cjs` (needs `training/runs/efficientnet/quality_fixtures.json`; if missing, say so) |
| Run the phone app | `cd mobile && npx expo run:android` (a dev build; needed after adding native packages) |

## What already exists (do not rebuild)

| Area | Where | State |
|---|---|---|
| Disease facts in English and Swahili, with sources | `shared/src/diseases.ts`, `shared/src/diseases.sw.ts`, `shared/src/types.ts` | Keys: `cercospora, healthy, miner, phoma, rust, mites, weevil`. `mites` and `weevil` were added by the model commit and say "ask an officer". |
| SMS text tools | `shared/src/smsReply.ts` (`toSmsSafeText`, `fitToSms`, `buildOfflineReply`, `SMS_MAX_CHARS = 459`), `shared/src/smsCompliance.ts` (brand prefix, STOP/HELP, opt-out footer) | Done and tested. Every outgoing SMS must keep going through `formatOutgoingSms`. |
| Symptom matcher for texts | `shared/src/matchSymptoms.ts` | Done. Returns `confident`, `twoCandidates`, `noMatch`; `confirmFirst` comes from the model-assisted path. |
| On-device language model layer (hub) | `shared/src/localModel/` | Qwen3.5-2B via llama.rn on the hub, or llama-server on a laptop. `parseFarmerMessage` turns a farmer SMS into structured fields. The model may never finalize a diagnosis alone. Eval: `npm run eval:local-model` (needs llama-server; see `PROGRESS.md`). |
| SMS backend | `backend/` on Convex (`https://ideal-civet-53.convex.site`), Twilio webhook, Claude advisor for the online path | Done. |
| Hub phone app | `hub/` | Receives SMS, answers online or offline, shows the model state. |
| Phone app | `mobile/App.tsx`, `mobile/src/screens/CaptureScreen.tsx`, `ResultScreen.tsx`, `mobile/src/components/*`, `mobile/src/i18n/strings.ts` | Takes one photo, classifies it, shows a result with read-aloud (`useReadAloud`, `expo-speech`). |
| Leaf model | `mobile/assets/model/coffee-leaf.tflite` (8,091,596 bytes), `mobile/assets/model/model-config.json`, `mobile/src/diagnosis/classifyLeaf.ts`, `modelDecision.ts` | EfficientNet-B0, 8 outputs: `cercospora, healthy, miner, phoma, rust, red_spider_mite, weevil_damage, unsupported`. Preprocessing (shortest side to 256, centre crop 224, float32 RGB 0-255), per-class thresholds, quality gate (darkness and blur) are implemented. `classifyLeaf(model, photo)` returns `{ condition, probability, confidence: 'confident' | 'possible' | 'unclear' }`. Mites and `unsupported` always come back `unclear`. |
| Training and evaluation | `training/` (EfficientNet scripts, `sources.json`), results in `README.md` "Local coffee-leaf model" | See the numbers below. Raw images are not in git (`training/data/` is ignored). |
| Research sources | `docs/research-sources.md` | Every outside claim with a link and how well it was checked. |

### Model numbers you may quote (from `README.md` and the training results)

- Internal test, 4,571 images: raw accuracy 91.05%. The deployed thresholds accepted 81.49% of images, and 93.10% of accepted answers were correct.
- Excluding sources the base model may have seen in pre-training: raw accuracy 89.53%. On sources new to fine-tuning: 74.2% accepted, 91.6% of accepted correct.
- 128 of 128 held-out bean leaves rejected as not coffee.
- Weak results that must be reported as limits: rust stress set (1,120 RGB images) AUROC 0.491; 100 flatbed scans all rejected, 20% raw supported-class accuracy; severe synthetic blur rejected only 28.7% of the time; red spider mite disabled; cercospora precision 0.50 on new sources; never run on a physical phone (none available this weekend).
- Desktop CPU median 51 ms per image, four threads. Not a phone number.

## Step 0: shared contract (one person, before the three parts start, about 20 minutes)

Do this once, on `main`, then start the three parts from the resulting commit.

1. Bring `main` up to date. `origin/main` has the model commit (`aa836a0`). The branch `add-agent-instructions` has three SMS compliance commits (`66acc66`, `fd70ee9`, `adf1914`) that are not on `main`. Merge that branch into `main`, resolve the small conflict in `shared/src/matchSymptoms.test.ts` by keeping both changes, and run `npm run typecheck && npm test`.
2. Create the five files below exactly as written.
3. Run `npm run typecheck && npm run lint && npm test && (cd mobile && npx tsc --noEmit)`. All must pass.
4. Commit as "Add shared build contract for the three-part build" and push `main`.

### `shared/src/contract.ts`

```ts
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
```

### `shared/src/actionCard.ts` (stub, Part 2 replaces the body)

```ts
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
```

### `shared/src/caseSummary.ts` (stub, Part 2 replaces the body)

```ts
import type { CaseSummaryInput } from "./contract.ts";

export function formatCaseSummarySms(input: CaseSummaryInput): string {
  return `Leaf Doctor case ${input.observation.id}: ${input.card.headline}`;
}
```

### `shared/src/rain.ts` (stub, Part 2 replaces the body)

```ts
import type { WetDays } from "./contract.ts";

export async function fetchWetDays(backendUrl: string, latitude: number, longitude: number): Promise<WetDays | null> {
  void backendUrl;
  void latitude;
  void longitude;
  return null;
}
```

### `mobile/src/diagnosis/diagnosePlant.ts` (stub, Part 1 replaces the body)

```ts
import type { TfliteModel } from 'react-native-fast-tflite';

import type { PlantCheck } from '../../../shared/src/contract.ts';
import type { LeafPhoto } from './classifyLeaf';

export const MAX_LEAVES_PER_PLANT = 6;
export const MIN_AGREEING_LEAVES = 3;

export async function diagnosePlant(model: TfliteModel, photos: LeafPhoto[]): Promise<PlantCheck> {
  void model;
  return {
    readings: [],
    verdict: { kind: 'needsPerson', reason: 'tooFewClearLeaves', usable: 0, total: photos.length },
    modelVersion: 'stub',
    checkedAt: new Date().toISOString(),
  };
}
```

Import shared code from apps with the `.ts` extension, as the existing code does (`'../../../shared/src/contract.ts'`). Do not add the new files to `shared/src/index.ts` in Step 0; Part 2 does that at the end to avoid merge conflicts.

## Part 1: evidence, data and the plant vote

Recommended agent: the strongest model available. Preprocessing and evaluation mistakes fail silently.

### Owns

`mobile/src/diagnosis/diagnosePlant.ts`, `shared/src/plantVote.ts` and its test, `evals/` (new), `docs/evidence.md` (new), and appending rows to `docs/research-sources.md`.

The model owner works from `docs/model-plan.md` and owns `training/`, `mobile/assets/model/`, `mobile/src/diagnosis/classifyLeaf.ts`, `modelDecision.ts`, `docs/data-card.md` and `docs/model-speed.md`. Do not edit those. The model owner adds `qualityPassed` to `classifyLeaf`'s result first; if it has not landed on `main` when you need it, write `diagnosePlant` against the field anyway and note it in your report.

### Tasks, in priority order

**1.1 Plant vote.** Replace the stub in `mobile/src/diagnosis/diagnosePlant.ts`. Call `classifyLeaf` on each photo in order (at most `MAX_LEAVES_PER_PLANT`). Its result includes `qualityPassed` (added by the model owner). Build one `LeafReading` per photo. Put the voting rule in a pure function, `voteOnPlant(readings: LeafReading[]): PlantVerdict`, in `shared/src/plantVote.ts`, so it can be tested without the model:

- A reading is usable when `qualityPassed` is true and `confidence` is not `unclear`.
- If fewer than `MIN_AGREEING_LEAVES` (3) readings are usable: return `retake` while fewer than 6 photos were taken, otherwise `needsPerson` with reason `tooFewClearLeaves`.
- Otherwise count usable readings per condition. If the top condition has at least 3 votes and at least 60% of usable readings, return `answer`. Otherwise return `needsPerson` with reason `leavesDisagree`.
- Ties go to `needsPerson`.
- `modelVersion` comes from `model-config.json` (`calibration.version` plus the first 12 characters of `calibration.artifact_sha256`).

Write tests for `voteOnPlant` covering every branch in `shared/src/plantVote.test.ts`, which `npm test` already picks up. Part 2 adds the export to `shared/src/index.ts`.

The data card and the emulator speed test belong to the model owner (`docs/model-plan.md`), because their numbers change with every retrain.

**1.3 Kikuyu and Swahili test with FLORES-200, in `evals/flores/`.** The brief says judges will ask how the tool would do in a less-supported language. Goal: a measured answer.

- Data: FLORES-200 devtest. Its current home is `openlanguagedata/flores_plus` on Hugging Face, which requires accepting terms while logged in. That is a human step: if you cannot download it, stop this task and list it under "Needs a human". Check that Kikuyu (`kik_Latn`) and Swahili (`swh_Latn`) are present before relying on them.
- Test 1, language routing: run `parseFarmerMessage` from `shared/src/localModel/` over 100 Kikuyu and 100 Swahili sentences. Report how often `language` is `other` for Kikuyu, meaning the hub would route it to a person. Report how often Swahili is read as `sw` or `mixed`.
- Test 2, understanding: ask the same local model to translate 100 sentences of each language to English, and score with chrF using `sacrebleu`. Report both scores side by side.
- Use `llama-server` with the active model from `shared/src/localModel/modelCatalog.ts` (instructions in `PROGRESS.md`). Write a script, `evals/flores/runFlores.ts` or `.py`, and save results to `evals/flores/results.json`. Report numbers exactly as measured, including when they are bad. FLORES sentences are news-style, not farmer messages, so say so.

**1.4 World Bank and brief datasets, written into `docs/evidence.md` and as rows in `docs/research-sources.md`.** Each item must end with a number, a year, a source URL and the date you fetched it.

- World Development Indicators (World Bank API, `https://api.worldbank.org/v2/`): Kenya rural population share, mobile subscriptions per 100 people, employment in agriculture share. Latest year available.
- Global Findex (World Bank): Kenya adults with a mobile money account, by gender. Find the indicator through the World Bank API or Data360 (`https://data360.worldbank.org`).
- GSMA Mobile Gender Gap Report 2025: Kenya women's smartphone ownership (`docs/research-sources.md` lists 39% as summary-only). Open the report and confirm or correct it.
- OpenCelliD: count cell towers by radio type (GSM, UMTS, LTE) within 10 km of Ruiru (-1.146, 36.961) and Othaya (-0.548, 36.943), two coffee areas. It needs a free API key, which is a human step. If there is no key, skip this and say so.
- WorldPop: population within 10 km of the same two points, from the Kenya 2020 constrained 100 m raster. Use it to give a "farmers one cooperative hub could reach" order of magnitude, clearly labelled as total population, not farmers. Skip it if the download is too large for the time left, and say so.
- LSMS-ISA, Uganda National Panel Survey (World Bank Microdata Library): needs a free registration, which is a human step. If you have no access, list it under next steps.

### Done when

`voteOnPlant` tests pass. `npm test` and `mobile` typecheck and lint pass. `docs/evidence.md` exists with every number sourced. `evals/flores/results.json` exists, or the task is listed under "Needs a human".

## Part 2: rules, rain and SMS

### Owns

`shared/` (all of it except `shared/src/localModel/` and `shared/src/plantVote*.ts`), `hub/src/answerQuestion.ts` and its test, `backend/`, `docs/data-flow.md` (new).

### Tasks, in priority order

**2.1 Action card rules, `shared/src/actionCard.ts`.** Replace the stub. Keep the signature `buildActionCard(input: ActionInput, context: ActionContext): ActionCard`. Put the per-condition rules in a lookup table, not a long `if` chain. Rules:

| Input | Decision | needsPerson | Notes |
|---|---|---|---|
| Plant `answer`, `healthy` | `monitor` | false | Recheck in 14 days. Remind her to check the undersides of lower leaves. |
| Plant `answer`, `rust` | `pruneAndClean`, upgraded to `spray` only when `wetDays.wetDaysLast7 >= 3` | false | Use the existing rust `actions` from `shared/src/diseases.ts`. The spray line must say copper protects healthy leaves, does not cure sick ones, use the label rate, and ask the officer about timing. Urgency `high`. Recheck in 7 days. |
| Plant `answer`, `cercospora` | `pruneAndClean` | false | Nutrition and shade first, from the existing actions. Recheck in 14 days. |
| Plant `answer`, `phoma` | `pruneAndClean` | false | Existing actions. Recheck in 14 days. |
| Plant `answer`, `miner` | `monitor` | false | Existing actions. Recheck in 14 days. |
| Plant `answer`, `weevil` or `mites` | `callOfficer` | true | The model cannot identify the insect. |
| Plant `retake` | `monitor` | false | Headline asks for clearer photos. No diagnosis. |
| Plant `needsPerson` (either reason) | `callOfficer` | true | Headline says the app is not sure. |
| SMS with `confirmed: false` or `condition: null` | `callOfficer` | true | |
| SMS with `confirmed: true` | Same as the plant `answer` row | | |

Every card fills `whatElseCouldItBe` with the problems the leaf model cannot see: coffee berry disease (look at berries for dark sunken patches), berry borer (small holes in berries), coffee wilt (whole branches wilting and dying), and poor soil or nutrition (yellowing across the whole tree). `sourceUrls` comes from the disease entry. Text in `sw` uses reviewed Swahili where it exists. New Swahili lines go in `shared/src/actionCard.sw.ts`, each with `reviewed: false`, and `buildActionCard` returns the English line for any unreviewed entry. Write tests for every row of the table, for both languages, and for the rain upgrade at 2 and 3 wet days.

**2.2 Contacts, `shared/src/contacts.ts`.** A list of `Contact` objects. Before setting `verified: true`, confirm each number on the organisation's own website and record the URL in `source` and the date in `verifiedOn`:

- KALRO contact centre (candidate number 0111010100, from a teammate's plan, not yet checked).
- KALRO soil lab, NARL Kabete: 0711301517 and cd.narl@kalro.org, Sh650 basic test, about 3 weeks, 500 g of topsoil. Already checked against Farmbiz Africa (13 Oct 2025); confirm on kalro.org.
- KEPHIS seed verification SMS short code 1393 (candidate, not yet checked).
- A "your cooperative field officer" entry with an empty phone number, which the app lets the farmer fill in once.

Export a function that returns only verified contacts plus the cooperative officer entry. Unverified numbers must never appear in farmer-facing output.

**2.3 Case summary SMS, `shared/src/caseSummary.ts`.** Replace the stub. Output one plain-text SMS for the officer containing the observation id, date, farm section, GPS with accuracy when present, verdict with leaf counts (for example "rust, 4 of 5 clear leaves agree"), the decision, wet days with source when present, and the model version. Pass it through `toSmsSafeText` and keep it under `SMS_MAX_CHARS`. Test the length limit with the longest realistic input.

**2.4 Rain, `shared/src/rain.ts` and a backend route.** The rust rule needs "wet days in the last 7". The phone is usually offline, so the app fetches this when it has a connection and caches it.

- Add a Convex HTTP route `GET /rain?lat=..&lon=..` in `backend/convex/http.ts` that returns `WetDays` JSON. A wet day is one with at least 1 mm of rain.
- Source: try CHIRPS first, because the brief lists it for agriculture. Find a daily-data access method that works from a server without a key. If none is workable in two hours, use NASA POWER daily `PRECTOTCORR` (`https://power.larc.nasa.gov/api/temporal/daily/point`), which needs no key, and set `source` to `"NASA POWER"`. Record which one you used, and why, in your report.
- `fetchWetDays(backendUrl, lat, lon)` calls the route with a timeout of 8 seconds and returns `null` on any failure.
- Tests use a fake `fetch`. Do not deploy the backend; deploying is a human step.

**2.5 SMS replies use the same card.** In the offline path (`shared/src/localModel/answerWithLocalModel.ts` is owned by nobody else for this change, so you may edit it), after a confident symptom match append one line with the card's decision, built through `buildActionCard({ kind: "sms", ... })`. Keep the brand prefix and opt-out handling in `smsCompliance.ts` unchanged, and keep the reply within `fitToSms`. All existing tests in `shared/`, `backend/` and `hub/` must still pass.

**2.6 Data-flow statement, `docs/data-flow.md`.** One page, plain language. For each path (phone app offline, phone app online for rain, SMS to the hub offline, SMS online through Twilio, Convex and Claude, voice line through ElevenLabs) say what data leaves the phone, where it goes, which company processes it and in which country, how long it is kept if known, and how to opt out (reply STOP). Name Twilio, Convex, Anthropic and ElevenLabs. Note that Kenya's Data Protection Act 2019 requires telling people about transfers outside Kenya. Give the consent text the app and the first SMS reply show. Check what `backend/src/conversationStore.ts` actually stores and for how long before you write that part.

**2.7 Exports.** At the end, add `contract.ts`, `actionCard.ts`, `caseSummary.ts`, `contacts.ts`, `rain.ts` and `plantVote.ts` (if Part 1 put it there) to `shared/src/index.ts`.

### Done when

`npm run typecheck`, `npm run lint` and `npm test` pass. Hub typecheck, lint and tests pass. Every row of the action card table has a test. `docs/data-flow.md` exists.

## Part 3: the phone app

Load the `better-interface` skill before writing any UI. The user's own design rules above win where they conflict with it.

### Owns

`mobile/App.tsx`, `mobile/src/screens/`, `mobile/src/components/`, `mobile/src/i18n/`, `mobile/src/storage/` (new), `mobile/package.json` and `mobile/app.json` (only for adding the packages below).

### Tasks, in priority order

**3.1 Packages.** `cd mobile && npx expo install expo-location expo-sms expo-file-system`. Read each package's SDK 57 docs page before use. Add the location permission text to `app.json` through the package's config plugin.

**3.2 Consent screen, shown once on first launch.** In plain words, and in Swahili through reviewed strings or English until reviewed, it says:

- photos stay on the phone
- location is saved with each check so the officer knows which part of the farm
- nothing leaves the phone unless she chooses to send a case to the officer by SMS
- she can delete everything from the settings

It has two buttons: one to agree and continue, and one to continue without location. Store the choice in `mobile/src/storage/`. The location permission request comes after this screen, never before.

**3.3 Six-leaf capture.** Replace the single-photo flow. The capture screen shows how many leaves are taken out of six as filled and empty marks, not as text. After each photo, call Part 1's `diagnosePlant` with all photos so far. Until Part 1 lands, the stub returns `needsPerson`. Show retake reasons per leaf when the quality gate failed (too dark or blurry) with a short instruction (move into daylight, hold steady, fill the frame with one leaf). Allow finishing early once the verdict is `answer`. Allow choosing photos from the gallery as well as the camera, as `pickLeafPhoto.ts` already does.

**3.4 Observation record and storage, `mobile/src/storage/`.** For each finished check, save an `Observation` (from `shared/src/contract.ts`) as JSON with `expo-file-system`: id, `capturedAt`, location and `accuracyMeters` if allowed, and an optional `farmSection` chosen from a short list she names herself ("upper slope", "near the road"), plus the `PlantCheck`. Add a settings action to delete all saved data, and another to export it as a JSON file through the share sheet.

**3.5 Action card screen.** Replace `ResultScreen` with a screen built from `buildActionCard({ kind: "plant", verdict }, { language, wetDays })`. Hierarchy, most important first:

1. The decision as the dominant element (icon and short headline).
2. The `doNow` steps.
3. The recheck date as a real date, for example "Check again on Sat 10 Oct".
4. "What else could it be" behind a disclosure, closed by default.
5. The photos with each leaf's result as a small mark.

Keep the read-aloud button from the current screen. When `needsPerson` is true, the primary button is "Send to field officer". It builds the text with `formatCaseSummarySms` and opens the phone's SMS app with `expo-sms`, which works without mobile data. If no officer number is saved yet, ask for it once and store it. Mark the observation `sentToOfficer` after the SMS app returns. Show a call button only for contacts with `verified: true`.

**3.6 Rain cache.** When the app has a connection and location consent, call `fetchWetDays` with the backend URL from `EXPO_PUBLIC_BACKEND_URL`. Store the result with its date, and pass it into `buildActionCard` while it is under 3 days old. With no data, the card is built without it, and nothing in the interface claims to know the weather.

**3.7 Strings.** Every new user-facing string goes in `mobile/src/i18n/strings.ts` for both `en` and `sw`. For `sw`, reuse reviewed text where it exists. Otherwise add the Swahili with a `reviewed: false` marker, using a small helper in that file that returns English for unreviewed lines.

**3.8 Run the three journeys on an Android emulator** and save a screenshot of each in `docs/screens/` (new folder):

- A clear plant: three or more leaves agree, and an action card appears.
- Unclear photos: the retake prompts appear.
- Disagreeing or unclear leaves: "Send to field officer" opens the SMS app with the summary.

Use photos from the internet or from `training/` only if they are licensed for reuse, and say where they came from.

### Done when

Mobile typecheck and lint pass with complexity at most 15. The three journeys run on the emulator with screenshots saved. Consent, delete and export work. No screen shows an unverified phone number.

## Step 4: integration and submission (one person, after all three parts)

1. Confirm the model owner has pushed the frozen model, `docs/data-card.md` and `docs/model-speed.md`. Then merge `part-2-rules` first (it owns the shared implementations), then `part-1-evidence`, then `part-3-app` into `main`. Run every command in the table above. Fix any failures before moving on.
2. Run the three journeys again on the merged app, and run one SMS through the hub offline.
3. Write the video script (2 to 5 minutes) in the brief's five parts:
   1. Problem statement, in the brief's template: "Because of this tool, [user] will [action] by [when] that they would otherwise [not do / do late / do worse]; we know because [evidence]."
   2. What the AI does and why SMS, a spreadsheet or a search could not, with the guardrails.
   3. The demo journeys.
   4. Where the tool sits in Noor's day, with the tech stack.
   5. What localizing AI development means to the team, using the FLORES Kikuyu result.

   In the script, name the brief's "foundational enablers" and show where each is handled: connectivity (offline model, SMS), digital literacy (one decision, read-aloud), trusted local institutions (cooperative, extension officer). Put the cooperative-wide case map and a consented farmer registry under "what happens next", linked to the brief's Ukraine registry example and the World Bank's AgriConnect goal. Never claim a partnership or endorsement.
4. Submit the prototype link, the code, and the video on the Hack-Nation site. This is a human step.

## Report format for every part

End with a short report:

- What was built, by file.
- Commands run and their results, pasted.
- Numbers measured, with where they are saved.
- "Needs a human": every step that was skipped because it needed an account, terms, a key, a deploy or a physical device.
- Anything another part must know, such as a changed signature.
