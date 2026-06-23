type RuleModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RuleModal({ open, onClose }: RuleModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Rules">
      <div className="modal">
        <button className="icon-button close" onClick={onClose} aria-label="Close rules">
          X
        </button>
        <h2>Bankshot Rules</h2>
        <p>Place your limited bumpers, then shoot. The 8-ball rolls one square at a time in straight grid lines.</p>
        <p>The ball enters an obstacle square, hits the obstacle, and turns. Rails and solid blocks bounce it back. Glass pieces work once during a shot, then reset on the next attempt.</p>
        <p>The goal is to enter the pocket on the edge in as few attempts as possible.</p>
      </div>
    </div>
  );
}
 