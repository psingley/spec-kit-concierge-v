import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import type { RendererBoundaryErrorName, RendererFactoryResult } from './factoryUtils';
import {
  jiraAuthStateLoaded,
  jiraBoardLoaded,
  type JiraAuthState,
  type JiraBoardMapping,
  type JiraBoardSuggestion,
  type JiraCredentialSaveResponse,
  type JiraProject
} from '../slices/jira';

type ErrorName = 'InvalidRendererJira';

export type JiraCredentialFormValue = {
  email: string;
  token: string;
  baseUrl: string;
  expiryDate?: string;
};

export type JiraCredentialSaveArg = {
  email: string;
  baseUrl: string;
  expiryDate?: string;
  tokenId: string;
};

const tokenVault = new Map<string, string>();
let tokenSequence = 0;

export const prepareJiraCredentialSave = (value: JiraCredentialFormValue): JiraCredentialSaveArg => {
  const tokenId = `jira-token-${Date.now().toString(36)}-${(tokenSequence += 1).toString(36)}`;
  tokenVault.set(tokenId, value.token);
  return {
    email: value.email,
    baseUrl: value.baseUrl,
    expiryDate: value.expiryDate,
    tokenId
  };
};

const consumeToken = (tokenId: string): string => {
  const token = tokenVault.get(tokenId);
  tokenVault.delete(tokenId);
  if (token === undefined) throw new Error('JIRA credential token was not available.');
  return token;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const invalid = (message: string): RendererFactoryResult<never, RendererBoundaryErrorName<ErrorName>> => ({
  ok: false,
  error: { name: 'InvalidRendererJira', message, path: '$' }
});

const containsTokenKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsTokenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) => key.toLowerCase() === 'token' || containsTokenKey(child));
};

const parseAuthState = (value: unknown): RendererFactoryResult<JiraAuthState, RendererBoundaryErrorName<ErrorName>> => {
  if (!isRecord(value)) return invalid('auth state must be an object');
  if (containsTokenKey(value)) return invalid('auth state must not contain token');
  if (value.state !== 'warm' && value.state !== 'expired' && value.state !== 'none') return invalid('state is invalid');
  if (value.state === 'none') return { ok: true, value: { state: 'none' } };
  return {
    ok: true,
    value: {
      state: value.state,
      displayName: typeof value.displayName === 'string' ? value.displayName : undefined,
      emailAddress: typeof value.emailAddress === 'string' ? value.emailAddress : undefined,
      accountId: typeof value.accountId === 'string' ? value.accountId : undefined,
      expiryDate: typeof value.expiryDate === 'string' ? value.expiryDate : undefined,
      baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : undefined
    }
  };
};

const parseSaveResponse = (value: unknown): RendererFactoryResult<JiraCredentialSaveResponse, RendererBoundaryErrorName<ErrorName>> => {
  if (!isRecord(value)) return invalid('save response must be an object');
  if (containsTokenKey(value)) return invalid('save response must not contain token');
  if (value.ok !== true) return invalid('ok must be true');
  const authState = parseAuthState(value.authState);
  return authState.ok ? { ok: true, value: { ok: true, authState: authState.value } } : authState;
};

const parseClearResponse = (value: unknown): RendererFactoryResult<{ ok: true }, RendererBoundaryErrorName<ErrorName>> => {
  if (!isRecord(value)) return invalid('clear response must be an object');
  if (value.ok !== true) return invalid('ok must be true');
  return { ok: true, value: { ok: true } };
};

const parseBoard = (value: unknown): RendererFactoryResult<JiraBoardMapping, RendererBoundaryErrorName<ErrorName>> => {
  if (!isRecord(value)) return invalid('board must be an object');
  if (containsTokenKey(value)) return invalid('board must not contain token');
  if (value.source !== 'user' && value.source !== 'seed' && value.source !== 'none') return invalid('board source is invalid');
  return {
    ok: true,
    value: {
      projectKey: typeof value.projectKey === 'string' ? value.projectKey : undefined,
      source: value.source
    }
  };
};

