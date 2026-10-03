import type Anthropic from "@anthropic-ai/sdk";

type Turn = Anthropic.Beta.Messages.BetaMessageParam;

interface Conversation {
  turns: Turn[];
  lastActiveAt: number;
}

const MAX_TURNS = 8;
const IDLE_RESET_MS = 24 * 60 * 60 * 1000;

export class ConversationStore {
  private readonly conversations = new Map<string, Conversation>();

  constructor(private readonly now: () => number = Date.now) {}

  history(phone: string): Turn[] {
    const conversation = this.conversations.get(phone);
    if (!conversation || this.now() - conversation.lastActiveAt > IDLE_RESET_MS) return [];
    return conversation.turns;
  }

  append(phone: string, question: string, answer: string): void {
    const turns: Turn[] = [
      ...this.history(phone),
      { role: "user", content: question },
      { role: "assistant", content: answer },
    ];
    this.conversations.set(phone, { turns: turns.slice(-MAX_TURNS), lastActiveAt: this.now() });
  }
}
