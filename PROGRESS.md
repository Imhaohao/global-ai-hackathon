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
| Pick a model that passes the eval (Qwen3.5-0.8B failed, see below) | Opus (inline) | todo |
| On-device runtime adapter (llama.rn) in hub/ and mobile/ | Sonnet subagent | todo |
| Real label photos from the team for the label eval | user | todo |

Probe findings (2026-10-03): JSON-schema output and `enable_thinking: false` work through llama-server; Swahili translation with a glossary prompt is partly right but invents details, so the matcher gets original text plus translation, never translation alone.

Qwen3.5-0.8B eval (2026-10-03): fields 77/94 right, but symptom matcher went from 3 right / 10 unsure / 0 wrong on raw text to 7 right / 3 unsure / 3 wrong with the model's translation, and translations often parrot the prompt's worked example. One Swahili phrasing passed the number guard while being nonsense. Verdict: do not ship model-phrased Swahili or unconfirmed model-assisted diagnoses with this model.

Coordination: mobile/ belongs to the "Leaf Doctor" session. It switches strings.ts to import shared/ once diseases.ts lands.
