import { ArrowLeft, Barcode, ChatText, Flag, Info, SpeakerHigh, SpeakerSlash } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { SeedCheckCopy } from '../../../shared/src/seedCheck.ts';
import { Disclosure } from '../components/Disclosure';
import { StepPager } from '../components/StepPager';
import { Button } from '../components/Button';
import { PillButton } from '../components/PillButton';
import { SeedBarcodeScanner } from '../components/SeedBarcodeScanner';
import { SeedPacketSticker } from '../components/SeedPacketSticker';
import { SeedScanResultCard } from '../components/SeedScanResultCard';
import { Body, Muted, Title } from '../components/Typography';
import { useReadAloud } from '../components/useReadAloud';
import { fillTemplate, type Strings } from '../i18n/strings';
import { lookUpSeedBarcode, type SeedScanResult } from './seedBarcode';
import { seedReportText } from './seedReport';
import { openSeedCodeMessage, openTextMessage, type SeedCodeSendResult } from './textSeedCode';

type SeedCheckScreenProps = {
  strings: Strings;
  copy: SeedCheckCopy;
  phone: string;
  officerPhone?: string;
  onBack: () => void;
};

function ReadStepsAloud({ strings, steps }: { strings: Strings; steps: string[] }) {
  const readAloud = useReadAloud(steps.join(' '), strings.speechLanguage);
  if (!readAloud.isAvailable) return null;
  return (
    <View className="items-start">
      <PillButton
        label={readAloud.isSpeaking ? strings.stopReading : strings.readAloud}
        icon={readAloud.isSpeaking ? SpeakerSlash : SpeakerHigh}
        onPress={readAloud.toggle}
      />
    </View>
  );
}

function TypeTheNumberYourself({ strings, phone }: { strings: Strings; phone: string }) {
  return (
    <View accessibilityLiveRegion="polite" className="items-center gap-2 rounded-card bg-watch-soft p-5">
      <Body className="text-center text-watch">{strings.seedCheckSmsUnavailable}</Body>
      <Text selectable className="text-2xl font-bold text-ink">
        {phone}
      </Text>
    </View>
  );
}

type ScanState = { kind: 'idle' } | { kind: 'scanning' } | { kind: 'scanned'; result: SeedScanResult };

type ScanSectionProps = { strings: Strings; phone: string; officerPhone?: string };

function ReportNotice({ strings, sendResult }: { strings: Strings; sendResult: SeedCodeSendResult }) {
  const isOpened = sendResult === 'opened';
  return (
    <View accessibilityLiveRegion="polite" className={`rounded-control p-4 ${isOpened ? 'bg-healthy-soft' : 'bg-watch-soft'}`}>
      <Body className={isOpened ? 'text-healthy' : 'text-watch'}>
        {isOpened ? strings.seedReportOpened : strings.smsUnavailable}
      </Body>
    </View>
  );
}

function ScannedActions({
  result,
  strings,
  officerPhone,
  onScanAgain,
}: Omit<ScanSectionProps, 'phone'> & { result: SeedScanResult; onScanAgain: () => void }) {
  const [reportResult, setReportResult] = useState<SeedCodeSendResult | null>(null);
  const canReport = result.kind !== 'genuine';
  const report = async () =>
    setReportResult(await openTextMessage(officerPhone ? [officerPhone] : [], seedReportText(result, strings)));
  return (
    <View className="gap-3">
      {reportResult && <ReportNotice strings={strings} sendResult={reportResult} />}
      {canReport && <Button label={strings.seedReport} icon={Flag} onPress={report} />}
      <Button
        label={strings.seedScanAnother}
        icon={Barcode}
        variant={canReport ? 'secondary' : 'primary'}
        onPress={onScanAgain}
      />
    </View>
  );
}

function ScanSection({ strings, phone, officerPhone }: ScanSectionProps) {
  const [scan, setScan] = useState<ScanState>({ kind: 'idle' });
  const startScanning = () => setScan({ kind: 'scanning' });
  if (scan.kind === 'scanning') {
    return (
      <SeedBarcodeScanner
        strings={strings}
        onScanned={(data) => setScan({ kind: 'scanned', result: lookUpSeedBarcode(data) })}
        onCancel={() => setScan({ kind: 'idle' })}
      />
    );
  }
  if (scan.kind === 'scanned') {
    return (
      <View className="gap-4">
        <SeedScanResultCard result={scan.result} strings={strings} phone={phone} />
        <ScannedActions result={scan.result} strings={strings} officerPhone={officerPhone} onScanAgain={startScanning} />
      </View>
    );
  }
  return <Button label={strings.seedScanButton} icon={Barcode} onPress={startScanning} />;
}

function TextCodeSection({ strings, copy, phone }: Omit<SeedCheckScreenProps, 'onBack' | 'officerPhone'>) {
  const [isSmsUnavailable, setIsSmsUnavailable] = useState(false);
  const textTheCode = async () => setIsSmsUnavailable((await openSeedCodeMessage(phone)) === 'unavailable');
  return (
    <>
      <SeedPacketSticker />
      <StepPager steps={copy.steps} strings={strings} />
      <ReadStepsAloud strings={strings} steps={copy.steps} />
      <Button
        label={fillTemplate(strings.seedCheckTextButton, { phone })}
        icon={ChatText}
        variant="secondary"
        onPress={textTheCode}
      />
      {isSmsUnavailable && <TypeTheNumberYourself strings={strings} phone={phone} />}
      <Disclosure title={strings.seedDetails} icon={Info}>
        <Muted>{copy.result}</Muted>
        <Muted>{copy.coverage}</Muted>
      </Disclosure>
    </>
  );
}

export function SeedCheckScreen({ strings, copy, phone, officerPhone, onBack }: SeedCheckScreenProps) {
  return (
    <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-2">
      <View className="items-start">
        <PillButton label={strings.back} icon={ArrowLeft} onPress={onBack} />
      </View>
      <Title>{strings.seedCheckTitle}</Title>
      <ScanSection strings={strings} phone={phone} officerPhone={officerPhone} />
      <TextCodeSection strings={strings} copy={copy} phone={phone} />
    </ScrollView>
  );
}
