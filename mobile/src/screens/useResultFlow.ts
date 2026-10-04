import { useCallback, useEffect, useRef, useState } from 'react';

import { buildActionCard } from '../../../shared/src/actionCard.ts';
import type { ActionCard, AppLanguage, Observation, PlantCheck, WetDays } from '../../../shared/src/contract.ts';
import { isFreshWetDays } from '../../../shared/src/rain.ts';
import type { LeafPhoto } from '../diagnosis/classifyLeaf';
import { locationAllowed, type AppSettings } from '../storage/appSettings';
import { readCurrentLocation } from '../storage/deviceLocation';
import { createObservation, saveObservation } from '../storage/observations';
import {
  getActiveAccountContext,
  getActiveAccountDataRevision,
  isActiveAccountContext,
} from '../storage/documentStore';
import { isCurrentDataOperation } from '../storage/operationRevision';
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
  const operationGeneration = useRef(0);
  const finishGeneration = useRef(0);
  const resultGeneration = useRef<number | null>(null);
  const resultDataRevision = useRef<number | null>(null);
  const finishPending = useRef(false);
  const sendPending = useRef(false);
  const latestSettings = useRef(settings);
  const latestWetDays = useRef(wetDays);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isCurrentAccount = useCallback(
    () => mounted.current && isActiveAccountContext(account),
    [account],
  );
  const isCurrentOperation = useCallback(
    (operation: number, dataRevision: number) =>
      isCurrentDataOperation(
        { generation: operation, dataRevision },
        operationGeneration.current,
        getActiveAccountDataRevision(),
        isCurrentAccount(),
      ),
    [isCurrentAccount],
  );

  useEffect(() => {
    latestSettings.current = settings;
    latestWetDays.current = wetDays;
  }, [settings, wetDays]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operationGeneration.current += 1;
      finishGeneration.current += 1;
    };
  }, []);

  const finishCheck = useCallback(
    async (check: PlantCheck, photos: LeafPhoto[]) => {
      if (!isCurrentAccount() || finishPending.current) return;
      const operation = operationGeneration.current + 1;
      const finishRequest = finishGeneration.current + 1;
      const dataRevision = getActiveAccountDataRevision();
      operationGeneration.current = operation;
      finishGeneration.current = finishRequest;
      finishPending.current = true;
      setIsFinishing(true);
      try {
        const locationConsentedAtStart = locationAllowed(settings);
        const location = locationConsentedAtStart ? await readCurrentLocation() : null;
        const isCurrentFinish = () =>
          finishGeneration.current === finishRequest &&
          isCurrentOperation(operation, dataRevision) &&
          (!locationConsentedAtStart || locationAllowed(latestSettings.current));
        if (!isCurrentFinish()) return;
        const currentWetDays = locationAllowed(latestSettings.current) && isFreshWetDays(latestWetDays.current)
          ? latestWetDays.current
          : undefined;
        const card = buildActionCard({ kind: 'plant', verdict: check.verdict }, { language, wetDays: currentWetDays });
        if (!isCurrentFinish()) return;
        const observation = await createObservation(check, locationConsentedAtStart ? location : null, isCurrentFinish);
        if (!observation || !isCurrentFinish()) return;
        resultGeneration.current = operation;
        resultDataRevision.current = dataRevision;
        setResult({ observation, card, photoUris: photos.map((photo) => photo.uri) });
      } catch {
        return;
      } finally {
        if (operationGeneration.current === operation && finishGeneration.current === finishRequest) {
          finishPending.current = false;
          setIsFinishing(false);
        }
      }
    },
    [isCurrentAccount, isCurrentOperation, language, settings],
  );

  const changeObservation = useCallback(
    (change: (observation: Observation) => Observation) => {
      if (
        !result ||
        resultGeneration.current !== operationGeneration.current ||
        resultDataRevision.current !== getActiveAccountDataRevision() ||
        !isCurrentAccount()
      ) return;
      const observation = change(result.observation);
      try {
        saveObservation(observation);
      } catch {
        return;
      }
      if (resultGeneration.current === operationGeneration.current && isCurrentAccount()) {
        setResult({ ...result, observation });
      }
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
      if (
        !result ||
        sendPending.current ||
        resultGeneration.current !== operationGeneration.current ||
        resultDataRevision.current !== getActiveAccountDataRevision() ||
        !isCurrentAccount()
      ) return 'unavailable';
      const operation = operationGeneration.current;
      const dataRevision = resultDataRevision.current;
      if (dataRevision === null) return 'unavailable';
      sendPending.current = true;
      setIsSending(true);
      try {
        const currentWetDays = locationAllowed(latestSettings.current) && isFreshWetDays(latestWetDays.current)
          ? latestWetDays.current
          : undefined;
        const outcome = await sendCaseToOfficer(phone, result.observation, result.card, currentWetDays);
        if (!isCurrentOperation(operation, dataRevision)) return 'unavailable';
        if (outcome === 'sent') {
          changeObservation((observation) => ({ ...observation, reviewStatus: 'sentToOfficer' }));
        }
        return outcome;
      } catch {
        return 'error';
      } finally {
        if (operationGeneration.current === operation) {
          sendPending.current = false;
          setIsSending(false);
        }
      }
    },
    [changeObservation, isCurrentAccount, isCurrentOperation, result],
  );

  const cancelPendingFinish = useCallback(() => {
    finishGeneration.current += 1;
    finishPending.current = false;
    setIsFinishing(false);
  }, []);

  const clearResult = useCallback(() => {
    operationGeneration.current += 1;
    finishGeneration.current += 1;
    resultGeneration.current = null;
    resultDataRevision.current = null;
    finishPending.current = false;
    sendPending.current = false;
    setIsFinishing(false);
    setIsSending(false);
    if (isCurrentAccount()) setResult(null);
  }, [isCurrentAccount]);

  return {
    result,
    finishCheck,
    isFinishing,
    isSending,
    cancelPendingFinish,
    chooseFarmSection,
    addFarmSection,
    sendCase,
    clearResult,
  };
}