const parseSuggestionList = (value: unknown): RendererFactoryResult<JiraBoardSuggestion[], RendererBoundaryErrorName<ErrorName>> => {
  if (!isRecord(value) || !Array.isArray(value.boards)) return invalid('boards must be an array');
  const boards = value.boards.map((entry) => isRecord(entry) && typeof entry.key === 'string'
    ? {
        key: entry.key,
        name: typeof entry.name === 'string' ? entry.name : undefined,
        lastActivity: typeof entry.lastActivity === 'string' ? entry.lastActivity : undefined
      }
    : null);
  return boards.some((entry) => entry === null) ? invalid('board suggestion is malformed') : { ok: true, value: boards as JiraBoardSuggestion[] };
};

const parseProjectList = (value: unknown): RendererFactoryResult<JiraProject[], RendererBoundaryErrorName<ErrorName>> => {
  if (!isRecord(value) || !Array.isArray(value.projects)) return invalid('projects must be an array');
  const projects = value.projects.map((entry) => isRecord(entry) && typeof entry.key === 'string'
    ? { key: entry.key, name: typeof entry.name === 'string' ? entry.name : undefined }
    : null);
  return projects.some((entry) => entry === null) ? invalid('project is malformed') : { ok: true, value: projects as JiraProject[] };
};

export const jiraApi = api.injectEndpoints({
  endpoints: (builder) => ({
    saveCredential: builder.mutation<JiraCredentialSaveResponse, JiraCredentialSaveArg>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        let token: string;
        try {
          token = consumeToken(arg.tokenId);
        } catch (error) {
          return {
            error: {
              status: 'IPC_ERROR',
              data: { name: 'JiraCredentialTokenUnavailable', message: error instanceof Error ? error.message : String(error) }
            }
          };
        }
        const payload = {
          email: arg.email,
          token,
          baseUrl: arg.baseUrl,
          expiryDate: arg.expiryDate
        };
        const response = await baseQuery({ channel: 'jira:credential:save', payload });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseSaveResponse(response.data);
        if (!parsed.ok) return { error: parsingError(parsed.error) };
        queryApi.dispatch(jiraAuthStateLoaded(parsed.value.authState));
        return { data: parsed.value };
      },
      invalidatesTags: ['JiraCredential']
    }),
    clearCredential: builder.mutation<{ ok: true }, void>({
      async queryFn(_arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'jira:credential:clear', payload: {} });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseClearResponse(response.data);
        if (!parsed.ok) return { error: parsingError(parsed.error) };
        queryApi.dispatch(jiraAuthStateLoaded({ state: 'none' }));
        return { data: parsed.value };
      },
      invalidatesTags: ['JiraCredential', 'JiraBoard']
    }),
    getAuthState: builder.query<JiraAuthState, void>({
      async queryFn(_arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'jira:credential:state', payload: {} });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseAuthState(response.data);
        if (!parsed.ok) return { error: parsingError(parsed.error) };
        queryApi.dispatch(jiraAuthStateLoaded(parsed.value));
        return { data: parsed.value };
      },
      providesTags: ['JiraCredential']
    }),
    getBoard: builder.query<JiraBoardMapping, { repositoryPath: string }>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'jira:board:get', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseBoard(response.data);
        if (!parsed.ok) return { error: parsingError(parsed.error) };
        queryApi.dispatch(jiraBoardLoaded(parsed.value));
        return { data: parsed.value };
      },
      providesTags: ['JiraBoard']
    }),
    setBoard: builder.mutation<JiraBoardMapping, { repositoryPath: string; projectKey: string }>({
      async queryFn(arg, queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'jira:board:set', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseBoard(response.data);
        if (!parsed.ok) return { error: parsingError(parsed.error) };
        queryApi.dispatch(jiraBoardLoaded(parsed.value));
        return { data: parsed.value };
      },
      invalidatesTags: ['JiraBoard']
    }),
    suggestBoards: builder.query<JiraBoardSuggestion[], void>({
      async queryFn(_arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'jira:board:suggest', payload: {} });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseSuggestionList(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['JiraBoard']
    }),
    searchProjects: builder.query<JiraProject[], { query: string }>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'jira:project:search', payload: arg });
        if (response.error !== undefined) return { error: response.error };
        const parsed = parseProjectList(response.data);
        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      }
    })
  })
});
