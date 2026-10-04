// The narration, one line per beat. Every figure here is sourced in out/DemoVideo-credits.txt.
export const VOICE = {
  name: "Frederick Surrey - Smooth and Velvety",
  id: "j9jfwdrw7BRfcR43Qohk",
  model: "eleven_multilingual_v2",
} as const;

export type BeatId = "problem" | "advisers" | "texts" | "reply" | "tiny" | "shop" | "seed" | "weekend" | "officer" | "alert" | "close";

/** Which part of the story a beat serves: the access problem, how a part works, or the result. */
export type StoryRole = "problem" | "explanation" | "solution";

export type ScriptLine = { beat: BeatId; role: StoryRole; text: string; spoken?: string; seed: number };

export const SCRIPT: ScriptLine[] = [
  { beat: "problem", role: "problem", text: "In rural Kenya, four in ten adults use a basic phone; two in three aren't online daily.", seed: 31 },
  { beat: "advisers", role: "problem", text: "And each farm adviser must cover hundreds of farmers.", seed: 32 },
  { beat: "texts", role: "explanation", text: "So Leaf Doctor works by text. Noor describes the spots,", seed: 33 },
  { beat: "reply", role: "explanation", text: "and the reply names the disease and three things to do.", seed: 34 },
  {
    beat: "tiny",
    role: "explanation",
    text: "Replies are plain 160-character texts, answered by a hub phone even offline.",
    spoken: "Replies are plain, one-hundred-and-sixty-character texts, answered by a hub phone even offline.",
    seed: 35,
  },
  { beat: "shop", role: "explanation", text: "Text SHOP for nearby farm shops.", seed: 36 },
  { beat: "seed", role: "explanation", text: "Before planting, she texts the seed packet's code to 1393.", spoken: "Before planting, she texts the seed packet's code to thirteen ninety-three.", seed: 37 },
  {
    beat: "weekend",
    role: "explanation",
    text: "At weekends, a smartphone checks leaves offline with an 8.57-megabyte model.",
    spoken: "At weekends, a smartphone checks leaves offline, with an eight-point-five-seven-megabyte model.",
    seed: 38,
  },
  { beat: "officer", role: "solution", text: "Unsure? One tap texts her field officer, or she simply calls.", seed: 39 },
  { beat: "alert", role: "solution", text: "When three nearby farms report one disease, an officer approves an alert to neighbours.", seed: 40 },
  { beat: "close", role: "solution", text: "With Leaf Doctor, let's re-leaf over-burdened specialists, and reach every single farmer in need.", seed: 41 },
];
