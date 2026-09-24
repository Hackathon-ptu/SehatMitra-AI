/**
 * ASHA portal API client.
 *
 * Auth is isolated from the citizen app: the ASHA token lives under its own
 * storage key and is only ever attached by this client.
 *
 * Built for patchy rural networks:
 *  - GET responses are cached, so the last-seen work list and family records
 *    still open when the phone is offline (flagged as "saved" data).
 *  - Visits and vaccinations are append-only, so if the network drops while
 *    saving they go to an outbox and sync automatically when back online.
 *    Visits carry a client_ref so a retried save never creates a duplicate.
 */
import axios, { AxiosError } from 'axios';
import API_BASE_URL from '../../config/api';
import type { AshaWorkerSession } from './types';

const SESSION_KEY = 'sehatmitra-asha-session';
const CACHE_PREFIX = 'sehatmitra-asha-cache:';
const OUTBOX_KEY = 'sehatmitra-asha-outbox';

export const OUTBOX_EVENT = 'asha-outbox-changed';
export const SESSION_EVENT = 'asha-session-changed';

// ── Session ──────────────────────────────────────────────────────────────────

interface StoredSession {
  token: string;
  worker: AshaWorkerSession;
  expiresAt: number;
}

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota exceeded / private mode: the app keeps working without persistence
  }
};

const safeRemove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const getSession = (): StoredSession | null => {
  const raw = safeGet(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as StoredSession;
    if (!s.token || Date.now() > s.expiresAt) {
      safeRemove(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
};

export const saveSession = (token: string, worker: AshaWorkerSession, expiresInSec: number) => {
  safeSet(SESSION_KEY, JSON.stringify({ token, worker, expiresAt: Date.now() + expiresInSec * 1000 }));
  window.dispatchEvent(new Event(SESSION_EVENT));
};

export const clearSession = () => {
  safeRemove(SESSION_KEY);
  // Health data must not linger on a shared phone after logout
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX) || k.startsWith(DRAFT_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
};

// ── HTTP client ──────────────────────────────────────────────────────────────

export const ashaHttp = axios.create({
  baseURL: `${API_BASE_URL}/asha`,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

ashaHttp.interceptors.request.use((config) => {
  const s = getSession();
  if (s && config.headers) config.headers.Authorization = `Bearer ${s.token}`;
  return config;
});

ashaHttp.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) clearSession();
    return Promise.reject(error);
  },
);

/** True when the request never reached the server (offline, DNS, timeout). */
export const isNetworkError = (e: unknown): boolean => {
  const err = e as AxiosError;
  return !!err && (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || (!!err.request && !err.response));
};

export const errorMessage = (e: unknown, fallback = 'Something went wrong'): string => {
  const err = e as AxiosError<{ detail?: unknown }>;
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
};

export async function login(workerId: string, mpin: string) {
  const { data } = await axios.post(`${API_BASE_URL}/auth/asha-login`, { worker_id: workerId, mpin });
  saveSession(data.access_token, data.worker, data.expires_in ?? 12 * 3600);
  return data.worker as AshaWorkerSession;
}

// ── Cached reads ─────────────────────────────────────────────────────────────

export interface CachedResult<T> {
  data: T;
  fromCache: boolean;
  savedAt?: number;
}

export async function cachedGet<T>(path: string, params?: Record<string, unknown>): Promise<CachedResult<T>> {
  const key = CACHE_PREFIX + path + (params ? JSON.stringify(params) : '');
  try {
    const { data } = await ashaHttp.get<T>(path, { params });
    safeSet(key, JSON.stringify({ data, savedAt: Date.now() }));
    return { data, fromCache: false };
  } catch (e) {
    if (isNetworkError(e)) {
      const raw = safeGet(key);
      if (raw) {
        const { data, savedAt } = JSON.parse(raw);
        return { data, fromCache: true, savedAt };
      }
    }
    throw e;
  }
}

// ── Offline outbox ───────────────────────────────────────────────────────────

export interface OutboxItem {
  id: string;
  path: string;
  body: Record<string, unknown>;
  label: string;
  queuedAt: number;
}

export const readOutbox = (): OutboxItem[] => {
  try {
    return JSON.parse(safeGet(OUTBOX_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeOutbox = (items: OutboxItem[]) => {
  safeSet(OUTBOX_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(OUTBOX_EVENT));
};

const newRef = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * POST an append-only record. Returns the server response, or
 * `{ queued: true }` when the phone is offline and the record was saved
 * to the outbox instead.
 */
export async function postOrQueue<T>(path: string, body: Record<string, unknown>, label: string):
  Promise<{ queued: false; data: T } | { queued: true }> {
  const payload = { client_ref: newRef(), ...body };
  try {
    const { data } = await ashaHttp.post<T>(path, payload);
    return { queued: false, data };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    writeOutbox([...readOutbox(), { id: payload.client_ref as string, path, body: payload, label, queuedAt: Date.now() }]);
    return { queued: true };
  }
}

let flushing = false;

/** Send queued records. Stops at the first network failure; drops records the server rejects. */
export async function flushOutbox(): Promise<number> {
  if (flushing || !getSession()) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of readOutbox()) {
      try {
        await ashaHttp.post(item.path, item.body);
        sent += 1;
        writeOutbox(readOutbox().filter((i) => i.id !== item.id));
      } catch (e) {
        if (isNetworkError(e)) break;
        // 4xx: the record can never succeed (e.g. member removed) — discard it
        writeOutbox(readOutbox().filter((i) => i.id !== item.id));
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}

// ── Drafts ───────────────────────────────────────────────────────────────────

const DRAFT_PREFIX = 'sehatmitra-asha-draft:';

export const loadDraft = <T,>(key: string): T | null => {
  try {
    return JSON.parse(safeGet(DRAFT_PREFIX + key) || 'null');
  } catch {
    return null;
  }
};

export const saveDraft = (key: string, value: unknown) => safeSet(DRAFT_PREFIX + key, JSON.stringify(value));
export const clearDraft = (key: string) => safeRemove(DRAFT_PREFIX + key);
