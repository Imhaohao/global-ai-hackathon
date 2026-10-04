import { ArrowLeft, CheckCircle, CircleIcon, MapPin } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';

import { languageInfo, type LanguageCode } from '../../../shared/src/languages.ts';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { TextField } from '../components/TextField';
import { Body, Muted, SectionHeading, Title } from '../components/Typography';
import { CONTROL_FOCUS_STYLE, useControlFocus } from '../components/useControlFocus';
import { APP_LANGUAGES, fillTemplate, type Strings } from '../i18n/strings';
import { useLanguageSuggestions, type LocationLookup } from '../i18n/useLanguageSuggestions';
import { colors } from '../theme';

type LanguagePickerScreenProps = {
  strings: Strings;
  selected: LanguageCode;
  onChoose: (language: LanguageCode) => void;
  onBack?: () => void;
};

const BY_NATIVE_NAME: LanguageCode[] = [...APP_LANGUAGES].sort((left, right) =>
  languageInfo(left).nativeName.localeCompare(languageInfo(right).nativeName),
);
const OFFERED = new Set(APP_LANGUAGES);

function matchesQuery(code: LanguageCode, query: string): boolean {
  const { nativeName, englishName } = languageInfo(code);
  return [nativeName, englishName, code].some((name) => name.toLowerCase().includes(query));
}

function LanguageRow({ code, isSelected, onPress }: { code: LanguageCode; isSelected: boolean; onPress: () => void }) {
  const focus = useControlFocus();
  const { nativeName, englishName, locale } = languageInfo(code);
  const StateIcon = isSelected ? CheckCircle : CircleIcon;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={nativeName}
      accessibilityLanguage={locale}
      accessibilityHint={englishName === nativeName ? undefined : englishName}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
      className={`min-h-16 flex-row items-center gap-3 rounded-control px-4 py-3 shadow-sm ${isSelected ? 'bg-healthy-soft' : 'bg-surface active:bg-hairline'}`}
    >
      <View className="flex-1">
        <Body className="font-semibold">{nativeName}</Body>
        {englishName === nativeName ? null : <Muted>{englishName}</Muted>}
      </View>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <StateIcon size={28} weight={isSelected ? 'fill' : 'regular'} color={isSelected ? colors.accent : colors['field-border']} />
      </View>
    </Pressable>
  );
}

function LocationSuggestion({
  strings,
  lookup,
  onSuggest,
}: {
  strings: Strings;
  lookup: LocationLookup;
  onSuggest: () => void;
}) {
  if (lookup === 'found') return null;
  return (
    <View className="gap-2" accessibilityLiveRegion="polite">
      <Button
        label={lookup === 'finding' ? strings.languageFindingLocation : strings.languageUseLocation}
        icon={MapPin}
        variant="secondary"
        onPress={onSuggest}
        disabled={lookup === 'finding'}
      />
      {lookup === 'failed' ? <Muted>{strings.languageLocationFailed}</Muted> : null}
    </View>
  );
}

function useSections(strings: Strings, selected: LanguageCode, suggestions: LanguageCode[], query: string) {
  return useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed) return [{ title: strings.languageAll, data: BY_NATIVE_NAME.filter((code) => matchesQuery(code, trimmed)) }];
    const suggested = [...new Set([selected, ...suggestions])].filter((code) => OFFERED.has(code));
    return [
      { title: strings.languageSuggested, data: suggested },
      { title: strings.languageAll, data: BY_NATIVE_NAME },
    ];
  }, [strings, selected, suggestions, query]);
}

export function LanguagePickerScreen({ strings, selected, onChoose, onBack }: LanguagePickerScreenProps) {
  const [query, setQuery] = useState('');
  const { suggestions, lookup, suggestFromLocation } = useLanguageSuggestions();
  const sections = useSections(strings, selected, suggestions, query);
  const hasMatches = sections.some((section) => section.data.length > 0);

  const header = (
    <View className="gap-5 pb-2">
      {onBack ? <IconButton label={strings.back} icon={ArrowLeft} onPress={onBack} /> : null}
      <Title>{strings.languageTitle}</Title>
      <LocationSuggestion strings={strings} lookup={lookup} onSuggest={() => void suggestFromLocation()} />
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder={strings.languageSearch}
        accessibilityLabel={strings.languageSearch}
        autoCapitalize="none"
        autoComplete="off"
        returnKeyType="search"
      />
      {hasMatches ? null : <Body>{fillTemplate(strings.languageNoMatch, { query: query.trim() })}</Body>}
    </View>
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(code, index) => `${code}-${index}`}
      ListHeaderComponent={header}
      renderSectionHeader={({ section }) =>
        section.data.length > 0 ? <SectionHeading className="bg-paper pb-3 pt-5">{section.title}</SectionHeading> : null
      }
      renderItem={({ item }) => <LanguageRow code={item} isSelected={item === selected} onPress={() => onChoose(item)} />}
      ItemSeparatorComponent={() => <View className="h-3" />}
      contentContainerClassName="px-5 pt-2 pb-8"
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
    />
  );
}
