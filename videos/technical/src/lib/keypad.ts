// The basic phone's 12 keys and their printed legends. Pure data, so node scripts can read it too.
export const KEYS = [
  ["1", ""],
  ["2", "abc"],
  ["3", "def"],
  ["4", "ghi"],
  ["5", "jkl"],
  ["6", "mno"],
  ["7", "pqrs"],
  ["8", "tuv"],
  ["9", "wxyz"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
] as const;

/** Every printed legend on the keypad, so the word-count check can leave them out (scripts/checkWords.ts). */
export const KEYPAD_LEGENDS: string[] = KEYS.flat()
  .filter((legend) => legend !== "")
  .map((legend) => legend.toLowerCase());
