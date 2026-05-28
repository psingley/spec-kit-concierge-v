import React from 'react';

export const RequestModal = ({ open, onClose }: { open: boolean; onClose: () => void }): React.ReactElement | null =>
  open ? (
    <div role="dialog" aria-modal="true" aria-labelledby="request-title" className="modal">
      <h2 id="request-title">Request support</h2>
      <p>Request capture is scheduled for a later run.</p>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  ) : null;
