import { requireNativeModule } from "expo-modules-core";

export interface IncomingSms {
  from: string;
  body: string;
  receivedAt: number;
}

interface SmsSubscription {
  remove: () => void;
}

interface SmsGatewayNativeModule {
  sendSms: (to: string, body: string) => Promise<void>;
  addListener: (eventName: "onSmsReceived", listener: (sms: IncomingSms) => void) => SmsSubscription;
}

const SmsGateway = requireNativeModule<SmsGatewayNativeModule>("SmsGateway");

export function addSmsListener(callback: (sms: IncomingSms) => void): SmsSubscription {
  return SmsGateway.addListener("onSmsReceived", callback);
}

export function sendSms(to: string, body: string): Promise<void> {
  return SmsGateway.sendSms(to, body);
}
