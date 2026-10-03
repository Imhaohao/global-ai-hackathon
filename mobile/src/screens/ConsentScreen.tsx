import { Camera, Check, CloudRain, MapPin, PaperPlaneTilt, Prohibit, Trash, Translate } from 'phosphor-react-native';
import { ScrollView, View } from 'react-native';

import { Button } from '../components/Button';
import { IconRow } from '../components/IconRow';
import { PillButton } from '../components/PillButton';
import { Title } from '../components/Typography';
import type { Strings } from '../i18n/strings';
import type { ConsentChoice } from '../storage/appSettings';

type ConsentScreenProps = {
  strings: Strings;
  onChoose: (choice: Exclude<ConsentChoice, 'pending'>) => void;
  onSwitchLanguage: () => void;
};

export function ConsentScreen({ strings, onChoose, onSwitchLanguage }: ConsentScreenProps) {
  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-6 px-5 pb-6 pt-2">
        <View className="items-end">
          <PillButton label={strings.switchLanguage} icon={Translate} onPress={onSwitchLanguage} />
        </View>
        <Title>{strings.consentTitle}</Title>
        <View className="gap-5">
          <IconRow icon={Camera} text={strings.consentPhotos} />
          <IconRow icon={MapPin} text={strings.consentLocation} />
          <IconRow icon={PaperPlaneTilt} text={strings.consentNothingLeaves} />
          <IconRow icon={CloudRain} text={strings.consentRain} />
          <IconRow icon={Trash} text={strings.consentDelete} />
        </View>
      </ScrollView>
      <View className="gap-3 bg-paper px-5 pb-6 pt-3">
        <Button label={strings.consentAgree} icon={Check} onPress={() => onChoose('withLocation')} />
        <Button
          label={strings.consentWithoutLocation}
          icon={Prohibit}
          variant="secondary"
          onPress={() => onChoose('withoutLocation')}
        />
      </View>
    </View>
  );
}
