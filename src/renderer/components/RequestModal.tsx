import React from 'react';
import { Ico } from './Icons';

export const RequestModal = ({ open, onClose }: { open: boolean; onClose: () => void }): React.ReactElement | null => {
  const [kind, setKind] = React.useState<'feature' | 'bug'>('bug');
  const [severity, setSeverity] = React.useState<'low' | 'normal' | 'high' | 'block'>('normal');
  const [title, setTitle] = React.useState('');
  const [details, setDetails] = React.useState('');

  return open ? (
    <div className="modal-veil" data-vd-role="modal-veil" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Request support" className="modal request-modal" data-vd-role="modal-veil" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <Ico.Send size={13} />
          <h2 id="request-title">Report a bug or request a feature</h2>
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={onClose}><Ico.X size={13} /></button>
        </div>
        <div className="modal-body request-body">
          <div className="field">
            <div className="label">Request type</div>
            <div className="segctl" role="group" aria-label="Request type">
              <button type="button" className={kind === 'feature' ? 'is-active' : ''} aria-pressed={kind === 'feature'} onClick={() => setKind('feature')}><Ico.Sparkles size={11} />Feature</button>
              <button type="button" className={kind === 'bug' ? 'is-active' : ''} aria-pressed={kind === 'bug'} onClick={() => setKind('bug')}><Ico.Bug size={11} />Bug</button>
            </div>
          </div>

          <label className="field">
            <span className="label">Title</span>
            <input
              value={title}
              placeholder={kind === 'feature' ? 'Concise summary of the requested capability…' : 'What broke? Be specific.'}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">Details</span>
            <textarea
              value={details}
              placeholder={kind === 'feature' ? 'Who needs this? What problem does it solve? Any specific repos or flows?' : 'Steps to reproduce, expected vs actual, repo, commit, env.'}
              onChange={(event) => setDetails(event.target.value)}
            />
          </label>

          <div className="field">
            <div className="label">Severity</div>
            <div className="segctl severity-segctl" role="group" aria-label="Severity">
              <button type="button" className={severity === 'low' ? 'is-active' : ''} aria-pressed={severity === 'low'} onClick={() => setSeverity('low')}>Low</button>
              <button type="button" className={severity === 'normal' ? 'is-active' : ''} aria-pressed={severity === 'normal'} onClick={() => setSeverity('normal')}>Normal</button>
              <button type="button" className={severity === 'high' ? 'is-active' : ''} aria-pressed={severity === 'high'} onClick={() => setSeverity('high')}>High</button>
              <button type="button" className={severity === 'block' ? 'is-active' : ''} aria-pressed={severity === 'block'} onClick={() => setSeverity('block')}>Blocker</button>
            </div>
          </div>

          <div className="field">
            <div className="label">Attach context (auto)</div>
            <div className="request-tags">
              <span className="tag info"><Ico.Term size={10} />activity log (last 200 lines)</span>
              <span className="tag info"><Ico.File size={10} />current spec.md</span>
              <span className="tag"><Ico.Github size={10} />repo context</span>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <span className="request-destination">Goes to <span className="mono">#concierge-triage</span></span>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" disabled={!title.trim()}><Ico.Send size={12} />Send request</button>
        </div>
      </div>
    </div>
  ) : null;
};
