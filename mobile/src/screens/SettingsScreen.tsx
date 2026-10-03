import { ArrowLeft, DownloadSimple, MapPin, Trash, X } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { PillButton } from '../components/PillButton';
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
  devScenario: DevScenario;
  onChangeDevScenario: (scenario: DevScenario) => void;
  onUpdateSettings: (changes: Partial<AppSettings>) => void;
  onToggleLocation: (enabled: boolean) => void;
  onExport: () => Promise<boolean>;
  onDeleteAll: () => void;
  onBack: () => void;
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
      <MapPin size={26} weight="duotone" color={colors.accent} />
      <Text className="flex-1 text-lg text-ink">{strings.saveLocation}</Text>
      <Switch
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
  const commit = () => {
    if (typed.trim() === '') return onSave(undefined);
    if (isPlausiblePhone(typed)) onSave(normalizePhone(typed));
  };
  return (
    <View className="gap-2">
      <SectionHeading>{strings.officerNumberLabel}</SectionHeading>
      <TextField
        accessibilityLabel={strings.officerNumberLabel}
        placeholder={strings.officerPhonePlaceholder}
        keyboardType="phone-pad"
        value={typed}
        onChangeText={setTyped}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fillTemplate(strings.removeFarmSection, { name: section })}
            onPress={() => onChange(sections.filter((existing) => existing !== section))}
            className="h-14 w-14 items-center justify-center"
          >
            <X size={22} weight="bold" color={colors['ink-muted']} />
          </Pressable>
        </View>
      ))}
      <NewSectionForm strings={strings} onAdd={(name) => onChange([...sections, name])} />
    </View>
  );
}

function DevScenarioPicker({
  strings,
  selected,
  onSelect,
}: {
  strings: Strings;
  selected: DevScenario;
  onSelect: (scenario: DevScenario) => void;
}) {
  return (
    <View className="gap-3">
      <SectionHeading>{strings.devVerdictTitle}</SectionHeading>
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
  const exportData = async () => setExportFailed(!(await onExport()));
  return (
    <View className="gap-3">
      <Muted>{fillTemplate(strings.savedChecks, { count: savedCheckCount })}</Muted>
      {exportFailed && <Body className="text-sick">{strings.exportFailed}</Body>}
      <Button label={strings.exportData} icon={DownloadSimple} variant="secondary" onPress={exportData} />
      <Button
        label={strings.deleteAll}
        icon={Trash}
        variant="secondary"
        onPress={() => confirmDeleteAll(strings, onDeleteAll)}
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
      <View className="items-start">
        <PillButton label={strings.back} icon={ArrowLeft} onPress={props.onBack} />
      </View>
      <Title>{strings.settingsTitle}</Title>
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
      <DataControls
        strings={strings}
        savedCheckCount={props.savedCheckCount}
        onExport={props.onExport}
        onDeleteAll={props.onDeleteAll}
      />
      {__DEV__ && (
        <DevScenarioPicker strings={strings} selected={props.devScenario} onSelect={props.onChangeDevScenario} />
      )}
    </ScrollView>
  );
}
