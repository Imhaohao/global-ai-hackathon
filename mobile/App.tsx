import './global.css';

import { getLocales } from 'expo-localization';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { classifyLeaf, type Diagnosis, type LeafPhoto } from './src/diagnosis/classifyLeaf';
import { pickLeafPhoto, type PhotoSource } from './src/diagnosis/pickLeafPhoto';
import { STRINGS, type Language } from './src/i18n/strings';
import { CaptureScreen, type CaptureProblem } from './src/screens/CaptureScreen';
import { ResultScreen } from './src/screens/ResultScreen';

const COFFEE_LEAF_MODEL = require('./assets/model/coffee-leaf.tflite');

type AppState =
  | { screen: 'capture'; problem?: CaptureProblem }
  | { screen: 'checking'; photo: LeafPhoto }
  | { screen: 'result'; photo: LeafPhoto; diagnosis: Diagnosis };

function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'sw' ? 'sw' : 'en';
}

export default function App() {
  const [language, setLanguage] = useState<Language>(deviceLanguage);
  const [state, setState] = useState<AppState>({ screen: 'capture' });
  const leafModel = useTensorflowModel(COFFEE_LEAF_MODEL, []);
  const strings = STRINGS[language];

  const checkLeaf = async (source: PhotoSource) => {
    if (leafModel.state !== 'loaded') return;
    const picked = await pickLeafPhoto(source);
    if (picked.kind === 'cameraBlocked') return setState({ screen: 'capture', problem: 'cameraBlocked' });
    if (picked.kind === 'cancelled') return;
    setState({ screen: 'checking', photo: picked.photo });
    try {
      const diagnosis = await classifyLeaf(leafModel.model, picked.photo);
      setState({ screen: 'result', photo: picked.photo, diagnosis });
    } catch {
      setState({ screen: 'capture', problem: 'photoFailed' });
    }
  };

  const modelProblem: CaptureProblem | undefined = leafModel.state === 'error' ? 'modelFailed' : undefined;

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-paper">
        <StatusBar style="dark" />
        {state.screen === 'result' ? (
          <ResultScreen
            strings={strings}
            photoUri={state.photo.uri}
            diagnosis={state.diagnosis}
            onCheckAnother={() => setState({ screen: 'capture' })}
          />
        ) : (
          <CaptureScreen
            strings={strings}
            checkingPhotoUri={state.screen === 'checking' ? state.photo.uri : undefined}
            problem={modelProblem ?? (state.screen === 'capture' ? state.problem : undefined)}
            canCheck={leafModel.state === 'loaded'}
            onPick={checkLeaf}
            onSwitchLanguage={() => setLanguage(language === 'en' ? 'sw' : 'en')}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
