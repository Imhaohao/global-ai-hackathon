import { Plus } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { TextField } from '../components/TextField';
import { SectionHeading } from '../components/Typography';
import type { Strings } from '../i18n/strings';

type FarmSectionPickerProps = {
  strings: Strings;
  sections: string[];
  selected?: string;
  onChoose: (section: string | undefined) => void;
  onAdd: (name: string) => void;
};

type NewSectionFormProps = { strings: Strings; onAdd: (name: string) => void; autoFocus?: boolean };

export function NewSectionForm({ strings, onAdd, autoFocus = false }: NewSectionFormProps) {
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const addSection = () => {
    onAdd(trimmed);
    setName('');
  };
  return (
    <View className="gap-3">
      <TextField
        accessibilityLabel={strings.addFarmSection}
        placeholder={strings.farmSectionPlaceholder}
        value={name}
        onChangeText={setName}
        autoFocus={autoFocus}
      />
      <Button label={strings.addFarmSection} icon={Plus} variant="secondary" disabled={!trimmed} onPress={addSection} />
    </View>
  );
}

export function FarmSectionPicker({ strings, sections, selected, onChoose, onAdd }: FarmSectionPickerProps) {
  const [isAdding, setIsAdding] = useState(false);
  return (
    <View className="gap-3">
      <SectionHeading>{strings.farmSectionTitle}</SectionHeading>
      <View className="flex-row flex-wrap gap-2">
        {sections.map((section) => (
          <Chip
            key={section}
            label={section}
            selected={section === selected}
            onPress={() => onChoose(section === selected ? undefined : section)}
          />
        ))}
        <Chip label={strings.addFarmSection} icon={Plus} onPress={() => setIsAdding(!isAdding)} />
      </View>
      {isAdding && (
        <NewSectionForm
          strings={strings}
          autoFocus
          onAdd={(name) => {
            onAdd(name);
            setIsAdding(false);
          }}
        />
      )}
    </View>
  );
}
