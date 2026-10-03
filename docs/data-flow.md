# Where farmer data goes

Written 3 Oct 2026. Provider facts come from each provider's own documentation as found on that date; confirm them before the project handles real farmers. Items marked "not known" are not recorded anywhere in this repo.

## The short version

Photos never leave the phone. Text messages and phone calls are the only paths that send data to other companies, and each of those companies is named below.

## Path by path

| Path | What leaves the phone | Where it goes | Who processes it, and where | How long it is kept | How to opt out |
|---|---|---|---|---|---|
| Phone app, offline (photo check, action card, case summary) | Nothing | Stays in the app's storage on the phone | Nobody else | Until the farmer deletes it in Settings | Delete everything in Settings |
| Phone app, online for rain | Approximate location, rounded to 0.1 degree (about 11 km), in the web address of one request | Our Convex server, which forwards the same rounded point to NASA POWER and returns a count of wet days | Convex (hosting), NASA POWER (public weather service). The route writes nothing to the database | Not saved in our database. Request logs on Convex and NASA's own logs: not known. | Decline location on the consent screen. The app then builds the card without rain |
| Phone app, case sent to the officer | The case summary text (observation id, date, farm section, GPS, verdict, model version) | The farmer's own SMS app, then her mobile network, then the officer's number | The farmer's mobile network operator in Kenya. No Leaf Doctor server is involved | Whatever the two phones and the operator keep | The farmer chooses to send each case. Nothing is sent otherwise |
| SMS to the hub phone, answered offline | The farmer's text and number reach the hub phone as ordinary SMS | The hub phone at the cooperative. The on-device language model reads the text and a rule-based matcher writes the reply | Nobody else. The hub keeps its 50 most recent exchanges in memory only, lost when the app closes. The hub phone's normal SMS inbox keeps the messages like any phone | Memory: until the app closes. SMS inbox: until deleted on the hub phone | Reply STOP. Ask the cooperative to delete the thread |
| SMS answered online through Twilio, Convex and Claude | The farmer's text and phone number | Twilio receives the SMS, sends it to our Convex server, which sends the text and up to 8 earlier messages to Anthropic's Claude API. The answer returns the same way | Twilio (SMS delivery), Convex (hosting and the conversation store), Anthropic (writes the answer). All three are US companies. Convex hosts in US East or EU West, chosen when the deployment was created: not recorded in this repo | Twilio: message records are kept until deleted, shown in the console for 13 months by default, and backups can hold deleted bodies for up to 30 days. Convex: see the next section. Anthropic: API inputs and outputs are deleted within 30 days by default | Reply STOP. Email imzihaoi@gmail.com to delete stored messages (see the privacy page at `/privacy`) |
| Hub phone with internet (online answer) | The farmer's number and text, sent from the hub phone to our Convex server | Same as the row above, minus Twilio on the way in | Convex and Anthropic | Same as the row above | Reply STOP. Turn off the backend URL on the hub to force offline answers |
| Voice line through ElevenLabs | The caller's voice and the phone number | Twilio carries the call to an ElevenLabs voice agent that uses the same disease knowledge | Twilio (call carrier), ElevenLabs (speech and the agent). ElevenLabs' processing country by default: not known. EU data residency is an Enterprise feature | ElevenLabs keeps transcripts and audio for 2 years by default unless the agent's retention is changed. The agent's setting in our account: not checked | Hang up. Ask for deletion by email. Lowering the retention and turning off audio saving are settings we control and have not yet set |

Sources for the provider facts: Twilio help article "SMS and MMS Message and Traffic Storage"; Anthropic privacy center "How long do you store my organization's data"; Convex docs "Regions"; ElevenLabs docs "Retention".

## What the server stores for SMS conversations

Read from `backend/src/conversationStore.ts` and `backend/convex/phoneSessions.ts`:

| Stored in the Convex table `phoneSessions` | Detail |
|---|---|
| The full phone number | Used as the lookup key, stored unmasked |
| The last 8 messages | 4 questions and 4 answers, as full text. Older ones are dropped each time a new exchange is saved |
| Time of last activity | Used by the idle rule below |
| The times of the last replies in the past 10 minutes | At most 5, used to stop one number from getting more than 5 replies in 10 minutes |

The idle rule: after 24 hours with no message, the saved turns are ignored when the next question arrives, and the next exchange overwrites them. Nothing deletes the row on a timer. A farmer who texts once and never again leaves her last 8 messages and her number in the database until someone deletes them by hand. This is a gap against the "kept only as long as needed" idea in the Data Protection Act, and a scheduled cleanup is the fix.

Logs: the backend logs only the last four digits of a number when a reply fails (`maskPhone`).

## Kenya's Data Protection Act 2019

The Act restricts moving personal data out of Kenya and expects people to be told about it. Twilio, Convex, Anthropic and ElevenLabs are all outside Kenya, so the farmer must be told in plain words, and for the online and voice paths she should consent to it first. Sections 48 and 49 set the conditions for transfers, and section 49 asks for consent and safeguards before sensitive personal data is processed abroad. A phone number and a farm location both identify a person. This document is an engineering summary and not legal advice; a lawyer or the Office of the Data Protection Commissioner should confirm the registration and transfer steps before real farmers use the service. The Commissioner published cross-border guidance notes in 2026 that apply here.

## The consent text

Phone app, first launch (shown before the location prompt):

> Your photos stay on this phone. Your location is saved with each check so the officer knows which part of the farm. Nothing leaves this phone unless you choose to send a case to your field officer by SMS. If you allow location, the app also asks our server about recent rain, using a rounded location, about 10 km wide. You can delete everything in Settings.

The last two sentences about rain are new and need to be added to the consent screen in `mobile/src/i18n/strings.ts`. Its Swahili version is unreviewed until a native speaker checks it.

First SMS reply, as it is sent today (`OPT_OUT_FOOTER` in `shared/src/smsCompliance.ts`):

> Reply STOP to opt out, HELP for help. Msg&data rates may apply.

That footer does not say that the text is processed by companies outside Kenya. The `/privacy` page does. Proposed addition for the first reply on the online path, not yet in the code:

> Your text is read by US companies (Twilio, Anthropic) to write the answer. Reply STOP to opt out.

It fits in the first-reply allowance only if the footer is shortened, so the first reply would give up one step of advice. Decide that trade before changing it.

## Gaps to close

| Gap | Fix |
|---|---|
| Old conversations stay in Convex | Add a scheduled job that deletes `phoneSessions` rows idle for more than 24 hours |
| Convex region not recorded | Read it from the Convex dashboard and write it here |
| ElevenLabs retention is the 2-year default | Set a shorter retention and turn off audio saving in the agent's settings |
| First SMS reply does not name the foreign processors | Decide on the proposed sentence above |
| Hub replies skip the brand prefix and footer | The hub sends `answer.reply` directly through `sendSms`, so only Twilio replies go through `formatOutgoingSms`. This matters for carrier rules if the hub's SIM sends bulk traffic |
