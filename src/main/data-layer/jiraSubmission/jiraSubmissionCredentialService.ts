import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { safeStorage } from 'electron';
import { createJiraRestClient, normalizeBaseUrl } from './jiraRestClient';
import type { JiraRestCredential } from './restCreateTurn';

export type SafeStorageAdapter = {
  isEncryptionAvailable: () => boolean;
  getSelectedStorageBackend?: () => string;
  encryptStringAsync: (plainText: string) => Promise<Buffer>;
  decryptStringAsync: (cipherText: Buffer) => Promise<string>;
};

export type SaveJiraSubmissionCredentialRequest = JiraRestCredential & {
  expiryDate?: string;
};

export type JiraAuthState = {
  state: 'warm' | 'expired' | 'none';
  displayName?: string;
  emailAddress?: string;
  accountId?: string;
  expiryDate?: string;
  baseUrl?: string;
};

type StoredCredential = SaveJiraSubmissionCredentialRequest & {
  displayName?: string;
  emailAddress?: string;
  accountId?: string;
};

export type JiraSubmissionCredentialService = {
  saveCredential: (credential: SaveJiraSubmissionCredentialRequest) => Promise<{ ok: true; authState: JiraAuthState }>;
  loadCredential: () => Promise<StoredCredential | undefined>;
  clearCredential: () => Promise<void>;
  hasCredential: () => Promise<boolean>;
  getAuthState: () => Promise<JiraAuthState>;
};

const defaultSafeStorage: SafeStorageAdapter = {
  isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
  getSelectedStorageBackend: () => safeStorage.getSelectedStorageBackend(),
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
      const normalizedCredential = { ...credential, baseUrl: normalizeBaseUrl(credential.baseUrl) };
      const identity = await createJiraRestClient({ credential: normalizedCredential, fetch }).myself();
      if (identity.status !== 200) {
        throw new Error('Jira credential validation failed: reauth_required');
      }
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
