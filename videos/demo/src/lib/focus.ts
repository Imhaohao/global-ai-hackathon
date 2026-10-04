import { SCREEN } from "../components/Phone";
import type { CameraKey } from "../components/Camera";

/** Phone screen height, in frame pixels, for every phone shot in the video. */
export const PHONE_SCREEN_HEIGHT = 900;
const PIXELS_PER_POINT = PHONE_SCREEN_HEIGHT / SCREEN.height;

type Offset = { x: number; y: number };
const CENTRE: Offset = { x: 0, y: 0 };

/**
 * A camera key that zooms by `zoom` and brings a point on the phone screen (in device points) to `target`, an offset
 * from the frame centre in pixels. `phoneAt` is where the phone's centre sits in the unzoomed layer. The camera maps a
 * layer point p to translate + zoom * p, so translate = target - zoom * p.
 */
export function focus(at: number, point: Offset, zoom: number, phoneAt: Offset = CENTRE, target: Offset = CENTRE): CameraKey {
  const px = phoneAt.x + (point.x - SCREEN.width / 2) * PIXELS_PER_POINT;
  const py = phoneAt.y + (point.y - SCREEN.height / 2) * PIXELS_PER_POINT;
  return { at, scale: zoom, x: target.x - zoom * px, y: target.y - zoom * py };
}

/** The unzoomed camera. */
export const rest = (at: number): CameraKey => ({ at, scale: 1, x: 0, y: 0 });

/** Zooms around a screen point, keeping that point where it sits in the unzoomed shot. */
export function zoomAt(at: number, point: Offset, zoom: number, phoneAt: Offset = CENTRE): CameraKey {
  const restX = phoneAt.x + (point.x - SCREEN.width / 2) * PIXELS_PER_POINT;
  const restY = phoneAt.y + (point.y - SCREEN.height / 2) * PIXELS_PER_POINT;
  return focus(at, point, zoom, phoneAt, { x: restX, y: restY });
}

/** Where a cropped-in phone's subject sits: left of centre, clear of the facts column on the right. */
const CROP_TARGET: Offset = { x: -330, y: 0 };
const PHONE_LEFT: Offset = { x: -380, y: 0 };

/** A tight crop on a point of the phone screen, so the real UI fills most of the frame height. */
export function crop(at: number, point: Offset, zoom: number, targetX = CROP_TARGET.x): CameraKey {
  return focus(at, point, zoom, PHONE_LEFT, { x: targetX, y: CROP_TARGET.y });
}
