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
  viewOnly?: boolean;
  resumeLabel?: string;
  onRun: () => void;
  onResume?: () => void;
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
  viewOnly = false,
  resumeLabel,
  onRun,
  onResume,
  onArtifactOpen,
  onArtifactClose
}: PassiveStepProps): React.ReactElement => {
  const rows: StatusStepRow[] = [
    ...record.artifacts.map((artifact): StatusStepRow => ({ kind: 'artifact', artifact })),
    ...record.milestones.map((milestone): StatusStepRow => ({ kind: 'milestone', milestone }))
  ];
  const runLabel = record.failureReason !== null ? `Retry ${stepLabel[step]}` : `Run ${stepLabel[step]}`;
  return (
    <section className="passive-step" aria-labelledby={`${step}-heading`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step {stepNumber[step]}</p>
          <h2 id={`${step}-heading`}>{stepLabel[step]}</h2>
        </div>
        {viewOnly ? (
          <button type="button" className="btn ghost" disabled>
            <Ico.Check size={13} />Committed
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={onRun} disabled={record.running}>
            {record.running ? <><span className="spinner tiny" />Running</> : <><Ico.Sparkles size={13} />{runLabel}</>}
          </button>
        )}
      </div>
      <div className="clarify-shell">
        {viewOnly ? (
          <div className="inline-warning view-only-banner" role="status">
            <span>This step is committed, view only.</span>
            {onResume !== undefined && resumeLabel !== undefined ? (
              <button type="button" className="btn ghost" onClick={onResume}>Resume {resumeLabel}</button>
            ) : null}
          </div>
        ) : null}
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
        ) : record.failureReason !== null ? (
          <div className="clarify-card empty">
            <p>{stepLabel[step]} attempted and failed. Review the details below, then retry.</p>
          </div>
        ) : (
          <div className="clarify-card empty">
            <p>{stepLabel[step]} is ready when the prior step is complete.</p>
          </div>
        )}
        {rows.length > 0 ? <StatusStep step={step} rows={rows} onArtifactOpen={onArtifactOpen} /> : null}
        {record.failureReason !== null ? (
          <div className="inline-warning" role="alert">
            {record.failureReason.includes('hang') ? 'No recent output - the step may be stuck.' : `${stepLabel[step]} attempted and failed: ${record.failureReason}`}
          </div>
        ) : null}
      </div>
      <ArtifactViewer path={artifactPath} text={artifactText} loading={artifactLoading} error={artifactError} tasks={artifactTasks} onClose={onArtifactClose} />
    </section>
  );
};
