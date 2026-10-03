import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { PermissionsAndroid } from "react-native";

import { addSmsListener, sendSms } from "../modules/sms-gateway";
import type { IncomingSms } from "../modules/sms-gateway";
import type { FarmerReport, LocalModel } from "../../shared/src/localModel/index.ts";
import { answerQuestion, type AnswerSource } from "./answerQuestion";
import { createReplyGuard } from "./replyGuard";

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

export type HubProblem = "permission-denied" | "send-failed" | null;

async function requestSmsPermissions(): Promise<boolean> {
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    PermissionsAndroid.PERMISSIONS.SEND_SMS,
  ]);
  return Object.values(results).every((result) => result === PermissionsAndroid.RESULTS.GRANTED);
}

export function useSmsHub(localModelRef: RefObject<LocalModel | null>) {
  const [listening, setListening] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [problem, setProblem] = useState<HubProblem>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const shouldReplyRef = useRef(createReplyGuard());

  const handleSms = useCallback(async (sms: IncomingSms) => {
    if (!shouldReplyRef.current(sms.from, sms.body, sms.receivedAt)) return;
    const answer = await answerQuestion(sms.from, sms.body, localModelRef.current);
    try {
      await sendSms(sms.from, answer.reply);
      setProblem(null);
    } catch {
      setProblem("send-failed");
    }
    const exchange: Exchange = {
      id: `${sms.receivedAt}-${sms.from}`,
      from: sms.from,
      question: sms.body,
      reply: answer.reply,
      source: answer.source,
      modelReading: answer.modelReading,
      receivedAt: sms.receivedAt,
    };
    setExchanges((previous) => [exchange, ...previous].slice(0, MAX_EXCHANGES_SHOWN));
  }, [localModelRef]);

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
    setProblem(null);
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    subscriptionRef.current = addSmsListener((sms) => void handleSms(sms));
    setListening(true);
  }, [handleSms]);

  useEffect(() => stop, [stop]);

  return { listening, exchanges, problem, start, stop };
}
