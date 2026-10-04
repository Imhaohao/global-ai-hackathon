import { useCallback, useEffect, useRef, useState } from 'react';

import { buildActionCard } from '../../../shared/src/actionCard.ts';
import type { ActionCard, AppLanguage, Observation, PlantCheck, WetDays } from '../../../shared/src/contract.ts';
import type { LeafPhoto } from '../diagnosis/classifyLeaf';
import { locationAllowed, type AppSettings } from '../storage/appSettings';
import { readCurrentLocation } from '../storage/deviceLocation';
import { createObservation, saveObservation } from '../storage/observations';
import { getActiveAccountContext, isActiveAccountContext } from '../storage/documentStore';
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
  const [account] = useState(getActiveAccountContext);
  const mounted = useRef(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const isCurrentAccount = useCallback(
    () => mounted.current && isActiveAccountContext(account),
    [account],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const finishCheck = useCallback(
    async (check: PlantCheck, photos: LeafPhoto[]) => {
      if (!isCurrentAccount()) return;
      const location = locationAllowed(settings) ? await readCurrentLocation() : null;
      if (!isCurrentAccount()) return;
      const card = buildActionCard({ kind: 'plant', verdict: check.verdict }, { language, wetDays });
      const observation = createObservation(check, location);
      if (isCurrentAccount()) setResult({ observation, card, photoUris: photos.map((photo) => photo.uri) });
    },
    [isCurrentAccount, language, settings, wetDays],
  );

  const changeObservation = useCallback(
    (change: (observation: Observation) => Observation) => {
      if (!result || !isCurrentAccount()) return;
      const observation = change(result.observation);
      saveObservation(observation);
      setResult({ ...result, observation });
    },
    [isCurrentAccount, result],
  );

  const chooseFarmSection = useCallback(
    (section: string | undefined) => changeObservation((observation) => withFarmSection(observation, section)),
    [changeObservation],
  );

  const addFarmSection = useCallback(
    (name: string) => {
      if (!isCurrentAccount()) return;
      if (!settings.farmSections.includes(name)) updateSettings({ farmSections: [...settings.farmSections, name] });
      chooseFarmSection(name);
    },
    [chooseFarmSection, isCurrentAccount, settings.farmSections, updateSettings],
  );

  const sendCase = useCallback(
    async (phone: string): Promise<OfficerSendResult> => {
      if (!result) return 'unavailable';
      const outcome = await sendCaseToOfficer(phone, result.observation, result.card, wetDays);
      if (!isCurrentAccount()) return 'unavailable';
      if (outcome === 'opened') changeObservation((observation) => ({ ...observation, reviewStatus: 'sentToOfficer' }));
      return outcome;
    },
    [changeObservation, isCurrentAccount, result, wetDays],
  );

  const clearResult = useCallback(() => {
    if (isCurrentAccount()) setResult(null);
  }, [isCurrentAccount]);

  return { result, finishCheck, chooseFarmSection, addFarmSection, sendCase, clearResult };
}
