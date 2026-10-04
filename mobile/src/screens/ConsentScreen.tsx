import { Check, Prohibit, ShieldCheck, Translate } from 'phosphor-react-native';
import { ScrollView, View } from 'react-native';

import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { StepPager } from '../components/StepPager';
import { colors } from '../theme';
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
    <ScrollView contentContainerClassName="flex-grow gap-6 px-5 pb-6 pt-2">
      <View className="items-end">
        <IconButton label={strings.switchLanguage} icon={Translate} onPress={onSwitchLanguage} />
      </View>
      <ShieldCheck size={72} weight="duotone" color={colors.accent} />
      <Title>{strings.consentTitle}</Title>
      <StepPager
        strings={strings}
        steps={[
          strings.consentPhotos,
          strings.consentLocation,
          strings.consentNothingLeaves,
          strings.consentRain,
          strings.consentDelete,
        ]}
        lastStepActions={
          <View className="gap-3">
            <Button label={strings.consentAgree} icon={Check} onPress={() => onChoose('withLocation')} />
            <Button
              label={strings.consentWithoutLocation}
              icon={Prohibit}
              variant="secondary"
              onPress={() => onChoose('withoutLocation')}
            />
          </View>
        }
      />
    </ScrollView>
  );
}
