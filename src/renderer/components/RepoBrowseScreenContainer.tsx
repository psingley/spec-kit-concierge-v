import React, { useEffect } from 'react';
import { branchesApi } from '../api/branches.endpoint';
import { gitApi } from '../api/git.endpoint';
import { repositoriesApi } from '../api/repositories.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { branchSessionsLoaded, repositoryBrowseReset, repositorySelected, workspaceEntered, type RepositorySummary } from '../slices/workspace';
import { selectWorkspaceSelectedRepo, selectWorkspaceSessions } from '../slices/workspace.selectors';
import { RepoBrowseScreen } from './RepoBrowseScreen';

export const RepoBrowseScreenContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const selectedRepo = useAppSelector(selectWorkspaceSelectedRepo);
  const sessions = useAppSelector(selectWorkspaceSessions);
  const repos = repositoriesApi.useListReposQuery();
  const branchSessions = branchesApi.useListBranchSessionsQuery(
    { repositoryPath: selectedRepo?.path ?? '' },
    { skip: selectedRepo === null }
  );
  const [createDraftBranch] = gitApi.useCreateDraftBranchMutation();
  const [checkoutBranch] = gitApi.useCheckoutBranchMutation();

  useEffect(() => {
    if (branchSessions.data !== undefined) {
      dispatch(branchSessionsLoaded(branchSessions.data.sessions));
    }
  }, [branchSessions.data, dispatch]);

  const resume = (repo: RepositorySummary, branch: string): void => {
    void checkoutBranch({ repositoryPath: repo.path, branch }).then(() => dispatch(workspaceEntered({ repo, branch })));
  };

  return (
    <RepoBrowseScreen
      repositories={repos.data?.repositories ?? []}
      sessions={sessions}
      selectedRepo={selectedRepo}
      loading={repos.isLoading}
      error={repos.isError}
      onSelectRepo={(repo) => dispatch(repositorySelected(repo))}
      onResume={resume}
      onStartNew={(repo) => void createDraftBranch({ repo })}
      onBackToRepos={() => dispatch(repositoryBrowseReset())}
    />
  );
};
