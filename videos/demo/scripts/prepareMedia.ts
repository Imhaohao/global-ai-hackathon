// Downloads and trims the licensed footage, and re-encodes the team's screen recordings, into public/video at 30 fps H.264.
// Usage: node scripts/prepareMedia.ts
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FOOTAGE, PHOTOS, RECORDINGS } from "../src/sources.ts";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../public");
const cacheDir = resolve(here, "../out/cache");
mkdirSync(resolve(publicDir, "video"), { recursive: true });
mkdirSync(cacheDir, { recursive: true });

function ffmpeg(args: string[]) {
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
}

for (const clip of FOOTAGE) {
  const cached = resolve(cacheDir, clip.download.split("/").pop()!);
  if (!existsSync(cached)) execFileSync("curl", ["-sSfL", "-A", "Mozilla/5.0", "-o", cached, clip.download]);
  const scale = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30";
  ffmpeg(["-ss", String(clip.trimStart), "-t", String(clip.seconds), "-i", cached, "-vf", scale, "-an", "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p", resolve(publicDir, clip.file)]);
  console.log("footage", clip.file);
}

for (const recording of RECORDINGS) {
  const source = recording.source.replace(/^~/, homedir());
  ffmpeg(["-i", source, "-vf", "fps=30,scale=1206:-2", "-an", "-c:v", "libx264", "-crf", "21", "-preset", "slow", "-pix_fmt", "yuv420p", resolve(publicDir, recording.file)]);
  console.log("recording", recording.file);
}

// The phone shots sit on a blurred still of the coffee farm clip.
ffmpeg(["-ss", "3", "-i", resolve(publicDir, "video/coffee-farm.mp4"), "-frames:v", "1", "-q:v", "3", resolve(publicDir, "images/backdrop-farm.jpg")]);

for (const photo of PHOTOS) {
  const title = decodeURIComponent(photo.page.split("/wiki/")[1]);
  const api = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=1400&format=json&titles=${encodeURIComponent(title)}`;
  const info = JSON.parse(execFileSync("curl", ["-sSfL", "-A", "LeafDoctorVideo/1.0", api]).toString()) as { query: { pages: Record<string, { imageinfo: { thumburl: string }[] }> } };
  const url = Object.values(info.query.pages)[0].imageinfo[0].thumburl;
  execFileSync("curl", ["-sSfL", "-A", "LeafDoctorVideo/1.0", "-o", resolve(publicDir, photo.file), url]);
  console.log("photo", photo.file);
}
