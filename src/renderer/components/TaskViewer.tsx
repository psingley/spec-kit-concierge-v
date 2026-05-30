import React from 'react';
import type { ParsedTask } from '../api/tasksDetail.factory';

export const TaskViewer = ({ tasks }: { tasks: ParsedTask[] }): React.ReactElement => {
  return (
    <div className="task-viewer" aria-label="Task detail">
      {tasks.map((task) => (
        <div key={task.id} className="task-row">
          <strong>{task.id}</strong>
          <span>{task.title}</span>
          {task.phase !== undefined ? <span className="meta">{task.phase}</span> : null}
          {task.files.length > 0 ? <span className="meta">{task.files.join(', ')}</span> : null}
          {task.dependencies.length > 0 ? <span className="meta">deps {task.dependencies.join(', ')}</span> : null}
          {task.acceptance !== undefined ? <span className="meta">{task.acceptance}</span> : null}
        </div>
      ))}
    </div>
  );
};
