import * as SMS from 'expo-sms';

export type SeedCodeSendResult = 'opened' | 'unavailable';

export async function openTextMessage(recipients: string[], body = ''): Promise<SeedCodeSendResult> {
  if (!(await SMS.isAvailableAsync())) return 'unavailable';
  await SMS.sendSMSAsync(recipients, body);
  return 'opened';
}

export function openSeedCodeMessage(phone: string): Promise<SeedCodeSendResult> {
  return openTextMessage([phone]);
}
