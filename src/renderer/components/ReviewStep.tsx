import React from 'react';
import type { ReviewEvidence } from '../api/reviewEvidence.factory';
import { Ico } from './Icons';

export type ReviewStepProps = {
  evidence?: ReviewEvidence;
  loading: boolean;
  error?: string;
  nudgeControl?: React.ReactNode;
  auditSummary?: string[];
  onArtifactOpen: (path: string) => void;
};

export const ReviewStep = ({
  evidence,
  loading,
  error,
  nudgeControl,
  auditSummary = [],
  onArtifactOpen
}: ReviewStepProps): React.ReactElement => {
  const taskArtifact = evidence?.artifacts.find((artifact) => artifact.path.endsWith('tasks.md'));

  return (
    <section className="review-step" aria-labelledby="review-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 6</p>
          <h2 id="review-heading">Review</h2>
        </div>
        <span className="status-chip">Inspection</span>
      </div>
      <div className="review-grid">
        <section className="review-panel" aria-label="Pipeline evidence">
          <div className="panel-heading">
            <h3>Evidence</h3>
            <span>{evidence?.artifacts.length ?? 0} artifacts</span>
          </div>
          {loading ? <p className="meta">Loading disk evidence...</p> : null}
          {error !== undefined ? <div className="inline-warning" role="alert">{error}</div> : null}
          <div className="evidence-list">
            {(evidence?.artifacts ?? []).map((artifact) => (
              <button
                key={`${artifact.step}-${artifact.commitSha}-${artifact.path}`}
                type="button"
                className="evidence-row"
                onClick={() => onArtifactOpen(artifact.path)}
              >
                <Ico.File size={14} />
                <span>
                  <strong>{artifact.path}</strong>
                  <small>{artifact.step} · {artifact.required ? 'required' : 'optional'} · {artifact.commitSha.slice(0, 7)}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="review-panel" aria-label="Clarifications">
          <div className="panel-heading">
            <h3>Clarifications</h3>
            <span>{evidence?.clarifications.length ?? 0}</span>
          </div>
          {(evidence?.clarifications ?? []).map((item) => (
            <div className="clarification-row" key={`${item.session}-${item.question}`}>
              <small>{item.session}</small>
              <strong>{item.question}</strong>
              <p>{item.answer}</p>
            </div>
          ))}
        </section>
        <section className="review-panel" aria-label="Analyze report">
          <div className="panel-heading">
            <h3>Analyze</h3>
            <span>{evidence?.analyzeReport?.extractionStatus ?? 'not captured'}</span>
          </div>
          <p className="meta">{evidence?.analyzeReport?.path ?? 'No app-owned analyze report is indexed for the Analyze commit.'}</p>
        </section>
        <section className="review-panel" aria-label="Manifest recovery">
          <div className="panel-heading">
            <h3>Recovery</h3>
            <span>{auditSummary.length}</span>
          </div>
          {nudgeControl}
          {auditSummary.map((item) => <p className="meta" key={item}>{item}</p>)}
        </section>
        <section className="review-panel" aria-label="Tasks">
          <div className="panel-heading">
            <h3>Tasks</h3>
            {taskArtifact !== undefined ? (
              <button type="button" className="btn ghost" onClick={() => onArtifactOpen(taskArtifact.path)}>
                <Ico.Check size={13} />Open
              </button>
            ) : <span>none</span>}
          </div>
        </section>
      </div>
    </section>
  );
};
