export function maskSender(sender: string): string {
  const digits = sender.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : sender;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
