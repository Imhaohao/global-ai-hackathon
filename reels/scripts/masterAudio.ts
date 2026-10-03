// Two-pass loudness normalisation of the rendered reel's audio to -14 LUFS (short-form video level).
// Usage: node scripts/masterAudio.ts out/Demo.raw.mp4 out/Demo.mp4
import { spawnSync } from "node:child_process";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node scripts/masterAudio.ts <input.mp4> <output.mp4>");

const TARGET = "I=-14:TP=-1.0:LRA=9";

function measure(file: string) {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", `loudnorm=${TARGET}:print_format=json`, "-f", "null", "-"]);
  const report = run.stderr.toString();
  const json = report.slice(report.lastIndexOf("{"), report.lastIndexOf("}") + 1);
  return JSON.parse(json) as Record<string, string>;
}

function videoSeconds(file: string) {
  const run = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration", "-of", "csv=p=0", file]);
  return run.stdout.toString().trim().replace(/,$/, "");
}

const measured = measure(input);
const filter = `loudnorm=${TARGET}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`;
const run = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", input, "-c:v", "copy", "-af", filter, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-t", videoSeconds(input), output], { stdio: "inherit" });
if (run.status !== 0) throw new Error("ffmpeg failed");
console.log(`mastered ${output} from ${measured.input_i} LUFS`);
