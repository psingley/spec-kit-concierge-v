import React from 'react';
import type { ParsedTask } from '../api/tasksDetail.factory';
import { Markdown } from './Markdown';
import { TaskViewer } from './TaskViewer';

export type ArtifactViewerProps = {
  path: string | null;
  text: string;
  loading: boolean;
  error?: string;
  tasks?: ParsedTask[];
  onClose: () => void;
};

export const ArtifactViewer = ({ path, text, loading, error, tasks = [], onClose }: ArtifactViewerProps): React.ReactElement | null => {
  if (path === null) {
    return null;
  }
  const isMarkdown = path.endsWith('.md');
  const isTasks = path.endsWith('tasks.md');
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="artifact-viewer-title" className="modal artifact-viewer">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Artifact</p>
          <h2 id="artifact-viewer-title">{path}</h2>
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>Close</button>
      </div>
      {loading ? <p role="status">Loading artifact...</p> : error !== undefined ? <p role="alert">{error}</p> : isTasks ? (
        <TaskViewer tasks={tasks} />
      ) : isMarkdown ? (
        <div className="md-preview"><Markdown text={text} /></div>
      ) : (
        <pre>{text}</pre>
      )}
    </div>
  );
};
