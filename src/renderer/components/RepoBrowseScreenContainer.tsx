import React, { useEffect, useState } from 'react';
import { branchesApi } from '../api/branches.endpoint';
import { ensureLocalRepoApi } from '../api/ensureLocalRepo.endpoint';
import { repositoriesApi } from '../api/repositories.endpoint';
import { startSessionApi } from '../api/startSession.endpoint';
import { resumeSessionApi } from '../api/resumeSession.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { sessionRestoredFromResume } from '../slices/session';
import { stepsRestoredFromSession } from '../slices/steps';
import { branchSessionsLoaded, repositoryBrowseReset, repositorySelected, workspaceEntered, type BranchSession, type RepositorySummary } from '../slices/workspace';
import { selectWorkspaceSelectedRepo, selectWorkspaceSessions } from '../slices/workspace.selectors';
import { RepoBrowseScreen } from './RepoBrowseScreen';

const cloneUrlFor = (repo: RepositorySummary): string => `https://github.com/${repo.owner}/${repo.name}.git`;

export const RepoBrowseScreenContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const selectedRepo = useAppSelector(selectWorkspaceSelectedRepo);
  const sessions = useAppSelector(selectWorkspaceSessions);
  const repos = repositoriesApi.useListReposQuery();
  // The local, filesystem-real path the selected repo lives at (NOT the GitHub
  // slug). Resolved by repo:ensureLocal, which clones into Documents/Concierge
  // when the repo isn't present yet. All git operations run against THIS path.
  const [localPath, setLocalPath] = useState<string | null>(null);

  const [ensureLocalRepo, ensureLocalState] = ensureLocalRepoApi.useEnsureLocalRepoMutation();
  const branchSessions = branchesApi.useListBranchSessionsQuery(
    { repositoryPath: localPath ?? '' },
    { skip: localPath === null }
  );
  const [startSession] = startSessionApi.useStartSessionMutation();
  const [resumeSession] = resumeSessionApi.useResumeSessionMutation();

  useEffect(() => {
    if (branchSessions.data !== undefined) {
      dispatch(branchSessionsLoaded(branchSessions.data.sessions));
    }
  }, [branchSessions.data, dispatch]);

  const selectRepo = (repo: RepositorySummary): void => {
    setLocalPath(null);
    dispatch(repositorySelected(repo));
    void ensureLocalRepo({ owner: repo.owner, name: repo.name, cloneUrl: cloneUrlFor(repo) })
      .unwrap()
      .then((result) => setLocalPath(result.localPath))
      .catch(() => undefined);
  };

  // Resume reads the session's worktree IN PLACE (ADR-0016, Phase 2): the worktree
  // already exists on its branch, so there is NO `git checkout` in the clone (that
  // always failed for a branch used by a worktree). We point the workspace at the
  // worktree path and restore step-state from the session's recovered states.
  const resume = (repo: RepositorySummary, session: BranchSession): void => {
    dispatch(stepsRestoredFromSession({ states: session.restoredStates, commitShas: session.restoredStepCommits }));
    // Hydrate the LIVE session slice with the worktree's committed spec.md FIRST,
    // then enter the workspace. WorkspaceContainer derives Specify (complete +
    // evidence) from this slice, so without it a completed Specify would render as
    // the empty prompt. We await the read so the workspace mounts with hydrated
    // state (no flash of empty Specify). The read is graceful — an in-flight
    // session returns an empty spec and we still enter, landing on Specify.
    void resumeSession({ worktreePath: session.worktreePath })
      .unwrap()
      .then((result) => dispatch(sessionRestoredFromResume({
        specMarkdown: result.specMarkdown,
        commitSha: session.restoredStepCommits.specify ?? result.specCommitSha,
        restoredStepCommits: session.restoredStepCommits,
        restoredFailures: session.restoredFailures
      })))
      .catch(() => undefined)
      .finally(() =>
        dispatch(workspaceEntered({ repo: { ...repo, path: session.worktreePath }, branch: session.branch, restoredStates: session.restoredStates }))
      );
  };

  // "Start a new session": create an isolated DETACHED git worktree (ADR-0016),
  // then enter the workspace pointed at the WORKTREE path so all downstream git +
  // spec-kit spawns run there. No branch is pre-allocated — spec-kit's
  // before_specify hook names the real branch during specify, and branchUpdated
  // then sets the titlebar to it. Until then branch is null and the titlebar
  // falls back to the repo's default branch (no fake placeholder).
  const startNew = (repo: RepositorySummary): void => {
    if (localPath === null) return;
    void startSession({ clonePath: localPath, defaultBranch: repo.defaultBranch, description: 'new session' })
      .unwrap()
      .then((result) =>
        dispatch(workspaceEntered({ repo: { ...repo, path: result.worktreePath }, branch: null }))
      )
      .catch(() => undefined);
  };

  const cloning = ensureLocalState.isLoading;
  const cloneError = ensureLocalState.isError;

  return (
    <RepoBrowseScreen
      repositories={repos.data?.repositories ?? []}
      sessions={sessions}
      selectedRepo={selectedRepo}
      loading={repos.isLoading}
      error={repos.isError}
      cloning={cloning}
      cloneError={cloneError}
      localReady={localPath !== null}
      onSelectRepo={selectRepo}
      onResume={resume}
      onStartNew={startNew}
      onBackToRepos={() => {
        setLocalPath(null);
        dispatch(repositoryBrowseReset());
      }}
    />
  );
};
