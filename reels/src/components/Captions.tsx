import { useCurrentFrame } from "remotion";
import { progress } from "../lib/ease";

export type CaptionWord = { text: string; from: number; to: number; beat: string };

type Phrase = { words: CaptionWord[]; from: number; to: number };

const MAX_WORDS = 8;
const HOLD_AFTER = 12;

function endsClause(word: CaptionWord, next: CaptionWord | undefined) {
  return !next || next.beat !== word.beat || /[.,]$/.test(word.text);
}

/** Splits a long clause into near-equal halves so no caption runs past two lines. */
function splitClause(clause: CaptionWord[]): CaptionWord[][] {
  if (clause.length <= MAX_WORDS) return [clause];
  const half = Math.ceil(clause.length / 2);
  return [...splitClause(clause.slice(0, half)), ...splitClause(clause.slice(half))];
}

function clausesOf(words: CaptionWord[]): CaptionWord[][] {
  const clauses: CaptionWord[][] = [];
  let current: CaptionWord[] = [];
  words.forEach((word, index) => {
    current.push(word);
    if (!endsClause(word, words[index + 1])) return;
    clauses.push(current);
    current = [];
  });
  return clauses;
}

/** Groups the spoken words into short phrases at commas, full stops and beat changes. */
export function toPhrases(words: CaptionWord[]): Phrase[] {
  const phrases = clausesOf(words)
    .flatMap(splitClause)
    .map((group) => ({ words: group, from: group[0].from - 3, to: group[group.length - 1].to + HOLD_AFTER }));
  return phrases.map((phrase, index) => ({ ...phrase, to: Math.min(phrase.to, (phrases[index + 1]?.from ?? Infinity) - 1) }));
}

/** The voice, written out underneath as it is spoken; each word brightens the moment it is said. */
export function Captions({ phrases, bottom = 380 }: { phrases: Phrase[]; bottom?: number }) {
  const frame = useCurrentFrame();
  const phrase = phrases.find((candidate) => frame >= candidate.from && frame <= candidate.to);
  if (!phrase) return null;
  const shown = progress(frame, phrase.from, 6);
  return (
    <div className="absolute inset-x-safe-side flex justify-center" style={{ bottom }}>
      <p
        className="rounded-md bg-night/72 px-7 py-4 text-center text-caption font-bold text-balance text-paper-raised/45 shadow-[0_10px_40px_rgba(16,18,14,0.35)]"
        style={{ opacity: shown, translate: `0 ${(1 - shown) * 16}px` }}
      >
        {phrase.words.map((word, index) => (
          <span key={index} className={frame >= word.from ? "text-paper-raised" : undefined}>
            {index > 0 ? " " : ""}
            {word.text}
          </span>
        ))}
      </p>
    </div>
  );
}
