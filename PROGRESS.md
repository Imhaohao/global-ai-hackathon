# Phone channels progress

Goal: farmers with any phone (feature-phone Nokia included) reach Leaf Doctor by SMS or voice call.

```
Farmer phone ──SMS──► Twilio number ──webhook──► backend/ on Convex (Claude) ──Twilio REST──► SMS reply
Farmer phone ──call─► Twilio number ──► ElevenLabs voice agent (knowledge from shared/)
Farmer phone ──SMS──► Hub phone SIM (hub/ Android app)
                         ├─ online:  POST backend /ask ──► reply SMS
                         └─ offline: shared/ symptom matcher ──► reply SMS
```

| Step | Owner model | Status |
|---|---|---|
| Disease facts with sources | Sonnet subagent | done |
| shared/: knowledge, matcher, SMS formatter, tests | Opus (inline) | done, 11 tests |
| backend/: Twilio webhook (signature check), /ask (bearer token), Claude advisor | Opus (inline) | done, 6 tests + live smoke |
| hub/: Expo Android app + Kotlin sms-gateway module | Sonnet subagent | done, 6 tests + emulator SMS round trip |
| ElevenLabs voice agent + phone number assignment | Opus (inline, MCP) | agent created (agent_8901m41g4zwvf5ksdccdaz3sqyv9); waiting on user to import Twilio number |
| Multilingual SMS + voice (language detection, 7 presets) | Opus (inline) | done |
| Backend hosted on Convex: https://ideal-civet-53.convex.site, durable sessions + rate limit | Opus (inline) | done, live smoke |
| Secrets via `npx convex env set`, Twilio webhook -> <site>/sms | user | todo |

## On-device small language model (shared/src/localModel/)

The model is swappable: callers use the `LocalModel` interface; model files and model-specific request options live in one `modelCatalog.ts` entry. Current pick: Qwen3.5-0.8B Q4_K_M + mmproj-F16 (737 MB, Apache-2.0), files in `~/.cache/leaf-doctor/models/`. The classifier still diagnoses; the small model reads labels, normalizes Swahili SMS for the matcher, and phrases rule verdicts behind a guard.

| Step | Owner model | Status |
|---|---|---|
| Interface, catalog, llama-server adapter | Opus (inline) | done |
| Tasks: parse farmer SMS, read product label, phrase verdict (guarded), with tests | Opus (inline) | done, 10 tests |
| Synthetic Swahili/English eval + runner (`npm run eval:local-model`) | Opus (inline) | done, 24 messages + 3 verdicts |
| Pick a model that passes the eval | Opus (inline) | done: Qwen3.5-2B active, see below |
| Model may never finalize a diagnosis alone (`matchWithModelHelp` -> confirmFirst) | Opus (inline) | done |
| On-device runtime adapter (llama.rn) in hub/ and mobile/ | Sonnet subagent | todo |
| Real label photos from the team for the label eval | user | todo |

Probe findings (2026-10-03): JSON-schema output and `enable_thinking: false` work through llama-server; Swahili translation with a glossary prompt is partly right but invents details, so the matcher gets original text plus translation, never translation alone.

Qwen3.5-0.8B eval (2026-10-03): fields 77/94 right, but symptom matcher went from 3 right / 10 unsure / 0 wrong on raw text to 7 right / 3 unsure / 3 wrong with the model's translation, and translations often parrot the prompt's worked example. One Swahili phrasing passed the number guard while being nonsense. Verdict: do not ship model-phrased Swahili or unconfirmed model-assisted diagnoses with this model.

Eval with the confirm-first policy (same 24 synthetic messages, temperature 0, files now in `~/.cache/leaf-doctor/models/<model id>/`):

| Model | Download | Fields right | Diagnosis: right / confirm-right / unsure / confirm-wrong / wrong |
|---|---|---|---|
| Raw text, no model | 0 | n/a | 3 / 0 / 10 / 0 / 0 |
| Qwen3.5-0.8B | 737 MB | 77/94 | 3 / 4 / 3 / 3 / 0 |
| Qwen3.5-2B (active) | 1.95 GB (1.28 GB without vision) | 84/94 | 3 / 7 / 2 / 1 / 0 |

Swahili phrasing failed on both models (garbled text passed the number guard once each), so replies use approved Swahili text only. Do not wire `phraseVerdictInSwahili` into a farmer-facing path until a native speaker signs off on a model.

Coordination: mobile/ belongs to the "Leaf Doctor" session. It switches strings.ts to import shared/ once diseases.ts lands.
