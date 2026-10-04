import { fillTemplate, type Strings } from '../i18n/strings';
import type { SeedScanResult } from './seedBarcode';

const RESULT_TITLE_KEY = {
  genuine: 'seedGenuineTitle',
  recalled: 'seedRecalledTitle',
  unknown: 'seedUnknownTitle',
} as const;

export function seedReportText(result: SeedScanResult, strings: Strings): string {
  const packet =
    result.kind === 'unknown'
      ? ''
      : fillTemplate(strings.seedReportPacket, { variety: result.packet.variety, lot: result.packet.lot });
  return fillTemplate(strings.seedReportMessage, {
    code: result.code,
    packet,
    result: strings[RESULT_TITLE_KEY[result.kind]],
  });
}
