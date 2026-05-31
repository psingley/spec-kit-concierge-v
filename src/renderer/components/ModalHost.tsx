import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { modalClosed } from '../slices/ui';
import { selectUiShowAbout, selectUiShowRequest } from '../slices/ui.selectors';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { AboutModal } from './AboutModal';
import { CustomizeModalContainer } from './CustomizeModalContainer';
import { RequestModal } from './RequestModal';

export const ModalHost = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const branch = useAppSelector(selectWorkspaceBranch);
  return (
    <>
      <CustomizeModalContainer />
      <AboutModal open={useAppSelector(selectUiShowAbout)} onClose={() => dispatch(modalClosed('showAbout'))} repo={repo?.name ?? 'No repo'} branch={branch ?? 'No branch'} />
      <RequestModal open={useAppSelector(selectUiShowRequest)} onClose={() => dispatch(modalClosed('showRequest'))} />
    </>
  );
};
