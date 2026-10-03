import { Audio, interpolate, Sequence, staticFile } from "remotion";

export type Sfx = "key" | "sms" | "scan" | "whoosh" | "hit" | "shutter";

export type Cue = { at: number; sound: Sfx; volume?: number };

export const cue = (at: number, sound: Sfx, volume = 1): Cue => ({ at, sound, volume });

export type VoiceClip = { id: string; from: number; speechEnd: number };

type SoundtrackProps = {
  music: string;
  voice: VoiceClip[];
  cues: Cue[];
  durationInFrames: number;
  musicLevel?: number;
  duckedLevel?: number;
};

const DUCK_RAMP = 8;

/** How far the music sits under the voice at a frame: down while a line is spoken, back up in the gaps. */
function musicVolume(frame: number, voice: VoiceClip[], durationInFrames: number, level: number, ducked: number) {
  const nearestDuck = Math.max(
    0,
    ...voice.map((clip) =>
      interpolate(frame, [clip.from - DUCK_RAMP, clip.from, clip.speechEnd, clip.speechEnd + DUCK_RAMP * 2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    ),
  );
  const fade = interpolate(frame, [0, 12, durationInFrames - 45, durationInFrames - 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (level - (level - ducked) * nearestDuck) * fade;
}

/** Music under everything, the voice line by line, and one-shot effects on the frames the picture hits. */
export function Soundtrack({ music, voice, cues, durationInFrames, musicLevel = 0.42, duckedLevel = 0.17 }: SoundtrackProps) {
  return (
    <>
      <Audio src={staticFile(music)} volume={(frame) => musicVolume(frame, voice, durationInFrames, musicLevel, duckedLevel)} />
      {voice.map((clip) => (
        <Sequence key={clip.id} from={clip.from} layout="none">
          <Audio src={staticFile(`audio/voice/${clip.id}.mp3`)} />
        </Sequence>
      ))}
      {cues.map((item, index) => (
        <Sequence key={index} from={item.at} layout="none">
          <Audio src={staticFile(`audio/sfx/${item.sound}.wav`)} volume={item.volume} />
        </Sequence>
      ))}
    </>
  );
}
