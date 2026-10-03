import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { askLeafDoctor } from "./askLeafDoctor.ts";
import { textFromAttributedBody } from "./attributedBody.ts";
import { MessagesDb } from "./messagesDb.ts";
import { decideIncoming, SESSION_MS } from "./sessionRules.ts";

function typedstreamBlob(text: string): Uint8Array {
  const utf8 = Buffer.from(text, "utf8");
  const length = utf8.length < 0x80 ? Buffer.from([utf8.length]) : Buffer.from([0x81, utf8.length & 0xff, utf8.length >> 8]);
  return Buffer.concat([
    Buffer.from("\x04\x0bstreamtyped\x81\xe8\x03\x84\x01@\x84\x84\x84\x12NSAttributedString\x00\x84\x84\x08NSObject\x00\x85\x92\x84\x84\x84\x08", "latin1"),
    Buffer.from("NSString"),
    Buffer.from([0x01, 0x94, 0x84, 0x01, 0x2b]),
    length,
    utf8,
    Buffer.from([0x86, 0x84, 0x02, 0x69, 0x49]),
  ]);
}

test("decodes short and long attributedBody text, including non-Latin scripts", () => {
  assert.equal(textFromAttributedBody(typedstreamBlob("LEAF orange powder")), "LEAF orange powder");
  const long = "majani yana unga wa machungwa chini ".repeat(8);
  assert.equal(textFromAttributedBody(typedstreamBlob(long)), long);
  assert.equal(textFromAttributedBody(typedstreamBlob("ቅጠል ዝገት")), "ቅጠል ዝገት");
  assert.equal(textFromAttributedBody(Buffer.from("no marker here")), null);
  assert.equal(textFromAttributedBody(null), null);
});

test("only texts starting with LEAF open a conversation", () => {
  const now = 1_000_000;
  assert.deepEqual(decideIncoming("LEAF orange powder under leaves", undefined, now), { kind: "answer", question: "orange powder under leaves" });
  assert.deepEqual(decideIncoming("leaf: brown rings", undefined, now), { kind: "answer", question: "brown rings" });
  assert.deepEqual(decideIncoming("Leaf", undefined, now), { kind: "welcome" });
  assert.deepEqual(decideIncoming("are we still on for dinner?", undefined, now), { kind: "ignore" });
  assert.deepEqual(decideIncoming("leafy greens tonight?", undefined, now), { kind: "ignore" });
});

test("follow-ups are answered for 30 minutes, then ignored; STOP ends the conversation", () => {
  const start = 1_000_000;
  assert.deepEqual(decideIncoming("yes, underneath", start, start + 60_000), { kind: "answer", question: "yes, underneath" });
  assert.deepEqual(decideIncoming("yes, underneath", start, start + SESSION_MS + 1), { kind: "ignore" });
  assert.deepEqual(decideIncoming("STOP", start, start + 60_000), { kind: "end" });
  assert.deepEqual(decideIncoming("stop", undefined, start), { kind: "ignore" });
});

test("reads only new incoming one-to-one messages from a Messages-shaped database", () => {
  const path = join(mkdtempSync(join(tmpdir(), "leaf-bridge-")), "chat.db");
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE handle (ROWID INTEGER PRIMARY KEY, id TEXT, service TEXT);
    CREATE TABLE chat (ROWID INTEGER PRIMARY KEY, style INTEGER, service_name TEXT);
    CREATE TABLE message (ROWID INTEGER PRIMARY KEY, text TEXT, attributedBody BLOB, handle_id INTEGER,
      is_from_me INTEGER, service TEXT, associated_message_type INTEGER DEFAULT 0, item_type INTEGER DEFAULT 0);
    CREATE TABLE chat_message_join (chat_id INTEGER, message_id INTEGER);
    INSERT INTO handle VALUES (1, '+15550001111', 'SMS'), (2, 'friend@example.com', 'iMessage');
    INSERT INTO chat VALUES (10, 45, 'SMS'), (20, 43, 'iMessage');
  `);
  const insert = db.prepare("INSERT INTO message (ROWID, text, attributedBody, handle_id, is_from_me, service, associated_message_type) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const join_ = db.prepare("INSERT INTO chat_message_join VALUES (?, ?)");
  insert.run(1, "old message", null, 1, 0, "SMS", 0); join_.run(10, 1);
  insert.run(2, null, typedstreamBlob("LEAF orange powder"), 1, 0, "SMS", 0); join_.run(10, 2);
  insert.run(3, "my own reply", null, 1, 1, "SMS", 0); join_.run(10, 3);
  insert.run(4, "Loved a message", null, 1, 0, "SMS", 2000); join_.run(10, 4);
  insert.run(5, "LEAF in a group", null, 2, 0, "iMessage", 0); join_.run(20, 5);
  db.close();

  const messages = new MessagesDb(path);
  assert.equal(messages.latestRowId(), 5);
  const fresh = messages.messagesAfter(1);
  messages.close();

  assert.deepEqual(fresh.map((m) => [m.rowId, m.text, m.isGroupChat, m.service]), [
    [2, "LEAF orange powder", false, "SMS"],
    [5, "LEAF in a group", true, "iMessage"],
  ]);
});

test("askLeafDoctor answers offline with no token and never calls the network", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => { called = true; throw new Error("unexpected"); }) as typeof fetch;
  try {
    const answer = await askLeafDoctor("+1", "orange powder under the leaves", undefined);
    assert.equal(answer.source, "offline");
    assert.match(answer.reply, /Coffee leaf rust/);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("askLeafDoctor falls back offline when the server rejects the token", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  globalThis.fetch = (async () => new Response("{}", { status: 401 })) as typeof fetch;
  console.warn = () => {};
  try {
    const answer = await askLeafDoctor("+1", "orange powder under the leaves", "wrong");
    assert.equal(answer.source, "offline");
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});
