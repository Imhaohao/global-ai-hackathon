# Leaf Doctor: refined plan

Leaf Doctor helps Noor, a coffee farmer, find out what is wrong with a sick coffee leaf and who to call about it. The brief's setting is fictional, so we use Kenya's coffee belt for evidence. Source status is written after each link: Checked (we opened the page and confirmed the figure), Read (a researcher read it), Summary only (not opened; open before quoting).

## Problem statement

Because of this tool, Noor will find out what is wrong with a sick coffee leaf, and reach a verified person about it, within a day of seeing the spots, which she would otherwise do late or not at all; we know because Kenya has about one extension officer per 1,380 farmers ([Kenya extension policy 2023](https://kilimo.go.ke/wp-content/uploads/2024/10/KENYA-AGRICULTURAL-SECTOR-EXTENSION-POLICY-2023.pdf), summary only), because phone-only advice in trials moved yields by 4% with a confidence interval of -3% to 10% ([GiveWell](https://www.givewell.org/international/technical/programs/precision-agriculture-for-development), read) while in-person training raised Ugandan coffee yields 7% ([IFPRI](https://www.ifpri.org/blog/training-ugandan-coffee-farmers-on-agronomy-practices-more-than-pays-for-itself/), read), and because a trained diagnosis app beat farmers and extension agents in the field for cassava ([Nuru, Frontiers 2020](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2020.590889/full), read).

We do not claim Leaf Doctor raises yield. None of these studies tested it.

## User journey

| When | What Noor does | What happens |
|---|---|---|
| She sees spots on a leaf on the slope | Texts a plain description to the cooperative's number, or calls the voice line | First text: consent message and a statement of what data is kept. Then the hub phone answers |
| Within minutes, online | Reads the reply on her own basic phone | The hub forwards the text to our backend; Claude drafts an answer from a fixed disease list; a rule check and approved Swahili wording produce the reply |
| Within minutes, no signal at the hub | Same | An on-device model reads her Swahili and fills in structured fields; a rule matcher picks the likely disease and always asks her to confirm |
| Weekend, daughter home with the smartphone | Photographs six leaves | Offline classifier says confident, possible or unclear, and flags unusable photos; the scan stores time, GPS with accuracy, farm section and model version |
| Right after the scan | Reads the action card | Finding, uncertainty, urgency, what to do now, a verified contact, a recheck date; the same card goes out as an SMS |
| If the result is unsure | Taps "send to a person" | A case summary goes to the extension officer's phone, with the photos and the daily rain for the past weeks ("what happened") |
| Recheck date | Looks again | The app and SMS remind her to compare the leaf |

## Architecture

```
 Noor's phone --SMS--> cooperative hub phone (Android, SIM) ---+
 Noor's phone --call-> ElevenLabs voice line                   |
                                                               v
              online:  hub --HTTP--> Convex backend --> Claude (disease list only)
              offline: hub --> Qwen3.5-2B (parse Swahili to fields)
                                  --> rule matcher --> confirm-first reply
                                                               |
 Daughter's smartphone app: 6 photos --> 1.9 MB TFLite -------+
   classifier (offline) --> confident / possible / unclear     |
                                                               v
                       buildActionCard() in shared/  (pure rules)
                         |-- SMS reply to Noor
                         |-- app card with call button
                         `-- case summary --> extension officer
                              (+ NASA POWER daily rain)
```

## What the AI does, and why simpler tools fall short

- Language: the 2B model (Qwen3.5-2B, about 4 GB of phone RAM) turns free Swahili such as "majani yana madoa ya manjano" into fields (crop part, colour, spread). A keyword menu or SMS shortcode cannot read free text, and a spreadsheet cannot take a photo.
- Vision: a 1.9 MB image classifier trained on the Project-AgML arabica set separates four diseases and healthy leaves offline. A search engine cannot recognise a leaf, and Noor has no data bundle on the slope.
- Claude online: drafts answers from our fixed disease list. It replaces nothing the rules decide.
- Where AI is not needed: the verified contact list, the recheck date and the rain figure are plain lookups, and we keep them plain. If a farmer could pick a number from a menu, a menu is better.
- Why not a general model: a zero-shot Gemini 2.5 Pro scored 42.42% on banana disease, while a fine-tuned model scored 92.21% in-domain and 83.28% out-of-domain ([BananaVLM](https://arxiv.org/html/2609.25040), read). We cut zero-shot diagnosis for that reason.

## Guardrails, privacy and consent

- Confirm-first: the model never finalises a diagnosis alone. Every model-assisted result asks Noor a confirming question before it becomes a finding.
- Pre-approved Swahili only: farmer-facing Swahili comes from a fixed text set. In our test, model-written Swahili failed on both model sizes, so it is not used.
- "Not sure" goes to a person: low-confidence or unclear results set `needsPerson` and send a case summary to the extension officer.
- No invented doses: advice quotes the product label rate only. Integrated pest management (IPM, meaning cultural and cheap measures first) comes before any chemical.
- Consent: the first SMS asks for consent before storing anything. The app has a consent screen for photos and location, with export and delete.
- Data-flow statement: what is stored (text, photos, GPS, farm section), where (Convex backend, the hub phone, the app), who sees it (the extension officer, only after "send to a person"), and how to delete it. Written in the repo and read out in the video.
- Bias: the classifier was trained on one dataset. Its errors may fall unevenly on varieties and light conditions we have not tested. See Known limits.

## Data

| Dataset | Source | Licence | Size | Use |
|---|---|---|---|---|
| Project-AgML arabica coffee leaves | [Project-AgML](https://github.com/project-agml) (confirm exact URL in the data card) | CC-BY-4.0 | 58,549 images, 5 classes (rust, cercospora, leaf miner, phoma, healthy) | Train the classifier |
| BRACOL arabica leaves | Brief's Annex B list | Terms to be checked before use | To be counted by A | Field test set |
| NASA POWER | Brief's Annex B list | Open, no registration | Daily rain by coordinates | "What happened" line |
| Synthetic Swahili and English messages | We wrote them | Ours | 24 messages | Local-model evaluation |

Data that shows the problem:

- Extension reach: 1:1,380 in Kenya, target 1:600 by 2029 (policy above, summary only). In Uganda 2,561 of 5,874 extension posts are filled ([The Cooperator](https://thecooperator.news/ag-faults-ministry-for-shortage-of-agricultural-extension-workers/), read).
- Phones: 53.7% of Kenyans own a phone, 48.6% in rural areas ([Communications Authority](https://www.ca.go.ke/urban-rural-digital-divide-hinders-ict-uptake-joint-ca-and-knbs-survey-shows), read), and 29.6 million feature phones are still on networks ([Techweez](https://techweez.com/2026/04/07/kenya-smartphones-penetration-feature-phone-decline/), read). That is why the main channel is SMS.
- Farmer lists: Kenya's coffee geo-mapping was 30% done in September 2025 ([Farmer's Journal](https://thefarmersjournal.com/kenya-accelerates-coffee-geo-mapping-to-meet-eudr-deadline-and-protect-kes-90-billion-in-exports/), read), and only 23% of Ugandan coffee farmers are in cooperatives ([EPRC](https://eprcug.org/blog/how-ucda-merger-with-maaif-impacts-coffee-farmers-registration-process/), read).

What our data does not cover: coffee berry disease, coffee berry borer and coffee wilt are not classes in the training set. The images come from one dataset, not from Noor's slope. Swahili test messages are synthetic. We found no published measure of how many Kenyan farmers a missing registry excludes.

## Evidence it works

Already measured: on 24 synthetic Swahili and English messages with confirm-first, Qwen3.5-2B filled 84 of 94 fields correctly and produced 0 wrong final diagnoses. The 0.8B model filled 77 of 94 and was rejected because garbled Swahili passed its safety check and its translations hurt the matcher.

To measure this weekend and report as found:

- BRACOL test set with splits that keep every farm or session in only one set, so photos of the same plant never sit in both training and test. Per-class precision (how often a named disease is right) and recall (how often a real case is caught), plus the pairs the model confuses.
- Classifier size and speed on a real cheap Android phone, and the 2B model's speed on a real phone (unmeasured so far; about 5 s per text was seen on an emulator only).
- Share of unusable photos caught, and share of uncertain results routed to a person.
- Six-leaf voting against single-leaf scoring, as Nuru reported 74-88% with six leaves ([PMC7775399](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7775399/), read).

If a number is worse than hoped, we publish it.

## Local language

Swahili is the language of the SMS, voice and app replies, with English fallback. Kikuyu is probably Noor's home language in Kenya's coffee belt and we have not tested it. The 2B model reads Swahili only approximately, and it has no verified Kikuyu ability. Our plan: a Kikuyu speaker writes 30 short farmer messages, we run them through the same evaluation, and we report field accuracy. Until that is done, Kikuyu speakers get the menu-style Swahili or English reply with "call this number", and any Kikuyu text is treated as unclear and routed to a person. Swahili wording also still needs a native-speaker review before farmers see it.

## Scalability and what happens next

- Another crop or country: the disease list, wording and contact list live in `shared/`. A new setting needs a new list, translations and a test set. The model files do not change for the SMS path.
- Cooperative map: each consented report already carries time, location and section. Plotting them gives the cooperative a map of where leaf rust appears.
- Registry: the brief names the missing farmer registry as the binding constraint. Consented farmer records with plot GPS would serve disease alerts and the EU deforestation rule (EUDR), which applies from 30 December 2026 to large and medium operators and from 30 June 2027 to small ones ([European Commission](https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation), checked). FAO mapped 19 societies with enumerators' own Android phones at about $0.30 per farmer ([FAO](https://www.fao.org/transparent-supply-chains/detail/detail/from-one-cooperative-to-a-county--how-kenyan-coffee-farmers-are-taking-ownership-of-their-geodata-with-open-foris-ground-and-whisp/en), read). This is a next step, not built.
- Hardware: Kenyan state hardware often goes unused (100,000 Community Health Promoter phones, MP said over 60% do not work: [The Star](https://www.the-star.co.ke/news/2026-05-13-mps-raise-concerns-on-quality-of-smartphones-issued-to-community-health-workers), checked), so we put the model on a phone a cooperative already owns rather than waiting for one to be issued.

## What we cut and why

| Cut | Reason |
|---|---|
| Seed purchase audit | Seed check via KEPHIS 1393 stays as one line of advice. The Kenyan seed-code trial was on maize ([J-PAL](https://www.povertyactionlab.org/evaluation/consumer-information-reduce-counterfeit-agricultural-goods-kenya), checked), and we found no coffee pesticide verification codes |
| Farm map UI | Costs a weekend; the map is described as what happens next |
| Spray-timing forecast texts | The SMS weather result (+12%) was on maize and beans, not coffee ([TomorrowNow](https://tomorrownow.org/weather-intelligence-that-reaches-the-last-mile-12-yield-gains-for-kenyan-farmers/), checked) |
| Fertilizer bag scanning | Needs its own dataset and label photos; not a leaf decision |
| iSDAsoil lime advice | Lime evidence is on maize; KALRO soil labs (NPK test Sh650: [Farmbiz Africa](https://farmbizafrica.com/kalro-offers-all-farmers-low-cost-pathway-to-8x-yields-with-laboratory-soil-tests/), checked) get a referral instead |
| Price feature | The brief asks for one decision. A price lookup is a spreadsheet job |
| Phone 3D scanning | Evidence is four hazelnut trees ([Sensors 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12473222/), read) |
| Zero-shot VLM diagnosis | 42.42% on banana disease (BananaVLM, above) |

## Known limits

- The classifier cannot see coffee berry disease, berry borer or wilt. It will call such a leaf "unclear" or, worse, wrongly confident. This is why every output needs a recheck and a person route.
- Field accuracy is unknown until the BRACOL test runs. Lab-style coffee models report about 99% ([Software 2024](https://doi.org/10.3390/software3020007), summary only), and we expect lower in the field.
- Kikuyu is untested and needs a native speaker.
- The hub phone belongs to the cooperative. Noor does not own the intelligence; she reaches it through a person's phone, and if the cooperative's phone is off or out of credit, she gets no answer.
- The 2B model's speed on a real phone is unmeasured, and it needs about 4 GB of RAM. A cheap 2 GB phone falls back to keyword rules. We found no published speed test for 1-3B models on 3-6 GB Android phones.
- Weather and seed-code trials cited here were on maize, and the Uganda coffee RCT found phone advice gave only "more modest" changes than training.
- The verified contact list (KEPHIS 1393, a KALRO contact) must be rechecked by a person before submission.

## Team split and deadline

| | A: model and data | B: phone app | C: rules, SMS channel, submission |
|---|---|---|---|
| Owns | `training/`, `mobile/src/diagnosis/` | `mobile/src/screens/`, `components/`, `i18n/` | `shared/`, `hub/`, `backend/`, `docs/`, video |
| Sat 3 Oct by 20:00 | BRACOL test set with leakage-safe splits; per-class precision and recall | Consent screen; capture saves time, GPS, section, model version | `Observation`, `ActionCard`, `buildActionCard()`; consent SMS; data-flow statement |
| Sun 4 Oct by 12:00 (feature freeze) | Six-leaf vote; unusable-photo check; size and latency on a cheap Android; data card | Action card screen; call button; "not sure" path to case summary | Action-card rules; verified contacts; SMS card |
| Sun by 17:00 | Numbers into video and README | Record the app journey | Video script, assembly, submission |

Sync points: Sat 16:00 types agreed, Sat 20:00 demo of each part, Sun 12:00 freeze, Sun 15:00 full run-through on a real phone. Submission is the end of Sunday 4 October 2026; the video (2 to 5 minutes) is required or the entry cannot be shortlisted.
