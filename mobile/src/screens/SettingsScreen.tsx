import { ArrowLeft, Database, DownloadSimple, MapPin, Plant, SignOut, Translate, Trash, UserCircle, Wrench, X } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Disclosure } from '../components/Disclosure';
import { IconButton } from '../components/IconButton';
import { TextField } from '../components/TextField';
import { Body, Muted, SectionHeading, Title } from '../components/Typography';
import { useKeyboardHeight } from '../components/useKeyboardHeight';
import { fillTemplate, type Strings } from '../i18n/strings';
import { locationAllowed, type AppSettings } from '../storage/appSettings';
import { colors } from '../theme';
import { DEV_SCENARIOS, type DevScenario } from './devVerdictOverride';
import { NewSectionForm } from './FarmSectionPicker';
import { isPlausiblePhone, normalizePhone } from './officerPhone';

type SettingsScreenProps = {
  strings: Strings;
  settings: AppSettings;
  savedCheckCount: number;
  accountPhone: string;
  devScenario: DevScenario;
  onChangeDevScenario: (scenario: DevScenario) => void;
  onUpdateSettings: (changes: Partial<AppSettings>) => void;
  onToggleLocation: (enabled: boolean) => void;
  onExport: () => Promise<boolean>;
  onDeleteAll: () => boolean;
  onBack: () => void;
  onSignOut: () => Promise<void>;
  onChangeLanguage: () => void;
};

function LocationSwitch({
  strings,
  enabled,
  onToggle,
}: {
  strings: Strings;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <View className="min-h-14 flex-row items-center gap-3 rounded-control bg-surface px-4 py-2 shadow-sm">
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <MapPin size={26} weight="duotone" color={colors.accent} />
      </View>
      <Text className="flex-1 text-lg text-ink">{strings.saveLocation}</Text>
      <Switch
        hitSlop={8}
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ true: colors.accent, false: colors.hairline }}
        thumbColor={colors.surface}
        accessibilityLabel={strings.saveLocation}
      />
    </View>
  );
}

