import React from 'react';
import type { JiraBoardMapping, JiraBoardSuggestion, JiraProject } from '../slices/jira';
import { Ico } from './Icons';

export type JiraBoardPickerProps = {
  board: JiraBoardMapping;
  suggestions: JiraBoardSuggestion[];
  projects: JiraProject[];
  searchText: string;
  onSearch: (query: string) => void;
  onPick: (projectKey: string) => void;
  compact?: boolean;
};

const BoardRow = ({
  keyName,
  name,
  meta,
  onPick
}: {
  keyName: string;
  name?: string;
  meta?: string;
  onPick: (projectKey: string) => void;
}): React.ReactElement => (
  <button type="button" role="menuitem" className="tb-menu-row jira-board-row" onClick={() => onPick(keyName)}>
    <span className="tb-menu-row-pill mono">{keyName}</span>
    <span className="tb-menu-row-name">{name ?? keyName}</span>
    {meta !== undefined ? <span className="tb-menu-row-meta">{meta}</span> : null}
  </button>
);

export const JiraBoardPicker = ({ board, suggestions, projects, searchText, onSearch, onPick, compact = false }: JiraBoardPickerProps): React.ReactElement => (
  <div className={`jira-board-picker ${compact ? 'is-compact' : ''}`} data-vd-role="jira-board-picker">
    <div className="tb-menu-h">JIRA board for this repo</div>
    <div className="jira-current-board">
      <span>Current</span>
      <strong className="mono">{board.projectKey ?? 'Not set'}</strong>
      <small>{board.source}</small>
    </div>
    <div className="tb-menu-search">
      <Ico.Search size={12} />
      <input aria-label="Search JIRA projects" placeholder="Search projects" value={searchText} onChange={(event) => onSearch(event.currentTarget.value)} />
    </div>
    {projects.length > 0 ? (
      <>
        <div className="tb-menu-group">Search</div>
        {projects.map((project) => (
          <BoardRow key={`project-${project.key}`} keyName={project.key} name={project.name} onPick={onPick} />
        ))}
      </>
    ) : null}
    <div className="tb-menu-group">Suggested</div>
    {suggestions.length === 0 ? (
      <div className="tb-menu-empty">No recent activity, search above</div>
    ) : suggestions.map((suggestion) => (
      <BoardRow key={`suggestion-${suggestion.key}`} keyName={suggestion.key} name={suggestion.name} meta={suggestion.lastActivity} onPick={onPick} />
    ))}
  </div>
);
