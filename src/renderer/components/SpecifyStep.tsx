import React, { useState } from 'react';
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
  const complete = specMarkdown.trim().length > 0;
  return (
    <section className="specify-step" aria-labelledby="specify-heading">
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
      {!complete ? (
        <>
          <textarea
            aria-label="Specify prompt"
            placeholder="What do you want to build today?"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
          />
          <button type="button" className="primary" disabled={!canBegin || running} onClick={onBegin}>
            {running ? 'Specify running...' : 'Begin Specify'}
          </button>
        </>
      ) : mode === 'preview' ? (
        <Markdown text={specMarkdown} />
      ) : (
        <textarea aria-label="Specification editor" value={specMarkdown} readOnly />
      )}
      {running ? <p role="status" aria-live="polite">Specify is generating your spec...</p> : null}
      {failureReason !== null ? <p role="alert">{failureReason}</p> : null}
      {requireScroll && complete ? <p className="hint">Scroll review gate is enabled.</p> : null}
      {editorOpen ? (
        <div role="dialog" aria-modal="true" aria-labelledby="spec-editor-title" className="modal">
          <h2 id="spec-editor-title">Specification editor</h2>
          <textarea value={specMarkdown} readOnly />
          <button type="button" onClick={() => setEditorOpen(false)}>Close</button>
        </div>
      ) : null}
    </section>
  );
};
