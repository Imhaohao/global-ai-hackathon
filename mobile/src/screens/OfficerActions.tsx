import { ArrowCounterClockwise, ChatText, PaperPlaneTilt, Phone } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Linking, View } from 'react-native';

import { KALRO_HEADQUARTERS_ID, verifiedContact } from '../../../shared/src/contacts.ts';
import type { ActionCard } from '../../../shared/src/contract.ts';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { Body, Muted, SectionHeading } from '../components/Typography';
import type { Strings } from '../i18n/strings';
import { isPlausiblePhone, normalizePhone } from './officerPhone';
import type { OfficerSendResult } from './sendCaseToOfficer';

type OfficerActionsProps = {
  strings: Strings;
  card: ActionCard;
  savedOfficerPhone?: string;
  onSaveOfficerPhone: (phone: string) => void;
  onSendCase: (phone: string) => Promise<OfficerSendResult>;
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

function isDelivered(result: OfficerSendResult | null): boolean {
  return result === 'sent' || result === 'opened';
}

export function cardNeedsHelp(card: ActionCard): boolean {
  return card.needsPerson || (card.condition !== null && card.condition !== 'healthy');
}

function callPhone(phone: string) {
  return Linking.openURL(`tel:${phone}`);
}

function CallButtons({ strings, officerPhone }: { strings: Strings; officerPhone?: string }) {
  const kalro = verifiedContact(KALRO_HEADQUARTERS_ID);
  return (
    <>
      {officerPhone && (
        <Button label={strings.callYourOfficer} icon={Phone} variant="secondary" onPress={() => callPhone(officerPhone)} />
      )}
      {kalro && <Button label={strings.callKalro} icon={Phone} variant="secondary" onPress={() => callPhone(kalro.phone)} />}
    </>
  );
}

export function OfficerActions(props: OfficerActionsProps) {
  const { strings, card, savedOfficerPhone, onSaveOfficerPhone, onSendCase } = props;
  const [isAskingForPhone, setIsAskingForPhone] = useState(false);
  const [result, setResult] = useState<OfficerSendResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);

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
  const pressSend = () => (savedOfficerPhone ? send(savedOfficerPhone) : setIsAskingForPhone(true));

  if (!cardNeedsHelp(card)) return null;
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
      <SectionHeading>{strings.helpNowTitle}</SectionHeading>
      {notice && (
        <View accessibilityLiveRegion="polite" className={`rounded-control p-4 ${isDelivered(result) ? 'bg-healthy-soft' : 'bg-watch-soft'}`}>
          <Body className={isDelivered(result) ? 'text-healthy' : 'text-watch'}>{notice}</Body>
        </View>
      )}
      <Button label={strings.sendToOfficer} icon={ChatText} onPress={pressSend} disabled={isSending} />
      <CallButtons strings={strings} officerPhone={savedOfficerPhone} />
    </View>
  );
}

export function CheckAnotherButton({ strings, card, onPress }: { strings: Strings; card: ActionCard; onPress: () => void }) {
  return (
    <Button
      label={strings.checkAnotherTree}
      icon={ArrowCounterClockwise}
      variant={cardNeedsHelp(card) ? 'quiet' : 'primary'}
      onPress={onPress}
    />
  );
}
