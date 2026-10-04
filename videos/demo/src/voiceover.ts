// The narration, one line per beat. Every figure here is sourced in out/DemoVideo-credits.txt.
export const VOICE = {
  name: "Frederick Surrey - Smooth and Velvety",
  id: "j9jfwdrw7BRfcR43Qohk",
  model: "eleven_multilingual_v2",
} as const;

export type BeatId = "reach" | "barriers" | "promise" | "scan" | "seed" | "sms" | "followup" | "officer" | "close";

/** Which part of the story a beat serves: the access problem, how a part works, or the result. */
export type StoryRole = "problem" | "explanation" | "solution";

export type ScriptLine = { beat: BeatId; role: StoryRole; text: string; spoken?: string; seed: number };

export const SCRIPT: ScriptLine[] = [
  { beat: "reach", role: "problem", text: "The tools to protect a harvest already exist, but they don't reach farmers.", seed: 51 },
  { beat: "barriers", role: "problem", text: "Two in three rural Kenyans aren't online daily. Four in ten use a basic phone. And one adviser covers hundreds of farms.", seed: 52 },
  { beat: "promise", role: "solution", text: "Leaf Doctor removes those barriers: the app works in airplane mode, and it answers by text.", seed: 53 },
  { beat: "scan", role: "explanation", text: "Noor photographs her coffee leaves. The model runs on the phone with zero internet, then gives steps and a day to recheck.", seed: 54 },
  { beat: "seed", role: "explanation", text: "A seed packet's barcode shows genuine or recalled. It all works in airplane mode, with zero internet.", seed: 55 },
  { beat: "sms", role: "explanation", text: "No smartphone? No internet. No data. Just a text. The reply names the disease and what to do.", seed: 56 },
  { beat: "followup", role: "explanation", text: "She can ask a follow-up, text SHOP to find where to buy, and send seed codes to 1393.", spoken: "She can ask a follow-up, text SHOP to find where to buy, and send seed codes to thirteen ninety-three.", seed: 57 },
  { beat: "officer", role: "solution", text: "Unsure? One tap sends her case to the field officer.", seed: 58 },
  { beat: "close", role: "solution", text: "With Leaf Doctor, let's re-leaf over-burdened specialists, and reach every single farmer in need.", seed: 41 },
];
