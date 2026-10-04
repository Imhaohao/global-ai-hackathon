import type { Strings } from '../i18n/strings';
import type { LeafReading } from '../../../shared/src/contract.ts';

export function getQualityGuidance(strings: Strings, issue: LeafReading['qualityIssue']) {
  if (issue === 'blurred') return { title: strings.blurredTitle, body: strings.blurredBody };
  return { title: strings.unclearTitle, body: strings.unclearBody };
}
