import React, { useRef, useState } from 'react';
import { Ico } from './Icons';
import { Markdown } from './Markdown';

export type SpecifyStepProps = {
  prompt: string;
  running: boolean;
  specMarkdown: string;
  failureReason: string | null;
  canBegin: boolean;
  requireScroll: boolean;
  onPromptChange: (prompt: string) => void;
  onBegin: () => void;
};

export const SpecifyStep = ({
  prompt,
  running,
  specMarkdown,
  failureReason,
  canBegin,
  requireScroll,
  onPromptChange,
  onBegin
}: SpecifyStepProps): React.ReactElement => {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [editorOpen, setEditorOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(requireScroll ? 0 : 100);
  const reviewRef = useRef<HTMLDivElement | null>(null);
  const complete = specMarkdown.trim().length > 0;
  const gateUnlocked = !requireScroll || scrollProgress >= 100;
  const updateScrollProgress = (): void => {
    const node = reviewRef.current;
    if (node === null) return;
    const scrollable = node.scrollHeight - node.clientHeight;
    const nextProgress = scrollable <= 0 ? 100 : Math.min(100, Math.round((node.scrollTop / scrollable) * 100));
    setScrollProgress(nextProgress);
  };

  return (
    <section className="specify-step" aria-labelledby={!complete ? 'specify-heading' : undefined} aria-label={complete ? 'Specify' : undefined}>
      {!complete ? (
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 1</p>
          <h2 id="specify-heading">Specify</h2>
        </div>
        {complete ? (
          <div className="segmented" role="group" aria-label="Specification mode">
            <button type="button" onClick={() => setMode('preview')} aria-pressed={mode === 'preview'}>Preview</button>
            <button type="button" onClick={() => setMode('edit')} aria-pressed={mode === 'edit'}>Edit</button>
            <button type="button" onClick={() => setEditorOpen(true)}>Pop out</button>
          </div>
        ) : null}
      </div>
      ) : null}
      {running && !complete ? (
        <div className="specify-shell">
          <div className="spec-loading">
            <div className="spec-loading-ring">
              <div className="spinner" data-vd-role="spinner" />
            </div>
            <div className="spec-loading-h">Specifying…</div>
            <div className="spec-loading-sub">
              Drafting <span className="mono">spec.md</span> from your prompt. Grounding against the codebase, generating goals and acceptance criteria, flagging ambiguities for the next step.
            </div>
            <div className="spec-loading-stream">
              <span className="dot" />
              <span>Watch progress in the activity stream.</span>
            </div>
          </div>
        </div>
      ) : null}
      {!complete && !running ? (
        <div className="specify-shell">
          <div className="prompt-input-card">
            <textarea
              className="prompt-input"
              aria-label="Specify prompt"
              placeholder="What do you want to build today?"
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
            />
            <span className="vd-text-mirror" aria-hidden="true">{prompt}</span>
            <div className="prompt-input-foot spec-input-actions">
              <button type="button" className="btn ghost" disabled={!prompt} onClick={() => onPromptChange('')}>Clear</button>
              <span className="prompt-input-spacer" />
              <button type="button" className="btn primary" disabled={!canBegin || running} onClick={onBegin}>
                {running ? 'Specifying...' : <><Ico.Sparkles size={13} data-vd-role="begin-sparkle" />Begin specify</>}
              </button>
            </div>
          </div>
        </div>
      ) : !running ? (
        <div className="specify-shell">
          <div className="md-panel">
            <div className="md-tabs">
              <button type="button" className={`md-tab ${mode === 'preview' ? 'is-active' : ''}`} onClick={() => setMode('preview')}>
                <Ico.Eye size={13} />Preview
              </button>
              <button type="button" className={`md-tab ${mode === 'edit' ? 'is-active' : ''}`} onClick={() => setMode('edit')}>
                <Ico.Edit size={13} />Edit
              </button>
              <div className="spacer" />
              <span className="meta">spec.md · {specMarkdown.split('\n').length} lines</span>
              <button type="button" className="md-tab icon-only" aria-label="Pop out editor" onClick={() => setEditorOpen(true)}>
                <Ico.Pop size={13} />
              </button>
            </div>
            <div className="read-progress" aria-hidden="true">
              <div className="bar" style={{ width: `${scrollProgress}%` }} />
            </div>
            {mode === 'preview' ? (
              <div ref={reviewRef} className="md-scroll" data-testid="spec-review-scroll" onScroll={updateScrollProgress}>
                <div className="md-preview">
                  <Markdown text={specMarkdown} />
                </div>
              </div>
            ) : (
              <textarea className="md-editor" aria-label="Specification editor" value={specMarkdown} readOnly />
            )}
          </div>
          <div className="advance-row">
            <div className="gate">
              <span className={`gate-icon ${gateUnlocked ? 'done' : ''}`}>{gateUnlocked ? <Ico.Check size={12} /> : scrollProgress}</span>
              <span>
                {!requireScroll
                  ? 'Read-gate disabled - Clarify is unlocked.'
                  : gateUnlocked
                    ? "You've reviewed the full spec. Ready to clarify ambiguities."
                    : 'Scroll to the end of the spec to unlock the Clarify step.'}
              </span>
            </div>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                if (mode === 'preview') {
                  reviewRef.current?.scrollTo({ top: reviewRef.current.scrollHeight, behavior: 'smooth' });
                } else {
                  setScrollProgress(100);
                }
              }}
            >
              Jump to end
            </button>
            <button type="button" className="btn primary" disabled={!gateUnlocked || running} onClick={onBegin}>
              Clarify <Ico.Right size={13} />
            </button>
          </div>
        </div>
      ) : null}
      {running ? <p role="status" aria-live="polite">Specify is generating your spec...</p> : null}
      {failureReason !== null ? <p role="alert">{failureReason}</p> : null}
      {requireScroll && complete ? <p className="hint">Scroll review gate is enabled.</p> : null}
      {editorOpen ? (
        <div role="dialog" aria-modal="true" aria-labelledby="spec-editor-title" className="modal">
          <h2 id="spec-editor-title">Specification editor</h2>
          <textarea className="md-editor" value={specMarkdown} readOnly />
          <button type="button" onClick={() => setEditorOpen(false)}>Close</button>
        </div>
      ) : null}
    </section>
  );
};
