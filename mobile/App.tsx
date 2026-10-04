import './global.css';

import { getLocales } from 'expo-localization';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { seedCheckContact, seedCheckCopy } from '../shared/src/seedCheck.ts';
import { createAuthApi } from './src/auth/authApi';
import type { AuthSession } from './src/auth/session';
import { useAuthSession } from './src/auth/useAuthSession';
import { STRINGS, type Language } from './src/i18n/strings';
import { ActionCardScreen } from './src/screens/ActionCardScreen';
import { CaptureScreen, type CaptureProblem } from './src/screens/CaptureScreen';
import { ConsentScreen } from './src/screens/ConsentScreen';
import type { DevScenario } from './src/screens/devVerdictOverride';
import { SeedCheckScreen } from './src/screens/SeedCheckScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { useCaptureFlow } from './src/screens/useCaptureFlow';
import { useResultFlow } from './src/screens/useResultFlow';
import { locationAllowed, type ConsentChoice } from './src/storage/appSettings';
import { deleteAllData, exportAllData } from './src/storage/dataControls';
import { askForLocationPermission } from './src/storage/deviceLocation';
import { listObservations } from './src/storage/observations';
import { useAppSettings } from './src/storage/useAppSettings';
import { useWetDays } from './src/storage/useWetDays';
import { colors } from './src/theme';

const COFFEE_LEAF_MODEL = require('./assets/model/coffee-leaf.tflite');
const AUTH_API = createAuthApi();

function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'sw' ? 'sw' : 'en';
}

export default function App() {
  const auth = useAuthSession(AUTH_API);
  const [loginLanguage, setLoginLanguage] = useState<Language>(deviceLanguage());

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-paper">
        <StatusBar style="dark" />
        {auth.state.status === 'restoring' ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : auth.state.status === 'signedOut' ? (
          <LoginScreen
            api={AUTH_API}
            language={loginLanguage}
            onSwitchLanguage={() => setLoginLanguage((current) => (current === 'en' ? 'sw' : 'en'))}
            onAuthenticated={auth.acceptSession}
          />
        ) : (
          <AuthenticatedApp
            key={auth.state.session.accountId}
            session={auth.state.session}
            preferredLanguage={loginLanguage}
            onSignOut={auth.signOut}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function AuthenticatedApp({
  session,
  preferredLanguage,
  onSignOut,
}: {
  session: AuthSession;
  preferredLanguage: Language;
  onSignOut: () => Promise<void>;
}) {
  const { settings, update: updateSettings, resetToDefaults } = useAppSettings();
  const [language, setLanguage] = useState<Language>(settings.language ?? preferredLanguage);
  const [isInSettings, setIsInSettings] = useState(false);
  const [isInSeedCheck, setIsInSeedCheck] = useState(false);
  const [devScenario, setDevScenario] = useState<DevScenario>('off');
  const leafModel = useTensorflowModel(COFFEE_LEAF_MODEL, []);
  const { wetDays, forgetWetDays } = useWetDays(locationAllowed(settings));
  const capture = useCaptureFlow(leafModel.state === 'loaded' ? leafModel.model : undefined, devScenario);
  const resultFlow = useResultFlow({ settings, updateSettings, language, wetDays });
  const strings = STRINGS[language];
  const seedContact = seedCheckContact();
  const seedCopy = seedCheckCopy(language, seedContact);

  const switchLanguage = () => {
    const next = language === 'en' ? 'sw' : 'en';
    setLanguage(next);
    updateSettings({ language: next });
  };

  const chooseConsent = async (choice: Exclude<ConsentChoice, 'pending'>) => {
    updateSettings({ consent: choice });
    if (choice === 'withLocation') await askForLocationPermission();
  };

  const toggleLocation = async (enabled: boolean) => {
    updateSettings({ consent: enabled ? 'withLocation' : 'withoutLocation' });
    if (enabled) await askForLocationPermission();
  };

  const deleteAll = () => {
    deleteAllData();
    resetToDefaults();
    forgetWetDays();
    capture.startOver();
    resultFlow.clearResult();
    setIsInSettings(false);
  };

  const finishAndShowAdvice = () => {
    if (capture.check) resultFlow.finishCheck(capture.check, capture.photos);
  };

  const checkAnotherTree = () => {
    resultFlow.clearResult();
    capture.startOver();
  };

  const modelProblem: CaptureProblem | undefined = leafModel.state === 'error' ? 'modelFailed' : undefined;

  const renderScreen = () => {
    if (settings.consent === 'pending') {
      return <ConsentScreen strings={strings} onChoose={chooseConsent} onSwitchLanguage={switchLanguage} />;
    }
    if (isInSettings) {
      return (
        <SettingsScreen
          strings={strings}
          settings={settings}
          savedCheckCount={listObservations().length}
          accountPhone={session.phone}
          devScenario={devScenario}
          onChangeDevScenario={setDevScenario}
          onUpdateSettings={updateSettings}
          onToggleLocation={toggleLocation}
          onExport={() => exportAllData(settings)}
          onDeleteAll={deleteAll}
          onBack={() => setIsInSettings(false)}
          onSignOut={onSignOut}
        />
      );
    }
    if (isInSeedCheck && seedContact && seedCopy) {
      return (
        <SeedCheckScreen
          strings={strings}
          copy={seedCopy}
          phone={seedContact.phone}
          onBack={() => setIsInSeedCheck(false)}
        />
      );
    }
    if (resultFlow.result) {
      return (
        <ActionCardScreen
          strings={strings}
          language={language}
          card={resultFlow.result.card}
          observation={resultFlow.result.observation}
          photoUris={resultFlow.result.photoUris}
          farmSections={settings.farmSections}
          savedOfficerPhone={settings.officerPhone}
          onChooseFarmSection={resultFlow.chooseFarmSection}
          onAddFarmSection={resultFlow.addFarmSection}
          onSaveOfficerPhone={(officerPhone) => updateSettings({ officerPhone })}
          onSendCase={resultFlow.sendCase}
          onCheckAnother={checkAnotherTree}
        />
      );
    }
    return (
      <CaptureScreen
        strings={strings}
        photos={capture.photos}
        check={capture.check}
        isChecking={capture.isChecking}
        problem={modelProblem ?? capture.problem}
        canCheck={leafModel.state === 'loaded'}
        onTakeLeaf={capture.takeLeaf}
        onFinish={finishAndShowAdvice}
        onOpenSettings={() => setIsInSettings(true)}
        onOpenSeedCheck={seedCopy ? () => setIsInSeedCheck(true) : undefined}
        onSwitchLanguage={switchLanguage}
      />
    );
  };

  return renderScreen();
}
