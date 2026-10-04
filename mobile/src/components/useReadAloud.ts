import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';

const normalizedTag = (tag: string) => tag.toLowerCase().replace('_', '-');
const primarySubtag = (tag: string) => normalizedTag(tag).split('-')[0];

// Chinese voices differ by region (Mandarin zh-CN, Cantonese zh-HK), so only an exact match will do.
const REGION_BOUND_LANGUAGES = new Set(['zh']);

/** A voice on this phone for the locale: the exact locale, else the same language from another region. */
export function pickVoice(voices: Speech.Voice[], locale: string): Speech.Voice | undefined {
  const exact = voices.find((voice) => normalizedTag(voice.language) === normalizedTag(locale));
  if (exact || REGION_BOUND_LANGUAGES.has(primarySubtag(locale))) return exact;
  return voices.find((voice) => primarySubtag(voice.language) === primarySubtag(locale));
}

export function useReadAloud(text: string, locale: string) {
  const [voice, setVoice] = useState<Speech.Voice | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (isCurrent) setVoice(pickVoice(voices, locale));
      })
      .catch(() => {
        if (isCurrent) setVoice(undefined);
      });
    return () => {
      isCurrent = false;
      Speech.stop();
    };
  }, [locale]);

  const toggle = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    if (!voice) return;
    setIsSpeaking(true);
    Speech.speak(text, {
      voice: voice.identifier,
      language: voice.language,
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  return { isAvailable: voice !== undefined, isSpeaking, toggle };
}
