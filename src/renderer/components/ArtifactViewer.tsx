import React from 'react';
import type { ParsedTask } from '../api/tasksDetail.factory';
import { Markdown } from './Markdown';
import { TaskViewer } from './TaskViewer';
import { Ico } from './Icons';

export type ArtifactViewerProps = {
  path: string | null;
  text: string;
  loading: boolean;
  error?: string;
  tasks?: ParsedTask[];
  onClose: () => void;
  closeButtonRef?: React.Ref<HTMLButtonElement>;
};

export const ArtifactViewer = ({ path, text, loading, error, tasks = [], onClose, closeButtonRef }: ArtifactViewerProps): React.ReactElement | null => {
  if (path === null) {
    return null;
  }
  const isMarkdown = path.endsWith('.md');
  const isTasks = path.endsWith('tasks.md');
  return (
    <div className="modal-veil" data-vd-role="modal-veil" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="artifact-viewer-title"
        className="modal artifact-viewer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <Ico.File size={13} />
          <h2 id="artifact-viewer-title">{path}</h2>
          <button ref={closeButtonRef} type="button" className="icon-btn" aria-label="Close artifact viewer" onClick={onClose}>
            <Ico.X size={13} />
          </button>
        </div>
        <div className="modal-body artifact-viewer-body">
          {loading ? <p role="status">Loading artifact...</p> : error !== undefined ? <p role="alert">{error}</p> : isTasks ? (
            <TaskViewer tasks={tasks} />
          ) : isMarkdown ? (
            <div className="md-preview"><Markdown text={text} /></div>
          ) : (
            <pre>{text}</pre>
          )}
        </div>
      </div>
    </div>
  );
};
