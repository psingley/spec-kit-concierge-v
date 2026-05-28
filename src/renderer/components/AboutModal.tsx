import React from 'react';

export const AboutModal = ({ open, onClose, repo, branch }: { open: boolean; onClose: () => void; repo: string; branch: string }): React.ReactElement | null =>
  open ? (
    <div role="dialog" aria-modal="true" aria-labelledby="about-title" className="modal">
      <h2 id="about-title">About Concierge</h2>
      <p>{repo} on {branch}</p>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  ) : null;
