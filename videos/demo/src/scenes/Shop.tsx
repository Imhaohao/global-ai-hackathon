import { Storefront, Warning } from "@phosphor-icons/react";
import { AbsoluteFill } from "remotion";
import { Camera } from "../components/Camera";
import { Phone } from "../components/Phone";
import { Facts, Place, Stage } from "../components/Stage";
import { Tag } from "../components/Tag";
import { Thread, type Bubble } from "../components/Thread";
import { PHONE_SCREEN_HEIGHT, zoomAt } from "../lib/focus";
import { SCENES, cue } from "../timeline";
import { FERTILIZER_EXCHANGE, REPLY_PREFIX, SHOP_REPLIES } from "./shopReplies";

const start = SCENES.shop.from;
const local = (abs: number) => abs - start;
const PHONE_AT = { x: -380, y: 0 };

const HISTORY: Bubble[] = [
  { from: "farmer", text: FERTILIZER_EXCHANGE.question, at: -40 },
  { from: "bot", text: FERTILIZER_EXCHANGE.answer, at: -30 },
];

export const SHOP_BUBBLES: Bubble[] = [
  { from: "farmer", text: "SHOP", at: local(cue("shop", "SHOP")) - 4 },
  { from: "bot", text: REPLY_PREFIX + SHOP_REPLIES.askPlace, at: local(cue("shop", "town")) },
  { from: "farmer", text: "Othaya", at: local(cue("shop", "nearby")) },
  { from: "bot", text: REPLY_PREFIX + SHOP_REPLIES.agrovets, at: local(cue("shop", "and")) - 6 },
];

const BUBBLE_AREA = { x: 201, y: 330 };
const CAMERA = [zoomAt(0, BUBBLE_AREA, 1.45, PHONE_AT)];

/** SHOP: the bot asks for a town and lists agrovets with what to ask for, continuing the real thread. */
export function Shop() {
  return (
    <AbsoluteFill>
      <Stage backdrop="images/backdrop-phone.jpg">
        <Camera keys={CAMERA}>
          <Place x={PHONE_AT.x}>
            <Phone screenHeight={PHONE_SCREEN_HEIGHT} dark>
              <Thread bubbles={[...HISTORY, ...SHOP_BUBBLES]} />
            </Phone>
          </Place>
        </Camera>
        <Facts>
          <Tag icon={<Storefront size={44} weight="bold" />} from={local(cue("shop", "agrovets"))} to={local(SCENES.shop.to) + 4}>
            Names the ingredient, never a brand
          </Tag>
          <Tag icon={<Warning size={44} weight="bold" />} tone="rust" from={SHOP_BUBBLES[3].at + 4} to={local(SCENES.shop.to) + 4}>
            Shop names here are test data
          </Tag>
        </Facts>
      </Stage>
    </AbsoluteFill>
  );
}
