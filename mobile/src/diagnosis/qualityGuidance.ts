import type { Strings } from '../i18n/strings';
import type { Diagnosis } from './classifyLeaf';

export function getQualityGuidance(strings: Strings, issue: Diagnosis['qualityIssue']) {
  if (issue === 'too_dark') return { title: strings.tooDarkTitle, body: strings.tooDarkBody };
  if (issue === 'too_bright') return { title: strings.tooBrightTitle, body: strings.tooBrightBody };
  if (issue === 'blurred') return { title: strings.blurredTitle, body: strings.blurredBody };
  return { title: strings.unclearTitle, body: strings.unclearBody };
}
