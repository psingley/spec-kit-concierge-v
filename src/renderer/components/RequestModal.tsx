import React from 'react';

export const RequestModal = ({ open, onClose }: { open: boolean; onClose: () => void }): React.ReactElement | null =>
  open ? (
    <div role="dialog" aria-modal="true" aria-labelledby="request-title" className="modal">
      <h2 id="request-title">Request support</h2>
      <section className="modal-section">
        <p>Request capture is scheduled for Run 12.</p>
        <textarea aria-label="Request details" value="Stub only for Run 6.5 visual verification." readOnly />
      </section>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  ) : null;
