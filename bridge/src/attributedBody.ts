// Recent macOS versions often leave message.text NULL and store the text only in
// message.attributedBody, an NSAttributedString archived in Apple's "typedstream"
// format. The plain string follows the "NSString" class name, a '+' type tag, and a
// length: one byte below 0x80, or 0x81 + uint16 LE, or 0x82 + uint32 LE.
const CLASS_MARKER = Buffer.from("NSString");
const STRING_TAG = 0x2b;
const UINT16_LENGTH = 0x81;
const UINT32_LENGTH = 0x82;
const TAG_SEARCH_WINDOW = 12;

function readLength(buffer: Buffer, offset: number): { length: number; start: number } | null {
  const lead = buffer[offset];
  if (lead === undefined) return null;
  if (lead === UINT16_LENGTH) return { length: buffer.readUInt16LE(offset + 1), start: offset + 3 };
  if (lead === UINT32_LENGTH) return { length: buffer.readUInt32LE(offset + 1), start: offset + 5 };
  return lead < 0x80 ? { length: lead, start: offset + 1 } : null;
}

export function textFromAttributedBody(blob: Uint8Array | null | undefined): string | null {
  if (!blob) return null;
  const buffer = Buffer.from(blob);
  const markerAt = buffer.indexOf(CLASS_MARKER);
  if (markerAt < 0) return null;

  const searchFrom = markerAt + CLASS_MARKER.length;
  const tagAt = buffer.subarray(searchFrom, searchFrom + TAG_SEARCH_WINDOW).indexOf(STRING_TAG);
  if (tagAt < 0) return null;

  const header = readLength(buffer, searchFrom + tagAt + 1);
  if (!header || header.start + header.length > buffer.length) return null;
  return buffer.subarray(header.start, header.start + header.length).toString("utf8");
}
