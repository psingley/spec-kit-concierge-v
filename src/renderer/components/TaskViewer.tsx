import React from 'react';

export type ParsedTask = {
  id: string;
  title: string;
  phase?: string;
  dependencies: string[];
  files: string[];
  acceptance?: string;
};

export const parseTaskDetails = (markdown: string): ParsedTask[] => {
  let currentPhase: string | undefined;
  return markdown.split(/\r?\n/).flatMap((line): ParsedTask[] => {
    const phase = /^##+\s+(?:Phase\s+\d+\s*[-:]\s*)?(.*)$/i.exec(line);
    if (phase !== null) {
      currentPhase = phase[1]?.trim();
      return [];
    }
    const task = /^-\s+\[[ xX]\]\s+(T\d+)\s+(.*)$/.exec(line.trim());
    if (task === null) {
      return [];
    }
    const body = task[2] ?? '';
    const files = Array.from(body.matchAll(/`([^`]+\.(?:ts|tsx|md|json|css))`/g)).map((match) => match[1] ?? '').filter(Boolean);
    const dependencies = Array.from(body.matchAll(/\b(T\d+)\b/g)).map((match) => match[1] ?? '').filter((id) => id !== task[1]);
    const acceptance = /acceptance\s*:\s*(.*)$/i.exec(body)?.[1]?.trim();
    return [{
      id: task[1] ?? '',
      title: body.replace(/\s+Acceptance\s*:\s*.*$/i, '').trim(),
      phase: currentPhase,
      dependencies,
      files,
      acceptance
    }];
  });
};

export const TaskViewer = ({ markdown }: { markdown: string }): React.ReactElement => {
  const tasks = parseTaskDetails(markdown);
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
