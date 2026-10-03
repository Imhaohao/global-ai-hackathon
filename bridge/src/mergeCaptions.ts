import type { IncomingMessage } from "./messagesDb.ts";

// iMessage often stores "photo + caption" as two rows: the photo (no text), then the
// caption from the same sender. Folding them keeps one photo question = one reply.
export function mergeCaptions(messages: IncomingMessage[]): IncomingMessage[] {
  const merged: IncomingMessage[] = [];
  for (const message of messages) {
    const previous = merged.at(-1);
    const isCaptionForPrevious =
      previous !== undefined &&
      previous.sender === message.sender &&
      previous.attachments.length > 0 &&
      !previous.text &&
      message.attachments.length === 0 &&
      Boolean(message.text);
    if (isCaptionForPrevious) {
      merged[merged.length - 1] = { ...previous, rowId: message.rowId, text: message.text };
    } else {
      merged.push(message);
    }
  }
  return merged;
}
