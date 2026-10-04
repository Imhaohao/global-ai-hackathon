import * as SMS from 'expo-sms';

export type SeedCodeSendResult = 'opened' | 'unavailable';

export async function openSeedCodeMessage(phone: string): Promise<SeedCodeSendResult> {
  if (!(await SMS.isAvailableAsync())) return 'unavailable';
  await SMS.sendSMSAsync([phone], '');
  return 'opened';
}
