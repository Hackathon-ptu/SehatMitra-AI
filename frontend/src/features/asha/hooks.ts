import { useCallback, useEffect, useRef, useState } from 'react';
import {
  OUTBOX_EVENT, SESSION_EVENT, cachedGet, errorMessage, flushOutbox, getSession, readOutbox,
} from './api';
import type { ReferenceData } from './types';

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  savedAt?: number;
  reload: () => void;
}

/** Fetch a GET endpoint, falling back to the last saved copy when offline. */
export function useAshaQuery<T>(path: string | null, params?: Record<string, unknown>): QueryState<T> {
  const [state, setState] = useState<Omit<QueryState<T>, 'reload'>>({
    data: null, loading: !!path, error: null, fromCache: false,
  });
  const [nonce, setNonce] = useState(0);
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    cachedGet<T>(path, params)
      .then((r) => {
        if (!cancelled) setState({ data: r.data, loading: false, error: null, fromCache: r.fromCache, savedAt: r.savedAt });
      })
      .catch((e) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: errorMessage(e, 'Could not load. Check your connection.') }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

// Reference data changes only with a deploy — fetch once per session.
let referenceCache: ReferenceData | null = null;
let referencePromise: Promise<ReferenceData> | null = null;

export function useReference(): ReferenceData | null {
  const [ref, setRef] = useState<ReferenceData | null>(referenceCache);
  useEffect(() => {
    if (referenceCache) return;
    referencePromise ??= cachedGet<ReferenceData>('/reference').then((r) => (referenceCache = r.data));
    referencePromise.then(setRef).catch(() => {
      referencePromise = null;
    });
  }, []);
  return ref;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Number of records waiting to sync; flushes automatically when the phone comes online. */
export function useOutbox(onSynced?: () => void): number {
  const [count, setCount] = useState(() => readOutbox().length);
  const synced = useRef(onSynced);
  synced.current = onSynced;

  useEffect(() => {
    const update = () => setCount(readOutbox().length);
    const flush = () => flushOutbox().then((n) => n > 0 && synced.current?.());
    window.addEventListener(OUTBOX_EVENT, update);
    window.addEventListener('online', flush);
    flush();
    const timer = window.setInterval(flush, 60_000);
    return () => {
      window.removeEventListener(OUTBOX_EVENT, update);
      window.removeEventListener('online', flush);
      window.clearInterval(timer);
    };
  }, []);
  return count;
}

export function useAshaSession() {
  const [session, setSession] = useState(getSession);
  useEffect(() => {
    const update = () => setSession(getSession());
    window.addEventListener(SESSION_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(SESSION_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return session;
}
