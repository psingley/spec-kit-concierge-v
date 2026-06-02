import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { artifactsApi } from '../api/artifacts.endpoint';
import { reviewEvidenceApi } from '../api/reviewEvidence.endpoint';
import { tasksDetailApi } from '../api/tasksDetail.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { modalClosed } from '../slices/ui';
import { selectUiArtifactViewerPath, selectUiShowArtifactViewer } from '../slices/ui.selectors';
import { selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { ArtifactViewer } from './ArtifactViewer';

const isAbsoluteArtifactPath = (value: string): boolean =>
  value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\');

type RequestKind = 'artifact' | 'reviewEvidenceBody' | 'tasksDetail';

const requestKindForPath = (path: string): RequestKind =>
  path.endsWith('tasks.md') ? 'tasksDetail' : isAbsoluteArtifactPath(path) ? 'reviewEvidenceBody' : 'artifact';

export const ArtifactViewerModalContainer = (): React.ReactElement | null => {
  const dispatch = useAppDispatch();
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const open = useAppSelector(selectUiShowArtifactViewer);
  const artifactPath = useAppSelector(selectUiArtifactViewerPath);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const [readArtifact, artifact] = artifactsApi.useLazyReadArtifactQuery();
  const [readReviewEvidenceBody, reviewEvidenceBody] = reviewEvidenceApi.useLazyReadReviewEvidenceBodyQuery();
  const [readTasksDetail, tasksDetail] = tasksDetailApi.useLazyGetTasksDetailQuery();
  const request = useMemo(() => {
    if (!open || artifactPath === null || repo === null) return null;
    return {
      repositoryPath: repo.path,
      artifactPath,
      kind: requestKindForPath(artifactPath)
    };
  }, [artifactPath, open, repo]);

  const close = useCallback((): void => {
    dispatch(modalClosed('showArtifactViewer'));
  }, [dispatch]);

  useEffect(() => {
    if (request === null) return;
    if (request.kind === 'tasksDetail') {
      void readTasksDetail({ repositoryPath: request.repositoryPath, artifactPath: request.artifactPath });
    } else if (request.kind === 'reviewEvidenceBody') {
      void readReviewEvidenceBody({ repositoryPath: request.repositoryPath, artifactPath: request.artifactPath });
    } else {
      void readArtifact({ repositoryPath: request.repositoryPath, artifactPath: request.artifactPath });
    }
  }, [readArtifact, readReviewEvidenceBody, readTasksDetail, request]);

  useLayoutEffect(() => {
    if (open && !wasOpenRef.current) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      closeButtonRef.current?.focus();
    }
    if (!open && wasOpenRef.current) {
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close, open]);

  if (!open || artifactPath === null) {
    return null;
  }

  const requestKind = requestKindForPath(artifactPath);
  const loading =
    request === null ||
    (requestKind === 'tasksDetail'
      ? tasksDetail.isFetching || (tasksDetail.data === undefined && tasksDetail.error === undefined)
      : requestKind === 'reviewEvidenceBody'
        ? reviewEvidenceBody.isFetching || (reviewEvidenceBody.data === undefined && reviewEvidenceBody.error === undefined)
        : artifact.isFetching || (artifact.data === undefined && artifact.error === undefined));
  const error = (
    requestKind === 'tasksDetail'
      ? tasksDetail.error
      : requestKind === 'reviewEvidenceBody'
        ? reviewEvidenceBody.error
        : artifact.error
  ) !== undefined ? 'Unable to read artifact.' : undefined;
  const text = requestKind === 'tasksDetail' ? '' : requestKind === 'reviewEvidenceBody' ? reviewEvidenceBody.data?.text ?? '' : artifact.data?.text ?? '';

  return (
    <ArtifactViewer
      path={artifactPath}
      text={text}
      loading={loading}
      error={error}
      tasks={tasksDetail.data?.tasks ?? []}
      closeButtonRef={closeButtonRef}
      onClose={close}
    />
  );
};
