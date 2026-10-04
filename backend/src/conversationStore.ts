export interface Turn {
  role: "user" | "assistant";
  content: string;
}

export interface ConversationHistory {
  history(phone: string): Promise<Turn[]>;
  append(phone: string, question: string, answer: string): Promise<void>;
}

const MAX_TURNS = 8;
export const IDLE_RESET_MS = 24 * 60 * 60 * 1000;

export function isIdle(lastActiveAt: number, now: number): boolean {
  return now - lastActiveAt > IDLE_RESET_MS;
}

export function freshTurns(turns: Turn[], lastActiveAt: number, now: number): Turn[] {
  return isIdle(lastActiveAt, now) ? [] : turns;
}

export function appendExchange(turns: Turn[], question: string, answer: string): Turn[] {
  return [...turns, { role: "user" as const, content: question }, { role: "assistant" as const, content: answer }].slice(
    -MAX_TURNS,
  );
}

export class InMemoryConversationHistory implements ConversationHistory {
  private readonly conversations = new Map<string, { turns: Turn[]; lastActiveAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async history(phone: string): Promise<Turn[]> {
    const conversation = this.conversations.get(phone);
    if (!conversation) return [];
    if (isIdle(conversation.lastActiveAt, this.now())) {
      this.conversations.delete(phone);
      return [];
    }
    return conversation.turns;
  }

  async append(phone: string, question: string, answer: string): Promise<void> {
    const turns = appendExchange(await this.history(phone), question, answer);
    this.conversations.set(phone, { turns, lastActiveAt: this.now() });
  }
}
