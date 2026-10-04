import { ArrowClockwise, ArrowRight, Translate } from 'phosphor-react-native';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type TextInput } from 'react-native';

import { AuthApiError, AuthNetworkError, type AuthApi } from '../auth/authApi';
import { secondsRemaining } from '../auth/resendCooldown';
import { isCanonicalPhone, type AuthSession } from '../auth/session';
import { Button } from '../components/Button';
import { BotanicalImage } from '../components/BotanicalImage';
import { IconButton } from '../components/IconButton';
import { TextField } from '../components/TextField';
import { Muted, SectionHeading, Title } from '../components/Typography';
import { STRINGS, fillTemplate, type Language } from '../i18n/strings';

type LoginScreenProps = {
  api: AuthApi;
  language: Language;
  onSwitchLanguage: () => void;
  onAuthenticated: (session: AuthSession) => Promise<void>;
};

type Step = 'phone' | 'code';

export function LoginScreen({ api, language, onSwitchLanguage, onAuthenticated }: LoginScreenProps) {
  const strings = STRINGS[language];
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [resendDeadline, setResendDeadline] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const inputRef = useRef<TextInput>(null);

  const reportError = (message: string) => {
    setError(message);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (error && !pending) inputRef.current?.focus();
  }, [error, pending]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const updateRemaining = () => {
      const remaining = secondsRemaining(resendDeadline);
      setResendSeconds(remaining);
      if (remaining > 0) timer = setTimeout(updateRemaining, Math.min(1000, remaining * 1000));
    };
    updateRemaining();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendDeadline]);

  const requestCode = async (resend: boolean) => {
    if (inFlight.current) return;
    const canonicalPhone = canonicalizePhone(resend ? phone : phoneInput);
    if (!canonicalPhone) {
      reportError(strings.authInvalidPhone);
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const seconds = await api.sendCode(canonicalPhone, language);
      setPhone(canonicalPhone);
      setPhoneInput(canonicalPhone);
      setResendDeadline(Date.now() + seconds * 1000);
      setCode('');
      setStep('code');
    } catch (cause) {
      reportError(errorMessage(cause, strings.authInvalidPhone, strings.authIncorrectCode, strings.authRateLimited, strings.authUnavailable));
      if (cause instanceof AuthApiError && cause.retryAfterSeconds) {
        setResendDeadline(Date.now() + cause.retryAfterSeconds * 1000);
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  const verifyCode = async () => {
    if (inFlight.current) return;
    const normalizedCode = code.replace(/\s/g, '');
    if (!/^\d{4,10}$/.test(normalizedCode)) {
      reportError(strings.authInvalidCode);
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      await onAuthenticated(await api.verifyCode(phone, normalizedCode));
    } catch (cause) {
      reportError(errorMessage(cause, strings.authInvalidPhone, strings.authIncorrectCode, strings.authRateLimited, strings.authUnavailable));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  const changePhone = () => {
    setStep('phone');
    setPhone('');
    setCode('');
    setResendDeadline(0);
    setError('');
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center gap-6 px-5 py-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-end">
          <IconButton label={strings.switchLanguage} icon={Translate} onPress={onSwitchLanguage} />
        </View>
        <BotanicalImage compact />
        <View className="gap-3">
          <Title key={step}>{step === 'phone' ? strings.authTitle : strings.authCodeTitle}</Title>
          {step === 'code' && <Muted>{fillTemplate(strings.authCodeHint, { phone })}</Muted>}
        </View>
        {step === 'phone' ? (
          <PhoneForm
            inputRef={inputRef}
            error={error}
            value={phoneInput}
            label={strings.authPhoneLabel}
            hint={strings.authPhoneHint}
            onChange={setPhoneInput}
            onSubmit={() => void requestCode(false)}
            buttonLabel={pending ? strings.authSendingCode : strings.authSendCode}
            pending={pending}
            resendSeconds={resendSeconds}
            cooldownLabel={fillTemplate(strings.authTryAgainIn, { seconds: resendSeconds })}
            onRequest={() => void requestCode(false)}
          />
        ) : (
          <CodeForm
            inputRef={inputRef}
            error={error}
            strings={strings}
            code={code}
            pending={pending}
            resendSeconds={resendSeconds}
            onChange={setCode}
            onVerify={() => void verifyCode()}
            onResend={() => void requestCode(true)}
            onChangePhone={changePhone}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PhoneForm({
  inputRef,
  error,
  value,
  label,
  hint,
  onChange,
  onSubmit,
  buttonLabel,
  pending,
  resendSeconds,
  cooldownLabel,
  onRequest,
}: {
  inputRef: RefObject<TextInput | null>;
  error: string;
  value: string;
  label: string;
  hint: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  buttonLabel: string;
  pending: boolean;
  resendSeconds: number;
  cooldownLabel: string;
  onRequest: () => void;
}) {
  return (
    <View className="gap-4">
      <View className="gap-2">
        <SectionHeading>{label}</SectionHeading>
        <TextField
          inputRef={inputRef}
          accessibilityLabel={label}
          accessibilityHint={hint}
          error={error}
          autoComplete="tel"
          keyboardType="phone-pad"
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          returnKeyType="send"
          editable={!pending}
          placeholder="+254712345678"
        />
        <Muted>{hint}</Muted>
      </View>
      <Button
        label={resendSeconds > 0 ? cooldownLabel : buttonLabel}
        icon={ArrowRight}
        onPress={onRequest}
        disabled={pending || resendSeconds > 0}
      />
    </View>
  );
}

function CodeForm({
  inputRef,
  error,
  strings,
  code,
  pending,
  resendSeconds,
  onChange,
  onVerify,
  onResend,
  onChangePhone,
}: {
  inputRef: RefObject<TextInput | null>;
  error: string;
  strings: (typeof STRINGS)['en'];
  code: string;
  pending: boolean;
  resendSeconds: number;
  onChange: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onChangePhone: () => void;
}) {
  return (
    <View className="gap-4">
      <View className="gap-2">
        <SectionHeading>{strings.authCodeLabel}</SectionHeading>
        <TextField
          inputRef={inputRef}
          accessibilityLabel={strings.authCodeLabel}
          accessibilityHint={strings.authInvalidCode}
          error={error}
          keyboardType="number-pad"
          autoComplete={Platform.OS === 'ios' ? 'one-time-code' : 'sms-otp'}
          autoCapitalize="none"
          maxLength={10}
          value={code}
          onChangeText={(value) => onChange(value.replace(/[^0-9]/g, ''))}
          onSubmitEditing={onVerify}
          returnKeyType="done"
          editable={!pending}
          placeholder="123456"
        />
      </View>
      <Button
        label={pending ? strings.authVerifyingCode : strings.authVerifyCode}
        icon={ArrowRight}
        onPress={onVerify}
        disabled={pending}
      />
      <View className="items-start gap-2">
        <Button
          label={resendSeconds > 0
              ? fillTemplate(strings.authResendIn, { seconds: resendSeconds })
              : strings.authResendCode}
          variant="quiet"
          icon={ArrowClockwise}
          disabled={resendSeconds > 0 || pending}
          onPress={onResend}
        />
        <Button
          label={strings.authChangePhone}
          variant="quiet"
          icon={ArrowClockwise}
          disabled={pending}
          onPress={onChangePhone}
        />
      </View>
    </View>
  );
}

function canonicalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('+')) return null;
  const digits = trimmed.slice(1).replace(/[\s().-]/g, '');
  const canonical = `+${digits}`;
  return isCanonicalPhone(canonical) ? canonical : null;
}

function errorMessage(
  cause: unknown,
  phoneError: string,
  codeError: string,
  rateError: string,
  unavailableError: string,
): string {
  if (cause instanceof AuthNetworkError) return unavailableError;
  if (cause instanceof AuthApiError) {
    if (cause.code === 'invalid_phone') return phoneError;
    if (cause.code === 'invalid_code') return codeError;
    if (cause.code === 'rate_limited') return rateError;
    if (cause.code === 'unauthorized') return codeError;
    return unavailableError;
  }
  return unavailableError;
}
