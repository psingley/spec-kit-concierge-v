import './workspace.endpoint';
import './git.endpoint';
import './steps.endpoint';
import './preferences.endpoint';
import './auth.endpoint';
import './mcpConfig.endpoint';
import './session.endpoint';
import './activity.endpoint';
import './repositories.endpoint';
import './ensureLocalRepo.endpoint';
import './branches.endpoint';
import './artifacts.endpoint';
import './tasksDetail.endpoint';
import './reviewEvidence.endpoint';
import './jiraSubmission.endpoint';
import './copilotSpecify.endpoint';
import './copilotClarify.endpoint';
import './copilotPassive.endpoint';
import './sessionManifest.endpoint';
import { api as rootApi, RUN2_TAG_TYPES } from './rootApi';
import type { activityApi } from './activity.endpoint';
import type { authApi } from './auth.endpoint';
import type { mcpConfigApi } from './mcpConfig.endpoint';
import type { gitApi } from './git.endpoint';
import type { preferencesApi } from './preferences.endpoint';
import type { sessionApi } from './session.endpoint';
import type { stepsApi } from './steps.endpoint';
import type { workspaceApi } from './workspace.endpoint';
import type { repositoriesApi } from './repositories.endpoint';
import type { ensureLocalRepoApi } from './ensureLocalRepo.endpoint';
import type { branchesApi } from './branches.endpoint';
import type { artifactsApi } from './artifacts.endpoint';
import type { tasksDetailApi } from './tasksDetail.endpoint';
import type { reviewEvidenceApi } from './reviewEvidence.endpoint';
import type { jiraSubmissionApi } from './jiraSubmission.endpoint';
import type { copilotSpecifyApi } from './copilotSpecify.endpoint';
import type { copilotClarifyApi } from './copilotClarify.endpoint';
import type { copilotPassiveApi } from './copilotPassive.endpoint';
import type { sessionManifestApi } from './sessionManifest.endpoint';
import type { AppVersionProof } from './rootApi';

type Run4Endpoints = typeof rootApi.endpoints &
  typeof workspaceApi.endpoints &
  typeof gitApi.endpoints &
  typeof stepsApi.endpoints &
  typeof preferencesApi.endpoints &
  typeof authApi.endpoints &
  typeof mcpConfigApi.endpoints &
  typeof sessionApi.endpoints &
  typeof activityApi.endpoints &
  typeof repositoriesApi.endpoints &
  typeof ensureLocalRepoApi.endpoints &
  typeof branchesApi.endpoints &
  typeof artifactsApi.endpoints &
  typeof tasksDetailApi.endpoints &
  typeof reviewEvidenceApi.endpoints &
  typeof jiraSubmissionApi.endpoints &
  typeof copilotSpecifyApi.endpoints &
  typeof copilotClarifyApi.endpoints &
  typeof copilotPassiveApi.endpoints &
  typeof sessionManifestApi.endpoints;

export const api = rootApi as typeof rootApi & { endpoints: Run4Endpoints };
export { RUN2_TAG_TYPES, type AppVersionProof };
