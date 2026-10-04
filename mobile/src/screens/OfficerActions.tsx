import { ArrowCounterClockwise, PaperPlaneTilt, Phone } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Linking, View } from 'react-native';

import type { ActionCard } from '../../../shared/src/contract.ts';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { Body, Muted, SectionHeading } from '../components/Typography';
import { fillTemplate, type Strings } from '../i18n/strings';
import { isPlausiblePhone, normalizePhone } from './officerPhone';
import type { OfficerSendResult } from './sendCaseToOfficer';

type OfficerActionsProps = {
  strings: Strings;
  card: ActionCard;
  savedOfficerPhone?: string;
  onSaveOfficerPhone: (phone: string) => void;
  onSendCase: (phone: string) => Promise<OfficerSendResult>;
  onCheckAnother: () => void;
};

function OfficerPhonePrompt({
  strings,
  onSubmit,
  onCancel,
  disabled,
}: {
  strings: Strings;
  onSubmit: (phone: string) => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [typed, setTyped] = useState('');
  return (
    <View className="gap-3 rounded-control bg-surface p-4 shadow-sm">
      <SectionHeading>{strings.officerPhoneTitle}</SectionHeading>
      <Muted>{strings.officerPhoneHelp}</Muted>
      <TextField
        accessibilityLabel={strings.officerPhoneTitle}
        placeholder={strings.officerPhonePlaceholder}
        keyboardType="phone-pad"
        value={typed}
        onChangeText={setTyped}
        autoFocus
      />
      <Button
        label={strings.saveAndSend}
        icon={PaperPlaneTilt}
        disabled={disabled || !isPlausiblePhone(typed)}
        onPress={() => onSubmit(normalizePhone(typed))}
      />
      <Button
        label={strings.cancel}
        icon={ArrowCounterClockwise}
        variant="quiet"
        onPress={onCancel}
        disabled={disabled}
      />
    </View>
  );
}

function sendNotice(strings: Strings, result: OfficerSendResult | null): string | null {
  if (result === 'sent') return strings.smsSent;
  if (result === 'opened') return strings.sentToOfficer;
  if (result === 'unavailable') return strings.smsUnavailable;
  return result === 'error' ? strings.smsFailed : null;
}

function verifiedContactPhone(card: ActionCard): string | undefined {
  return card.contact.verified && card.contact.phone ? card.contact.phone : undefined;
}

export function OfficerActions(props: OfficerActionsProps) {
  const { strings, card, savedOfficerPhone, onSaveOfficerPhone, onSendCase, onCheckAnother } = props;
  const [isAskingForPhone, setIsAskingForPhone] = useState(false);
  const [result, setResult] = useState<OfficerSendResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);
  const callablePhone = verifiedContactPhone(card);
  const knownPhone = savedOfficerPhone ?? callablePhone;

  const send = async (phone: string) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setIsSending(true);
    setIsAskingForPhone(false);
    try {
      setResult(await onSendCase(phone));
    } catch {
      setResult('error');
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };
  const saveAndSend = (phone: string) => {
    onSaveOfficerPhone(phone);
    return send(phone);
  };
  const pressSend = () => (knownPhone ? send(knownPhone) : setIsAskingForPhone(true));

  if (isAskingForPhone) {
    return (
      <OfficerPhonePrompt
        strings={strings}
        onSubmit={saveAndSend}
        onCancel={() => setIsAskingForPhone(false)}
        disabled={isSending}
      />
    );
  }
  const notice = sendNotice(strings, result);
  return (
    <View className="gap-3">
      {notice && (
        <View accessibilityLiveRegion="polite" className="rounded-control bg-healthy-soft p-4">
          <Body className="text-healthy">{notice}</Body>
        </View>
      )}
      {card.needsPerson && (
        <Button label={strings.sendToOfficer} icon={PaperPlaneTilt} onPress={pressSend} disabled={isSending} />
      )}
      {callablePhone && (
        <Button
          label={fillTemplate(strings.callOfficer, { name: card.contact.name })}
          icon={Phone}
          variant="secondary"
          onPress={() => Linking.openURL(`tel:${callablePhone}`)}
        />
      )}
      <Button
        label={strings.checkAnotherTree}
        icon={ArrowCounterClockwise}
        variant={card.needsPerson ? 'quiet' : 'primary'}
        onPress={onCheckAnother}
      />
    </View>
  );
}
