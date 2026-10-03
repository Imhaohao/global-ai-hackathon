import { useCallback, useState } from 'react';

import { buildActionCard } from '../../../shared/src/actionCard.ts';
import type { ActionCard, AppLanguage, Observation, PlantCheck, WetDays } from '../../../shared/src/contract.ts';
import type { LeafPhoto } from '../diagnosis/classifyLeaf';
import { locationAllowed, type AppSettings } from '../storage/appSettings';
import { readCurrentLocation } from '../storage/deviceLocation';
import { createObservation, saveObservation } from '../storage/observations';
import { sendCaseToOfficer, type OfficerSendResult } from './sendCaseToOfficer';

export type CheckResult = { observation: Observation; card: ActionCard; photoUris: string[] };

type ResultFlowInputs = {
  settings: AppSettings;
  updateSettings: (changes: Partial<AppSettings>) => void;
  language: AppLanguage;
  wetDays?: WetDays;
};

function withFarmSection(observation: Observation, farmSection: string | undefined): Observation {
  return { ...observation, farmSection };
}

export function useResultFlow({ settings, updateSettings, language, wetDays }: ResultFlowInputs) {
  const [result, setResult] = useState<CheckResult | null>(null);

  const finishCheck = useCallback(
    async (check: PlantCheck, photos: LeafPhoto[]) => {
      const location = locationAllowed(settings) ? await readCurrentLocation() : null;
      const card = buildActionCard({ kind: 'plant', verdict: check.verdict }, { language, wetDays });
      const observation = createObservation(check, location);
      setResult({ observation, card, photoUris: photos.map((photo) => photo.uri) });
    },
    [language, settings, wetDays],
  );

  const changeObservation = useCallback(
    (change: (observation: Observation) => Observation) => {
      if (!result) return;
      const observation = change(result.observation);
      saveObservation(observation);
      setResult({ ...result, observation });
    },
    [result],
  );

  const chooseFarmSection = useCallback(
    (section: string | undefined) => changeObservation((observation) => withFarmSection(observation, section)),
    [changeObservation],
  );

  const addFarmSection = useCallback(
    (name: string) => {
      if (!settings.farmSections.includes(name)) updateSettings({ farmSections: [...settings.farmSections, name] });
      chooseFarmSection(name);
    },
    [chooseFarmSection, settings.farmSections, updateSettings],
  );

  const sendCase = useCallback(
    async (phone: string): Promise<OfficerSendResult> => {
      if (!result) return 'unavailable';
      const outcome = await sendCaseToOfficer(phone, result.observation, result.card, wetDays);
      if (outcome === 'opened') changeObservation((observation) => ({ ...observation, reviewStatus: 'sentToOfficer' }));
      return outcome;
    },
    [changeObservation, result, wetDays],
  );

  const clearResult = useCallback(() => setResult(null), []);

  return { result, finishCheck, chooseFarmSection, addFarmSection, sendCase, clearResult };
}
