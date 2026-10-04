export type SmsComposerResult = 'sent' | 'cancelled' | 'unknown';
export type OfficerSmsResult = 'sent' | 'opened' | 'cancelled';

export function classifySmsResult(result: unknown): OfficerSmsResult {
  if (result === 'sent') return 'sent';
  if (result === 'cancelled') return 'cancelled';
  return 'opened';
}
