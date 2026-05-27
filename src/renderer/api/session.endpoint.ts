import { api } from './rootApi';
import { parsingError } from './endpointUtils';
import {
  parseRendererSessionCreate,
  parseRendererSessionList,
  type RendererSessionCreate,
  type RendererSessionList
} from './session.factory';

export type SessionListArgs = {
  cwd: string;
};

export type SessionCreateArgs = {
  cwd: string;
  mcpServers: Record<string, unknown>[];
  modeId?: string;
  modelId?: string;
  autopilotDecision?: 'allow' | 'deny';
};

export const sessionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listAcpSessions: builder.query<RendererSessionList, SessionListArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const response = await baseQuery({ channel: 'session:listAcp', payload: arg });
        if (response.error !== undefined) {
          return { error: response.error };
        }
        const parsed = parseRendererSessionList(response.data);

        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      providesTags: ['Session']
    }),
    createAcpSession: builder.mutation<RendererSessionCreate, SessionCreateArgs>({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const payload = {
          cwd: arg.cwd,
          mcpServers: arg.mcpServers,
          modeId: arg.modeId,
          modelId: arg.modelId,
          autopilotDecision: arg.autopilotDecision
        };
        const response = await baseQuery({ channel: 'session:createAcp', payload });
        if (response.error !== undefined) {
          return { error: response.error };
        }
        const parsed = parseRendererSessionCreate(response.data);

        return parsed.ok ? { data: parsed.value } : { error: parsingError(parsed.error) };
      },
      invalidatesTags: ['Session']
    })
  })
});
