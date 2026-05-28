import React from 'react';
import { Ico } from './Icons';

export const AboutModal = ({ open, onClose, repo }: { open: boolean; onClose: () => void; repo: string; branch: string }): React.ReactElement | null =>
  open ? (
    <div className="modal-veil" data-vd-role="modal-veil" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="About Concierge" className="modal about-modal" data-vd-role="modal-veil" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <Ico.Sparkles size={13} />
          <h2 id="about-title">Spec-kit Concierge</h2>
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={onClose}><Ico.X size={13} /></button>
        </div>
        <div className="modal-body">
          <div className="about-tagline">An Electron wrapper around GitHub Copilot CLI driving the spec-kit workflow, tuned for the Collette-travel concierge team.</div>
          <div className="kv about-kv">
            <div className="k">Version</div><div className="v">2.0.0 (2026.05.20)</div>
            <div className="k">Org</div><div className="v">collette-travel</div>
            <div className="k">Repo</div><div className="v">{repo || '—'}</div>
            <div className="k">Branch</div><div className="v">—</div>
            <div className="k">Copilot model</div><div className="v">claude-sonnet-4-5</div>
            <div className="k">spec-kit</div><div className="v">v0.9.4</div>
            <div className="k">Concierge team</div><div className="v">#concierge-triage</div>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost">Documentation</button>
          <span className="modal-foot-spacer" />
          <button type="button" className="btn primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  ) : null;
