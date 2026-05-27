import './workspace.endpoint';
import './git.endpoint';
import './steps.endpoint';
import './preferences.endpoint';
import './auth.endpoint';
import './session.endpoint';
import './activity.endpoint';
import { api as rootApi, RUN2_TAG_TYPES } from './rootApi';
import type { activityApi } from './activity.endpoint';
import type { authApi } from './auth.endpoint';
import type { gitApi } from './git.endpoint';
import type { preferencesApi } from './preferences.endpoint';
import type { sessionApi } from './session.endpoint';
import type { stepsApi } from './steps.endpoint';
import type { workspaceApi } from './workspace.endpoint';
import type { AppVersionProof } from './rootApi';

type Run4Endpoints = typeof rootApi.endpoints &
  typeof workspaceApi.endpoints &
  typeof gitApi.endpoints &
  typeof stepsApi.endpoints &
  typeof preferencesApi.endpoints &
  typeof authApi.endpoints &
  typeof sessionApi.endpoints &
  typeof activityApi.endpoints;

export const api = rootApi as typeof rootApi & { endpoints: Run4Endpoints };
export { RUN2_TAG_TYPES, type AppVersionProof };
