import React, { useEffect, useState } from 'react';
import { branchesApi } from '../api/branches.endpoint';
import { ensureLocalRepoApi } from '../api/ensureLocalRepo.endpoint';
import { gitApi } from '../api/git.endpoint';
import { repositoriesApi } from '../api/repositories.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { branchSessionsLoaded, repositoryBrowseReset, repositorySelected, workspaceEntered, type RepositorySummary } from '../slices/workspace';
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
  const [resetToMain] = gitApi.useResetToMainMutation();
  const [checkoutBranch] = gitApi.useCheckoutBranchMutation();

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

  const resume = (repo: RepositorySummary, branch: string): void => {
    if (localPath === null) return;
    void checkoutBranch({ repositoryPath: localPath, branch }).then(() =>
      dispatch(workspaceEntered({ repo: { ...repo, path: localPath }, branch }))
    );
  };

  // "Start a new session": reset to a clean default branch from origin, then hand
  // off to spec-kit (which creates its OWN branch). The app does NOT pre-create a
  // spec/draft-* branch here.
  const startNew = (repo: RepositorySummary): void => {
    if (localPath === null) return;
    void resetToMain({ repositoryPath: localPath, defaultBranch: repo.defaultBranch })
      .unwrap()
      .then((result) => dispatch(workspaceEntered({ repo: { ...repo, path: localPath }, branch: result.branch })))
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
