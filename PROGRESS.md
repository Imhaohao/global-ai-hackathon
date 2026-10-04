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
| On-device runtime in hub/ (llama.rn, text-only, memory guard, download + sideload) | Opus (inline) | done: emulator SMS round trip, Swahili in, Swahili confirm-first out, about 5 s per text |
| On-device runtime in mobile/ (label reading needs the vision file) | Sonnet subagent | todo |
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

### Switching to a fine-tuned model

1. Export the fine-tune as GGUF: either a full merged model, or the base GGUF plus a LoRA adapter GGUF (llama.cpp `convert_lora_to_gguf.py`).
2. Upload the files to Hugging Face and add an entry to `LOCAL_MODELS` in `shared/src/localModel/modelCatalog.ts` with `huggingFaceFile(...)` for each file (role `weights`, `adapter`, or `vision`), exact `bytes`, `sha256` (the LFS oid), and `recommendedRamBytes`.
3. If the fine-tune was trained on its own short prompt, put it in `systemPromptOverrides` for that task; the JSON schemas and validators stay the same.
4. Put the files in `~/.cache/leaf-doctor/models/<id>/`, run `LOCAL_MODEL_ID=<id> npm run eval:local-model`, and compare with the table above. Switch `ACTIVE_LOCAL_MODEL_ID` only if wrong final diagnoses stay at 0.
5. Hub: rebuild or set `EXPO_PUBLIC_LOCAL_MODEL_ID`. On launch it offers the new download (or `npm run sideload-model` from hub/ over adb), and deletes the old model's folder once the new one loads.

Hub notes: the 2B model needs about 4 GB of phone RAM; below `recommendedRamBytes` the hub shows why and keeps using keyword rules (a 2 GB emulator was killed by Android's low-memory killer while loading). llama.rn returns the JSON wrapped in chat-template text (`<think></think><|im_start|>assistant`), so `completeJson` extracts the first JSON object; `jinja: true` made the model think out loud and run out of tokens, so it stays off.

## Build plan

The current three-part build plan, written so an agent with no context can start, is [docs/build-plan.md](docs/build-plan.md). It supersedes the earlier plans in this file.

## 100 languages (app + phone line), started 2026-10-03

Decisions: app shows machine translations everywhere with a "not checked" note on advice; SMS keeps only reviewed lines. 91 Eleven v4 Turbo languages + 9 coffee-region text-only languages (rw, rn, om, ti, luo, mg, tet, ht, qu).

| Step | Owner model | Status |
|---|---|---|
| `shared/src/languages.ts` catalog, country map, suggestions | Opus (inline) | done |
| `shared/src/adviceText.ts` per-language advice text, app vs SMS channel | Opus (inline) | done, tests updated |
| `scripts/translations/` export, validate (placeholders, numbers, brand names), import | Opus (inline) | done, 4 tests |
| Translate 98 languages | Sonnet subagents x10 | done: 95 imported; kam, ff, luo refused (translators would not guess advice), so the picker hides them |
| Language picker (onboarding, login, capture, settings) + offline GPS country | Opus (inline) | done, typecheck/lint clean |
| Import translations | Opus (inline) | done, 320 tests incl. one per imported language |
| ElevenLabs language presets | Opus (inline, REST) | done: 79 presets + en = 80. The agent API rejects lg, wo, ff, kam, ceb, lo, zu, am, ckb, ln, sn as presets, so those are text-only |
| Simulator build check | Opus (inline) | done: picker, GPS suggestions (Kenya), Swahili and Amharic verified on iPhone 17 Pro simulator |
