import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { PermissionsAndroid } from "react-native";

import { addSmsListener, sendSms } from "../modules/sms-gateway";
import type { IncomingSms } from "../modules/sms-gateway";
import type { FarmerReport, LocalModel } from "../../shared/src/localModel/index.ts";
import { answerQuestion, type AnswerSource } from "./answerQuestion";
import { createReplyGuard } from "./replyGuard";
import { secureSmsPreferences } from "./smsPreferences";
import type { SmsPreferences } from "./smsPreferences";
import { createSmsPreferenceState } from "./smsPreferenceState";
import { handleCarrierSms, handleQuestionSms } from "./smsHandler";

const KEEP_AWAKE_TAG = "leaf-doctor-hub";
const MAX_EXCHANGES_SHOWN = 50;

export interface Exchange {
  id: string;
  from: string;
  question: string;
  reply: string;
  source: AnswerSource;
  modelReading: FarmerReport | null;
  receivedAt: number;
}

export type HubProblem = "permission-denied" | "send-failed" | "storage-failed" | null;

async function requestSmsPermissions(): Promise<boolean> {
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    PermissionsAndroid.PERMISSIONS.SEND_SMS,
  ]);
  return Object.values(results).every((result) => result === PermissionsAndroid.RESULTS.GRANTED);
}

export function useSmsHub(
  localModelRef: RefObject<LocalModel | null>,
  hubTokenRef: RefObject<string | null>,
  preferences: SmsPreferences = secureSmsPreferences,
) {
  const [listening, setListening] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [problem, setProblem] = useState<HubProblem>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const shouldReplyRef = useRef(createReplyGuard());
  const preferenceState = useMemo(() => createSmsPreferenceState(preferences), [preferences]);
  const repliedSendersRef = useRef(new Set<string>());

  const loadPreferences = useCallback(async (): Promise<boolean> => {
    const loaded = await preferenceState.load();
    if (!loaded) setProblem("storage-failed");
    return loaded;
  }, [preferenceState]);

  const setOptedOut = useCallback(async (sender: string, optedOut: boolean): Promise<boolean> => {
    const saved = await preferenceState.setOptedOut(sender, optedOut);
    if (!saved) setProblem("storage-failed");
    return saved;
  }, [preferenceState]);

  const recordExchange = useCallback((sms: IncomingSms, reply: string, source: AnswerSource, modelReading: FarmerReport | null) => {
    const exchange: Exchange = {
      id: `${sms.receivedAt}-${sms.from}`,
      from: sms.from,
      question: sms.body,
      reply,
      source,
      modelReading,
      receivedAt: sms.receivedAt,
    };
    setExchanges((previous) => [exchange, ...previous].slice(0, MAX_EXCHANGES_SHOWN));
  }, []);

  const handleSms = useCallback(async (sms: IncomingSms) => {
    if (!preferenceState.isLoaded() && !(await loadPreferences())) return;
    if (await handleCarrierSms(sms, setOptedOut, sendSms, recordExchange, setProblem)) return;
    await handleQuestionSms(
      sms,
      () => preferenceState.isBlocked(sms.from),
      () => shouldReplyRef.current(sms.from, sms.body, sms.receivedAt),
      () => answerQuestion(sms.from, sms.body, localModelRef.current, hubTokenRef.current),
      () => !repliedSendersRef.current.has(sms.from.trim()),
      () => repliedSendersRef.current.add(sms.from.trim()),
      sendSms,
      recordExchange,
      setProblem,
    );
  }, [loadPreferences, localModelRef, hubTokenRef, recordExchange, setOptedOut, preferenceState]);

  const stop = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    deactivateKeepAwake(KEEP_AWAKE_TAG);
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    if (!(await requestSmsPermissions())) {
      setProblem("permission-denied");
      return;
    }
    if (!(await loadPreferences())) return;
    setProblem(null);
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    subscriptionRef.current = addSmsListener((sms) => void handleSms(sms));
    setListening(true);
  }, [handleSms, loadPreferences]);

  useEffect(() => stop, [stop]);

  return { listening, exchanges, problem, start, stop };
}
