import { useCurrentFrame } from "remotion";
import { BEATS, FPS, type BeatId, type Word } from "../lib/timeline";

/** Spoken words shown as figures or proper names. An empty string hides a word folded into the one before it. */
const DISPLAY: Partial<Record<BeatId, Record<string, string>>> = {
  hook: { six: "600", hundred: "" },
  data: { "Bee-two,": "B2,", twenty: "20,000", thousand: "" },
  biology: { "sixty-two": "62%;", "percent;": "", "Bee-two": "B2", "ninety-three.": "93." },
  bench: { "ninety-four": "94%,", "percent,": "", eight: "8.6", point: "", six: "", "megabytes.": "MB." },
  sms: { Kwen: "Qwen" },
  seed: { one: "1393.", three: "", nine: "", "three.": "" },
  hotspots: { "twenty-five": "25" },
};

const shownText = (id: BeatId, word: string) => DISPLAY[id]?.[word] ?? word;

const CHUNK = 6;

function chunkOf(words: Word[], seconds: number) {
  const spoken = words.findLastIndex((word) => word.start <= seconds);
  if (spoken < 0) return null;
  const start = Math.floor(spoken / CHUNK) * CHUNK;
  const chunk = words.slice(start, start + CHUNK);
  const ended = chunk[chunk.length - 1].end + 0.35 < seconds;
  return ended ? null : { chunk, spoken: spoken - start };
}

/** The narration as on-screen words, six at a time, each word lighting as it is spoken. */
export function Caption() {
  const frame = useCurrentFrame();
  const current = BEATS.find((item) => frame >= item.from && frame < item.from + item.speechFrames + 12);
  if (!current) return null;
  const shown = chunkOf(current.words, (frame - current.from) / FPS);
  if (!shown) return null;
  return (
    <div className="absolute inset-x-0 bottom-[34px] flex justify-center">
      <p className="rounded-full bg-black/55 px-7 py-2 text-caption font-bold text-text" style={{ backdropFilter: "blur(10px)" }}>
        {shown.chunk.map((word, index) =>
          shownText(current.id, word.text) === "" ? null : (
            <span key={`${word.start}`} style={{ opacity: index <= shown.spoken ? 1 : 0.35 }}>
              {shownText(current.id, word.text)}{" "}
            </span>
          ),
        )}
      </p>
    </div>
  );
}
