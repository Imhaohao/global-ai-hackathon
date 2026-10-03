import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { textFromAttributedBody } from "./attributedBody.ts";

export const MESSAGES_DB_PATH = join(homedir(), "Library", "Messages", "chat.db");
const GROUP_CHAT_STYLE = 43;
const BATCH_SIZE = 50;

export interface IncomingMessage {
  rowId: number;
  sender: string;
  service: string;
  text: string | null;
  isGroupChat: boolean;
}

interface MessageRow {
  rowId: number;
  sender: string;
  service: string | null;
  text: string | null;
  body: Uint8Array | null;
  style: number | null;
}

const NEW_MESSAGES_SQL = `
  SELECT m.ROWID AS rowId, h.id AS sender, COALESCE(c.service_name, m.service) AS service,
         m.text AS text, m.attributedBody AS body, c.style AS style
  FROM message m
  JOIN handle h ON h.ROWID = m.handle_id
  LEFT JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
  LEFT JOIN chat c ON c.ROWID = cmj.chat_id
  WHERE m.ROWID > ? AND m.is_from_me = 0 AND m.associated_message_type = 0 AND m.item_type = 0
  ORDER BY m.ROWID
  LIMIT ${BATCH_SIZE}`;

export class MessagesDb {
  private readonly db: DatabaseSync;

  constructor(path = MESSAGES_DB_PATH) {
    this.db = new DatabaseSync(path, { readOnly: true });
  }

  latestRowId(): number {
    const row = this.db.prepare("SELECT COALESCE(MAX(ROWID), 0) AS rowId FROM message").get() as { rowId: number };
    return row.rowId;
  }

  messagesAfter(rowId: number): IncomingMessage[] {
    const rows = this.db.prepare(NEW_MESSAGES_SQL).all(rowId) as unknown as MessageRow[];
    return rows.map((row) => ({
      rowId: row.rowId,
      sender: row.sender,
      service: row.service ?? "SMS",
      text: row.text ?? textFromAttributedBody(row.body),
      isGroupChat: row.style === GROUP_CHAT_STYLE,
    }));
  }

  close(): void {
    this.db.close();
  }
}
