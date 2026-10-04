import * as SMS from 'expo-sms';

import type { ActionCard, Observation, WetDays } from '../../../shared/src/contract.ts';
import { formatCaseSummarySms } from '../../../shared/src/caseSummary.ts';
import { classifySmsResult } from './smsResult';

export type OfficerSendResult = 'sent' | 'opened' | 'cancelled' | 'unavailable' | 'error';

export async function sendCaseToOfficer(
  phone: string,
  observation: Observation,
  card: ActionCard,
  wetDays?: WetDays,
): Promise<OfficerSendResult> {
  try {
    if (!(await SMS.isAvailableAsync())) return 'unavailable';
    const { result } = await SMS.sendSMSAsync([phone], formatCaseSummarySms({ observation, card, wetDays }));
    return classifySmsResult(result);
  } catch {
    return 'error';
  }
}
