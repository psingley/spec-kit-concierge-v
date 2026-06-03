import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { safeStorage } from 'electron';
import { createJiraRestClient, jiraHeaders, normalizeBaseUrl } from './jiraRestClient';
import type { JiraRestCredential } from './restCreateTurn';

export type SafeStorageAdapter = {
  isEncryptionAvailable: () => boolean;
  getSelectedStorageBackend?: () => string;
  encryptStringAsync: (plainText: string) => Promise<Buffer>;
  decryptStringAsync: (cipherText: Buffer) => Promise<string>;
};

export type SaveJiraSubmissionCredentialRequest = {
  email: string;
  token: string;
  baseUrl?: string;
};

export type JiraCredentialSaveFailureStatus = 'site_not_found' | 'invalid_credentials';

export type JiraAuthState = {
  state: 'warm' | 'expired' | 'none';
  displayName?: string;
  emailAddress?: string;
  accountId?: string;
  expiryDate?: string;
  baseUrl?: string;
};

type StoredCredential = JiraRestCredential & {
  expiryDate?: string;
  displayName?: string;
  emailAddress?: string;
  accountId?: string;
};

export type JiraCredentialSaveResponse =
  | { ok: true; authState: JiraAuthState }
  | { ok: false; status: JiraCredentialSaveFailureStatus };

export type JiraSubmissionCredentialService = {
  saveCredential: (credential: SaveJiraSubmissionCredentialRequest) => Promise<JiraCredentialSaveResponse>;
  loadCredential: () => Promise<StoredCredential | undefined>;
  clearCredential: () => Promise<void>;
  hasCredential: () => Promise<boolean>;
  getAuthState: () => Promise<JiraAuthState>;
};

const defaultSafeStorage: SafeStorageAdapter = {
  isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
  getSelectedStorageBackend: typeof safeStorage?.getSelectedStorageBackend === 'function'
    ? () => safeStorage.getSelectedStorageBackend()
    : undefined,
  encryptStringAsync: async (plainText) => safeStorage.encryptString(plainText),
  decryptStringAsync: async (cipherText) => safeStorage.decryptString(cipherText)
};

const credentialFilePath = (userDataPath: string): string =>
  path.join(userDataPath, 'jira-credential.enc');

const isSecureStorageAvailable = (safeStorageAdapter: SafeStorageAdapter): boolean =>
  safeStorageAdapter.isEncryptionAvailable() &&
  safeStorageAdapter.getSelectedStorageBackend?.() !== 'basic_text';

const toAuthState = (stored: StoredCredential, state: 'warm' | 'expired'): JiraAuthState => ({
  state,
  displayName: stored.displayName,
  emailAddress: stored.emailAddress,
  accountId: stored.accountId,
  expiryDate: stored.expiryDate,
  baseUrl: normalizeBaseUrl(stored.baseUrl)
});

const persist = async (userDataPath: string, safeStorageAdapter: SafeStorageAdapter, credential: StoredCredential): Promise<void> => {
  await mkdir(userDataPath, { recursive: true });
  const encrypted = await safeStorageAdapter.encryptStringAsync(JSON.stringify({
    ...credential,
    baseUrl: normalizeBaseUrl(credential.baseUrl)
  }));
  await writeFile(credentialFilePath(userDataPath), encrypted.toString('base64'), 'utf8');
};

const deriveBaseUrlFromEmail = (email: string): string | undefined => {
  const domain = email.trim().toLowerCase().split('@')[1];
  const siteName = domain?.split('.')[0];
  return siteName === undefined || siteName.trim() === '' ? undefined : `https://${siteName}.atlassian.net`;
};

const normalizeCandidateBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.trim();
  return normalizeBaseUrl(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
};

const readIdentity = async (response: Response): Promise<Pick<StoredCredential, 'accountId' | 'displayName' | 'emailAddress'>> => {
  const body = await response.json().catch(() => ({})) as unknown;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return {};
  const record = body as Record<string, unknown>;
  return {
    accountId: typeof record.accountId === 'string' ? record.accountId : undefined,
    displayName: typeof record.displayName === 'string' ? record.displayName : undefined,
    emailAddress: typeof record.emailAddress === 'string' ? record.emailAddress : undefined
  };
};

const validateCredential = async (
  credential: JiraRestCredential,
  fetch: typeof globalThis.fetch
): Promise<({ ok: true } & Pick<StoredCredential, 'accountId' | 'displayName' | 'emailAddress'>) | { ok: false; status: JiraCredentialSaveFailureStatus }> => {
  try {
    const response = await fetch(`${normalizeBaseUrl(credential.baseUrl)}/rest/api/3/myself`, {
      method: 'GET',
      headers: jiraHeaders(credential)
    });
    if (response.status === 200) return { ok: true, ...(await readIdentity(response)) };
    if (response.status === 401) return { ok: false, status: 'invalid_credentials' };
    return { ok: false, status: 'site_not_found' };
  } catch {
    return { ok: false, status: 'site_not_found' };
  }
};

export const createJiraSubmissionCredentialService = ({
  userDataPath,
  safeStorage: safeStorageAdapter = defaultSafeStorage,
  fetch = globalThis.fetch
}: {
  userDataPath: string;
  safeStorage?: SafeStorageAdapter;
  fetch?: typeof globalThis.fetch;
}): JiraSubmissionCredentialService => {
  const loadCredential = async (): Promise<StoredCredential | undefined> => {
    try {
      const raw = await readFile(credentialFilePath(userDataPath), 'utf8');
      const plain = await safeStorageAdapter.decryptStringAsync(Buffer.from(raw, 'base64'));
      const parsed = JSON.parse(plain) as StoredCredential;
      return {
        ...parsed,
        baseUrl: normalizeBaseUrl(parsed.baseUrl)
      };
    } catch {
      return undefined;
    }
  };

  return {
    saveCredential: async (credential) => {
      if (!isSecureStorageAvailable(safeStorageAdapter)) {
        throw new Error('secure storage unavailable for Jira submission credential');
      }
      const normalizedEmail = credential.email.trim();
      const normalizedToken = credential.token.trim();
      const baseUrl = credential.baseUrl === undefined || credential.baseUrl.trim() === ''
        ? deriveBaseUrlFromEmail(normalizedEmail)
        : normalizeCandidateBaseUrl(credential.baseUrl);
      if (baseUrl === undefined) return { ok: false, status: 'site_not_found' };
      const normalizedCredential: JiraRestCredential = { email: normalizedEmail, token: normalizedToken, baseUrl };
      const identity = await validateCredential(normalizedCredential, fetch);
      if (!identity.ok) return identity;
      const stored: StoredCredential = {
        ...normalizedCredential,
        displayName: identity.displayName,
        emailAddress: identity.emailAddress,
        accountId: identity.accountId
      };
      await persist(userDataPath, safeStorageAdapter, stored);
      return { ok: true, authState: toAuthState(stored, 'warm') };
    },
    loadCredential,
    clearCredential: async () => {
      await rm(credentialFilePath(userDataPath), { force: true });
    },
    hasCredential: async () => (await loadCredential()) !== undefined,
    getAuthState: async () => {
      const credential = await loadCredential();
      if (credential === undefined) return { state: 'none' };
      const identity = await createJiraRestClient({ credential, fetch }).myself();
      if (identity.status === 401) return toAuthState(credential, 'expired');
      const updated = {
        ...credential,
        displayName: identity.displayName ?? credential.displayName,
        emailAddress: identity.emailAddress ?? credential.emailAddress,
        accountId: identity.accountId ?? credential.accountId
      };
      return toAuthState(updated, 'warm');
    }
  };
};