function OfficerNumberField({
  strings,
  savedPhone,
  onSave,
}: {
  strings: Strings;
  savedPhone?: string;
  onSave: (phone?: string) => void;
}) {
  const [typed, setTyped] = useState(savedPhone ?? '');
  const [invalid, setInvalid] = useState(false);
  const commit = () => {
    if (typed.trim() === '') return onSave(undefined);
    if (!isPlausiblePhone(typed)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onSave(normalizePhone(typed));
  };
  return (
    <View className="gap-2">
      <SectionHeading>{strings.officerNumberLabel}</SectionHeading>
      <TextField
        accessibilityLabel={strings.officerNumberLabel}
        placeholder={strings.officerPhonePlaceholder}
        keyboardType="phone-pad"
        autoComplete="tel"
        value={typed}
        onChangeText={(value) => {
          setTyped(value);
          setInvalid(false);
        }}
        error={invalid ? strings.officerInvalidPhone : undefined}
        onBlur={commit}
      />
    </View>
  );
}

function FarmSectionsEditor({
  strings,
  sections,
  onChange,
}: {
  strings: Strings;
  sections: string[];
  onChange: (sections: string[]) => void;
}) {
  return (
    <View className="gap-3">
      <SectionHeading>{strings.farmSectionsLabel}</SectionHeading>
      {sections.map((section) => (
        <View key={section} className="min-h-14 flex-row items-center gap-3 rounded-control bg-surface pl-4 shadow-sm">
          <Body className="flex-1">{section}</Body>
          <IconButton
            label={fillTemplate(strings.removeFarmSection, { name: section })}
            icon={X}
            onPress={() => onChange(sections.filter((existing) => existing !== section))}
          />
        </View>
      ))}
      <NewSectionForm strings={strings} onAdd={(name) => onChange([...sections, name])} />
    </View>
  );
}

function DevScenarioPicker({
  selected,
  onSelect,
}: {
  selected: DevScenario;
  onSelect: (scenario: DevScenario) => void;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {DEV_SCENARIOS.map((scenario) => (
          <Chip key={scenario} label={scenario} selected={scenario === selected} onPress={() => onSelect(scenario)} />
        ))}
      </View>
    </View>
  );
}

function confirmDeleteAll(strings: Strings, onConfirm: () => void) {
  Alert.alert(strings.deleteConfirmTitle, strings.deleteConfirmBody, [
    { text: strings.cancel, style: 'cancel' },
    { text: strings.deleteConfirm, style: 'destructive', onPress: onConfirm },
  ]);
}

function DataControls({
  strings,
  savedCheckCount,
  onExport,
  onDeleteAll,
}: Pick<SettingsScreenProps, 'strings' | 'savedCheckCount' | 'onExport' | 'onDeleteAll'>) {
  const [exportFailed, setExportFailed] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportPending = useRef(false);
  const exportData = async () => {
    if (exportPending.current) return;
    exportPending.current = true;
    setIsExporting(true);
    setExportFailed(false);
    try {
      setExportFailed(!(await onExport()));
    } catch {
      setExportFailed(true);
    } finally {
      exportPending.current = false;
      setIsExporting(false);
    }
  };
  return (
    <View className="gap-3">
      <Muted>{fillTemplate(strings.savedChecks, { count: savedCheckCount })}</Muted>
      <View accessibilityLiveRegion="polite">
        {exportFailed && <Body className="text-sick">{strings.exportFailed}</Body>}
        {deleteFailed && <Body className="text-sick">{strings.deleteFailed}</Body>}
      </View>
      <Button
        label={isExporting ? strings.exportingData : strings.exportData}
        icon={DownloadSimple}
        variant="secondary"
        onPress={exportData}
        disabled={isExporting}
      />
      <Button
        label={strings.deleteAll}
        icon={Trash}
        variant="secondary"
        onPress={() =>
          confirmDeleteAll(strings, () => {
            setDeleteFailed(!onDeleteAll());
          })
        }
      />
    </View>
  );
}

export function SettingsScreen(props: SettingsScreenProps) {
  const { strings, settings, onUpdateSettings } = props;
  const keyboardHeight = useKeyboardHeight();
  return (
    <ScrollView
      contentContainerClassName="gap-6 px-5 pt-2"
      contentContainerStyle={{ paddingBottom: 32 + keyboardHeight }}
      keyboardShouldPersistTaps="handled"
    >
      <IconButton label={strings.back} icon={ArrowLeft} onPress={props.onBack} />
      <Title>{strings.settingsTitle}</Title>
      <Disclosure title={strings.accountSettings} icon={UserCircle}>
        <View className="gap-2">
          <SectionHeading>{strings.authSignedInAs}</SectionHeading>
          <Body>{props.accountPhone}</Body>
          <SignOutControl strings={strings} onSignOut={props.onSignOut} />
        </View>
      </Disclosure>
      <Button label={strings.changeLanguage} icon={Translate} variant="secondary" onPress={props.onChangeLanguage} />
      <Disclosure title={strings.farmSettings} icon={Plant}>
        <LocationSwitch strings={strings} enabled={locationAllowed(settings)} onToggle={props.onToggleLocation} />
        <OfficerNumberField
          strings={strings}
          savedPhone={settings.officerPhone}
          onSave={(phone) => onUpdateSettings({ officerPhone: phone })}
        />
        <FarmSectionsEditor
          strings={strings}
          sections={settings.farmSections}
          onChange={(farmSections) => onUpdateSettings({ farmSections })}
        />
      </Disclosure>
      <Disclosure title={strings.dataSettings} icon={Database}>
        <DataControls
          strings={strings}
          savedCheckCount={props.savedCheckCount}
          onExport={props.onExport}
          onDeleteAll={props.onDeleteAll}
        />
      </Disclosure>
      {__DEV__ && (
        <Disclosure title={strings.devVerdictTitle} icon={Wrench}>
          <DevScenarioPicker selected={props.devScenario} onSelect={props.onChangeDevScenario} />
        </Disclosure>
      )}
    </ScrollView>
  );
}

function SignOutControl({ strings, onSignOut }: { strings: Strings; onSignOut: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const signOut = async () => {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      await onSignOut();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <View className="gap-2">
      <View accessibilityLiveRegion="polite">
        {failed ? <Body className="text-sick">{strings.authSignOutFailed}</Body> : null}
      </View>
      <Button
        label={pending ? strings.authSigningOut : strings.authSignOut}
        icon={SignOut}
        variant="secondary"
        onPress={() => void signOut()}
        disabled={pending}
      />
    </View>
  );
}
