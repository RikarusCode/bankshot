import type { ReactNode } from "react";

type RuleModalProps = {
  open: boolean;
  onClose: () => void;
};

function RuleIcon({ children }: { children: ReactNode }) {
  return (
    <span className="rule-icon" aria-hidden="true">
      {children}
    </span>
  );
}

export function RuleModal({ open, onClose }: RuleModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Rules">
      <div className="modal rules-modal">
        <button className="icon-button close" onClick={onClose} aria-label="Close rules">
          X
        </button>
        <div className="rules-header">
          <h2>How to Play</h2>
          <p>Place pieces from your backpack to guide the 8-ball into the pocket.</p>
        </div>

        <section className="piece-rules">
          <h3>Pieces</h3>
          <div className="piece-rule">
            <RuleIcon>
              <span className="piece player-piece slash-wall" />
            </RuleIcon>
            <div>
              <strong>Rail</strong>
              <p>Turns the ball 90 degrees.</p>
            </div>
          </div>
          <div className="piece-rule">
            <RuleIcon>
              <span className="piece fixed-piece block" />
            </RuleIcon>
            <div>
              <strong>Block</strong>
              <p>Bounces the ball straight back.</p>
            </div>
          </div>
          <div className="piece-rule">
            <RuleIcon>
              <span className="piece fixed-piece glass" />
            </RuleIcon>
            <div>
              <strong>Glass piece</strong>
              <p>Shatters upon impact, bouncing the ball once before disappearing. Glass resets on the next attempt.</p>
            </div>
          </div>
          <div className="piece-rule">
            <RuleIcon>
              <span className="piece fixed-piece gate gate-slash gate-pass-ne" />
            </RuleIcon>
            <div>
              <strong>Gate</strong>
              <p>The green side lets the ball pass through. Yellow approaches bounce using the gate's rail angle.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
 
