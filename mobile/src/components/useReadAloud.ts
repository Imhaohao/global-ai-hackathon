import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';

export function useReadAloud(text: string, language: string) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    Speech.getAvailableVoicesAsync()
      .then((voices) => setIsAvailable(voices.some((voice) => voice.language.toLowerCase().startsWith(language))))
      .catch(() => setIsAvailable(false));
    return () => {
      Speech.stop();
    };
  }, [language]);

  const toggle = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    Speech.speak(text, {
      language,
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  return { isAvailable, isSpeaking, toggle };
}
