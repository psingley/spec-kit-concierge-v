import React from 'react';
import type { PassiveArtifactSummary, PassiveMilestoneSummary, PassiveStepName } from '../slices/session';
import { Ico } from './Icons';

export type StatusStepRow =
  | { kind: 'artifact'; artifact: PassiveArtifactSummary }
  | { kind: 'milestone'; milestone: PassiveMilestoneSummary };

export type StatusStepProps = {
  step: PassiveStepName;
  rows: StatusStepRow[];
  onArtifactOpen: (path: string) => void;
};

const artifactSubtitle = (step: PassiveStepName, artifact: PassiveArtifactSummary): string => {
  if (step === 'analyze') {
    return 'remediation target';
  }
  return artifact.required ? 'required artifact' : `${artifact.kind} artifact`;
};

export const StatusStep = ({ step, rows, onArtifactOpen }: StatusStepProps): React.ReactElement => (
  <div className="evidence-grid" aria-label={`${step} status`}>
    {rows.map((row) => row.kind === 'artifact' ? (
      <button key={`artifact-${row.artifact.path}`} type="button" className="ev-row" onClick={() => onArtifactOpen(row.artifact.path)}>
        <span className="ev-status done"><Ico.File size={12} /></span>
        <span className="ev-main">
          <span className="ev-title">{row.artifact.path}</span>
          <span className="ev-sub">{artifactSubtitle(step, row.artifact)}</span>
        </span>
        <span className="ev-actions"><span className="tag ok">view</span></span>
      </button>
    ) : (
      <div key={`milestone-${row.milestone.id}`} className={`ev-row ${row.milestone.status === 'running' ? 'active' : ''}`}>
        <span className={`ev-status ${row.milestone.status === 'running' ? 'active' : 'done'}`}><Ico.Check size={12} /></span>
        <span className="ev-main">
          <span className="ev-title">{row.milestone.label}</span>
          <span className="ev-sub">{row.milestone.status}</span>
        </span>
        <span className="ev-actions"><span className={row.milestone.status === 'warning' ? 'tag warn' : 'tag ok'}>{row.milestone.status}</span></span>
      </div>
    ))}
  </div>
);
