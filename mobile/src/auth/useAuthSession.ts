import * as SecureStore from 'expo-secure-store';
import { AppState, type AppStateStatus } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AuthApiError, AuthNetworkError, AuthProtocolError, type AuthApi } from './authApi';
import { createSessionRevision, isSessionExpired, validateSavedSession, type AuthSession } from './session';
import { createSessionMutationQueue } from './sessionMutationQueue';
import { clearActiveAccount, setActiveAccount } from '../storage/documentStore';

const SESSION_KEY = 'leaf-doctor-session-v1';
const SECURE_STORE_OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const EXPIRY_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

type AuthState = { status: 'restoring' } | { status: 'signedOut' } | { status: 'signedIn'; session: AuthSession };
type RestoreOutcome = { session: AuthSession | null; persist: boolean };
type StateSetter = (state: AuthState) => void;
type SessionRef = { current: AuthSession | null };
type SessionRevision = ReturnType<typeof createSessionRevision>;
type MutationQueue = ReturnType<typeof createSessionMutationQueue>;

export function useAuthSession(api: AuthApi) {
  const [state, setState] = useState<AuthState>({ status: 'restoring' });
  const sessionRef = useRef<AuthSession | null>(null);
  const [generation] = useState(createSessionRevision);
  const [mutateStoredSession] = useState(() => createSessionMutationQueue(generation));

  const signOut = useCallback(async () => {
    const session = sessionRef.current;
    const attempt = generation.next();
    sessionRef.current = null;
    try {
      await mutateStoredSession(attempt, deleteStoredSession);
    } catch (error) {
      if (generation.isCurrent(attempt)) sessionRef.current = session;
      throw error;
    }
    if (!generation.isCurrent(attempt)) return;
    clearActiveAccount();
    setState({ status: 'signedOut' });
    if (session) void api.logout(session.token).catch(() => undefined);
  }, [api, generation, mutateStoredSession]);

  const acceptSession = useCallback(async (session: AuthSession) => {
    const validSession = validateSavedSession(session);
    if (!validSession) throw new AuthProtocolError();
    const attempt = generation.next();
    const stored = await mutateStoredSession(attempt, () => storeSession(validSession));
    if (!stored || !generation.isCurrent(attempt)) return;
    setActiveAccount(validSession.accountId);
    sessionRef.current = validSession;
    setState({ status: 'signedIn', session: validSession });
  }, [generation, mutateStoredSession]);

  useEffect(() => {
    const attempt = generation.next();
    void restoreAndApply(api, attempt, generation, sessionRef, mutateStoredSession, setState);
    return () => {
      generation.next();
    };
  }, [api, generation, mutateStoredSession]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState !== 'active' || !sessionRef.current) return;
      const attempt = generation.next();
      void restoreAndApply(api, attempt, generation, sessionRef, mutateStoredSession, setState, sessionRef.current);
    });
    return () => listener.remove();
  }, [api, generation, mutateStoredSession]);

  useEffect(() => {
    if (state.status !== 'signedIn') return;
    const delay = Math.min(Math.max(state.session.expiresAt - Date.now(), 0), EXPIRY_CHECK_INTERVAL_MS);
    const timer = setTimeout(() => {
      if (Date.now() >= state.session.expiresAt) void expireSession(api, state.session, generation, sessionRef, mutateStoredSession, setState);
      else setState({ status: 'signedIn', session: state.session });
    }, delay);
    return () => clearTimeout(timer);
  }, [api, generation, mutateStoredSession, state]);

  return { state, acceptSession, signOut };
}

async function restoreAndApply(
  api: AuthApi,
  attempt: number,
  generation: SessionRevision,
  sessionRef: SessionRef,
  mutationQueue: MutationQueue,
  setState: StateSetter,
  currentSession?: AuthSession,
): Promise<void> {
  const outcome = await restoreSession(api, currentSession);
  if (!generation.isCurrent(attempt)) return;
  if (outcome.session && outcome.persist) {
    try {
      const stored = await mutationQueue(attempt, () => storeSession(outcome.session as AuthSession));
      if (!stored || !generation.isCurrent(attempt)) return;
    } catch {
      if (generation.isCurrent(attempt)) applySession(null, sessionRef, setState);
      return;
    }
  }
  if (!outcome.session) await mutationQueue(attempt, deleteStoredSession).catch(() => false);
  if (!generation.isCurrent(attempt)) return;
  applySession(outcome.session, sessionRef, setState);
}

async function restoreSession(api: AuthApi, currentSession?: AuthSession): Promise<RestoreOutcome> {
  const saved = currentSession ?? (await loadStoredSession());
  if (!saved || isSessionExpired(saved)) return { session: null, persist: false };
  try {
    const serverSession = await api.getSession(saved.token);
    if (serverSession.accountId !== saved.accountId || serverSession.phone !== saved.phone) {
      return { session: null, persist: false };
    }
    const validated = validateSavedSession({ ...serverSession, token: saved.token });
    return validated ? { session: validated, persist: true } : { session: null, persist: false };
  } catch (error) {
    if (isUnauthorized(error) || error instanceof AuthProtocolError || isSessionExpired(saved)) {
      return { session: null, persist: false };
    }
    if (isOfflineFailure(error)) return { session: saved, persist: false };
    return { session: null, persist: false };
  }
}

function applySession(session: AuthSession | null, sessionRef: SessionRef, setState: StateSetter): void {
  if (!session) {
    clearActiveAccount();
    sessionRef.current = null;
    setState({ status: 'signedOut' });
    return;
  }
  try {
    setActiveAccount(session.accountId);
    sessionRef.current = session;
    setState({ status: 'signedIn', session });
  } catch {
    clearActiveAccount();
    sessionRef.current = null;
    setState({ status: 'signedOut' });
  }
}

async function expireSession(
  api: AuthApi,
  session: AuthSession,
  generation: SessionRevision,
  sessionRef: SessionRef,
  mutationQueue: MutationQueue,
  setState: StateSetter,
): Promise<void> {
  if (sessionRef.current?.token !== session.token || !isSessionExpired(session)) return;
  const attempt = generation.next();
  sessionRef.current = null;
  clearActiveAccount();
  setState({ status: 'signedOut' });
  await mutationQueue(attempt, deleteStoredSession).catch(() => false);
  void api.logout(session.token).catch(() => undefined);
}

async function loadStoredSession(): Promise<AuthSession | null> {
  try {
    const serialized = await SecureStore.getItemAsync(SESSION_KEY, SECURE_STORE_OPTIONS);
    if (!serialized) return null;
    let value: unknown;
    try {
      value = JSON.parse(serialized);
    } catch {
      return null;
    }
    return validateSavedSession(value);
  } catch {
    return null;
  }
}

async function storeSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), SECURE_STORE_OPTIONS);
}

async function deleteStoredSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY, SECURE_STORE_OPTIONS);
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof AuthApiError && (error.status === 401 || error.code === 'unauthorized');
}

function isOfflineFailure(error: unknown): boolean {
  return error instanceof AuthNetworkError || (error instanceof AuthApiError && error.code === 'unavailable');
}
