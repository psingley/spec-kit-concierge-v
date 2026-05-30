import React from 'react';
import type { ParsedTask } from '../api/tasksDetail.factory';
import type { PassiveStepName, PassiveStepRecord } from '../slices/session';
import { Ico } from './Icons';
import { ArtifactViewer } from './ArtifactViewer';
import { StatusStep, type StatusStepRow } from './StatusStep';

export type PassiveStepProps = {
  step: PassiveStepName;
  record: PassiveStepRecord;
  artifactPath: string | null;
  artifactText: string;
  artifactLoading: boolean;
  artifactError?: string;
  artifactTasks?: ParsedTask[];
  onRun: () => void;
  onArtifactOpen: (path: string) => void;
  onArtifactClose: () => void;
};

const stepNumber: Record<PassiveStepName, string> = { plan: '3', tasks: '4', analyze: '5' };
const stepLabel: Record<PassiveStepName, string> = { plan: 'Plan', tasks: 'Tasks', analyze: 'Analyze' };

export const PassiveStep = ({
  step,
  record,
  artifactPath,
  artifactText,
  artifactLoading,
  artifactError,
  artifactTasks,
  onRun,
  onArtifactOpen,
  onArtifactClose
}: PassiveStepProps): React.ReactElement => {
  const rows: StatusStepRow[] = [
    ...record.artifacts.map((artifact): StatusStepRow => ({ kind: 'artifact', artifact })),
    ...record.milestones.map((milestone): StatusStepRow => ({ kind: 'milestone', milestone }))
  ];
  return (
    <section className="passive-step" aria-labelledby={`${step}-heading`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step {stepNumber[step]}</p>
          <h2 id={`${step}-heading`}>{stepLabel[step]}</h2>
        </div>
        <button type="button" className="btn primary" onClick={onRun} disabled={record.running}>
          {record.running ? <><span className="spinner tiny" />Running</> : <><Ico.Sparkles size={13} />Run {stepLabel[step]}</>}
        </button>
      </div>
      <div className="clarify-shell">
        {record.running ? (
          <div className="clarify-card" role="status" aria-live="polite">
            <div className="spinner" data-vd-role="spinner" />
            <strong>{stepLabel[step]} is running in the background.</strong>
            <span>Navigate freely; the stepper and activity rail keep this step in-flight.</span>
          </div>
        ) : record.commitSha !== null ? (
          <div className="clarify-card">
            <p className="eyebrow">Pass</p>
            <h3>{stepLabel[step]} completed</h3>
            <p className="meta">{record.commitSha}</p>
          </div>
        ) : (
          <div className="clarify-card empty">
            <p>{stepLabel[step]} is ready when the prior step is complete.</p>
          </div>
        )}
        {rows.length > 0 ? <StatusStep step={step} rows={rows} onArtifactOpen={onArtifactOpen} /> : null}
        {record.failureReason !== null ? (
          <div className="inline-warning" role="alert">
            {record.failureReason.includes('hang') ? 'The agent appears hung. Cancel in the terminal or restart the step from here after the process stops.' : record.failureReason}
          </div>
        ) : null}
      </div>
      <ArtifactViewer path={artifactPath} text={artifactText} loading={artifactLoading} error={artifactError} tasks={artifactTasks} onClose={onArtifactClose} />
    </section>
  );
};
