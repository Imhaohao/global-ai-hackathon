import * as SMS from 'expo-sms';

import type { ActionCard, Observation, WetDays } from '../../../shared/src/contract.ts';
import { formatCaseSummarySms } from '../../../shared/src/caseSummary.ts';

export type OfficerSendResult = 'opened' | 'cancelled' | 'unavailable';

export async function sendCaseToOfficer(
  phone: string,
  observation: Observation,
  card: ActionCard,
  wetDays?: WetDays,
): Promise<OfficerSendResult> {
  if (!(await SMS.isAvailableAsync())) return 'unavailable';
  const { result } = await SMS.sendSMSAsync([phone], formatCaseSummarySms({ observation, card, wetDays }));
  return result === 'cancelled' ? 'cancelled' : 'opened';
}
