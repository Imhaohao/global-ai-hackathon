import { ArrowRight, CheckCircle, Cpu, ShieldCheck } from "@phosphor-icons/react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { FeaturePhone } from "../components/FeaturePhone";
import { PartHeading } from "../components/PartHeading";
import { HUB, KIKUYU } from "../data/facts";
import { glide, leave, progress } from "../lib/ease";
import { wordAt } from "../lib/timeline";

const OUTPUTS = [
  { key: "app", title: "App card", image: "stills/app-card-crop.png" },
  { key: "sms", title: "SMS reply", image: "stills/sms-reply-crop.png" },
  { key: "officer", title: "Officer case summary", image: null },
] as const;

const OFFICER_TEXT = "Leaf Doctor case mut1rouobcu9, 2026-10-03. Result: not sure, leaves disagree, 3 of 3 leaves clear…";

function OutputCard({ output, index, at }: { output: (typeof OUTPUTS)[number]; index: number; at: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at + index * 6, 14);
  return (
    <div className="absolute flex w-[330px] flex-col-reverse" style={{ left: 820 + index * 370, top: 250, opacity: shown, translate: `0 ${(1 - shown) * 40}px` }}>
      <p className="mt-4 text-label font-bold text-text">{output.title}</p>
      {output.image ? (
        <Img src={staticFile(output.image)} className="w-[330px] rounded-lg" style={{ boxShadow: "0 0 0 1px rgb(255 255 255 / 0.1), 0 20px 50px rgb(0 0 0 / 0.5)" }} />
      ) : (
        <div className="rounded-lg bg-night-high p-6" style={{ boxShadow: "0 20px 50px rgb(0 0 0 / 0.5)" }}>
          <p className="font-data text-ui text-text">{OFFICER_TEXT}</p>
          <p className="mt-4 text-fineprint text-text-faint">Sent from the farmer’s own SMS app, with GPS, rain and model version</p>
        </div>
      )}
    </div>
  );
}

function RuleEngine({ exitAt }: { exitAt: number }) {
  const frame = useCurrentFrame();
  const exit = progress(frame, exitAt, 12, leave);
  const wire = progress(frame, 10, 24, glide);
  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div className="absolute left-[96px] top-[400px] w-[560px] rounded-lg bg-night-high px-8 py-7" style={{ boxShadow: "0 0 0 2px var(--color-live), 0 0 60px color-mix(in srgb, var(--color-live) 25%, transparent)", opacity: progress(frame, 0, 12) }}>
        <p className="font-data text-lead text-live">buildActionCard()</p>
        <p className="mt-2 font-data text-ui text-text-muted">shared/src/actionCard.ts</p>
        <p className="mt-4 text-label text-text">Plain rules: finding, urgency, next step, who to call, recheck date</p>
      </div>
      <svg className="absolute inset-0" width={1920} height={1080}>
        {OUTPUTS.map((output, index) => (
          <path
            key={output.key}
            d={`M 656 500 C 760 500, ${700 + index * 300} 200, ${985 + index * 370} 200 L ${985 + index * 370} 246`}
            fill="none"
            stroke="var(--color-live)"
            strokeWidth={2.5}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - wire}
          />
        ))}
      </svg>
      {OUTPUTS.map((output, index) => (
        <OutputCard key={output.key} output={output} index={index} at={18} />
      ))}
    </AbsoluteFill>
  );
}

const JSON_LINES = ['{', '  "topic": "leaf_symptoms",', '  "sprayProduct": "not_mentioned",', '  "sprayedWhen": "not_mentioned",', '  "rainAfterSpraying": "not_mentioned"', '}'];

function Arrow({ x, y, at }: { x: number; y: number; at: number }) {
  const frame = useCurrentFrame();
  return <ArrowRight size={44} weight="bold" className="absolute text-text-faint" style={{ left: x, top: y, opacity: progress(frame, at, 10) }} />;
}

function HubPath({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const fieldsAt = wordAt("sms", "fields") - 18;
  const confirmAt = wordAt("sms", "confirm") - 30;
  return (
    <AbsoluteFill style={{ opacity: progress(frame, at, 12) }}>
      <FeaturePhone text={HUB.swahili} typeAt={at} x={96} y={200} />
      <p className="absolute w-[300px] text-ui text-text-muted" style={{ left: 96, top: 724 }}>
        “{HUB.english}”
      </p>
      <Arrow x={392} y={330} at={at + 20} />
      <div className="absolute w-[280px] rounded-lg bg-night-high p-6" style={{ left: 450, top: 250, opacity: progress(frame, wordAt("sms", "small") - 4, 12) }}>
        <Cpu size={44} weight="bold" className="text-live" />
        <p className="mt-3 text-label font-bold text-text">{HUB.model}</p>
        <p className="text-ui text-text-muted">on the hub phone, {HUB.sizeGb} GB, no signal needed</p>
      </div>
      <Arrow x={746} y={330} at={fieldsAt} />
      <div className="absolute w-[600px] rounded-lg bg-black/60 p-6" style={{ left: 806, top: 230, opacity: progress(frame, fieldsAt, 10) }}>
        {JSON_LINES.map((line, index) => (
          <p key={line} className="whitespace-pre font-data text-ui text-live" style={{ opacity: progress(frame, fieldsAt + 4 + index * 5, 6) }}>
            {line}
          </p>
        ))}
      </div>
      <Arrow x={1414} y={330} at={confirmAt} />
      <div className="absolute w-[380px]" style={{ left: 1468, top: 220, opacity: progress(frame, confirmAt, 12), translate: `0 ${(1 - progress(frame, confirmAt, 12)) * 24}px` }}>
        <p className="text-ui text-text-muted">Rule matcher: rust, asked first</p>
        <div className="mt-3 rounded-lg bg-lcd p-5">
          <p className="font-data text-ui text-lcd-ink">Huenda ni Kutu ya majani ya kahawa. … Jibu ukieleza unachoona ili tuhakikishe.</p>
        </div>
        <p className="mt-3 text-ui text-text-muted">“This might be coffee leaf rust. … Reply with what you see so we can be sure.”</p>
      </div>
      <HubStats at={confirmAt + 14} />
    </AbsoluteFill>
  );
}

function HubStats({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const stats = [
    { icon: CheckCircle, value: HUB.fields, label: `fields read right on ${HUB.messages} synthetic messages`, width: 380 },
    { icon: CheckCircle, value: String(HUB.wrongFinal), label: "wrong final diagnoses", width: 300 },
    { icon: ShieldCheck, value: KIKUYU.flagged, label: "Kikuyu test sentences sent to a person before the model runs", width: 560 },
  ];
  return (
    <div className="absolute left-[450px] top-[700px] flex gap-10">
      {stats.map((stat, index) => {
        const shown = progress(frame, at + index * 5, 12);
        const Glyph = stat.icon;
        return (
          <div key={stat.label} style={{ width: stat.width, opacity: shown }}>
            <p className="flex items-center gap-3 whitespace-nowrap font-data text-title text-text figures">
              <Glyph size={40} weight="fill" className="text-live" />
              {stat.value}
            </p>
            <p className="text-ui text-text-muted">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Part 3: one rule function behind every surface, then the offline hub turning Swahili into checked fields. */
export function Sms() {
  const hubAt = wordAt("sms", "Offline") - 6;
  return (
    <AbsoluteFill className="bg-night">
      <PartHeading part={3} title="Deliver actionable help and trusted inputs" />
      <RuleEngine exitAt={hubAt - 10} />
      <HubPath at={hubAt} />
    </AbsoluteFill>
  );
}
