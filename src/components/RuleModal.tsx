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
          <p className="eyebrow">How to play</p>
          <h2>Bankshot Rules</h2>
          <p>Place pieces from your backpack, press Shoot, and guide the 8-ball into the pocket in as few attempts as possible.</p>
        </div>

        <div className="rules-grid">
          <section className="rule-card">
            <h3>Turn Flow</h3>
            <p>The board is deterministic. The ball moves along grid lanes in the four cardinal directions, with no random physics.</p>
            <p>Drag or tap backpack pieces onto open table cells. You can move them or drag them back into the backpack before shooting.</p>
          </section>

          <section className="rule-card">
            <h3>Pockets</h3>
            <p>Pockets sit in the rail outside the grid. The ball must enter a pocket directly from the matching row or column.</p>
            <p>A side pocket on the right, for example, only accepts a ball moving left to right into that rail slot.</p>
          </section>
        </div>

        <section className="piece-rules">
          <h3>Pieces</h3>
          <div className="piece-rule">
            <RuleIcon>
              <span className="piece player-piece slash-wall" />
            </RuleIcon>
            <div>
              <strong>Rail</strong>
              <p>Turns the ball 90 degrees based on its angle. Rails may be fixed on the table or supplied in the backpack.</p>
            </div>
          </div>
          <div className="piece-rule">
            <RuleIcon>
              <span className="piece fixed-piece block" />
            </RuleIcon>
            <div>
              <strong>Block</strong>
              <p>Bounces the ball straight back. Blocks can be fixed or placed if a puzzle includes them in the backpack.</p>
            </div>
          </div>
          <div className="piece-rule">
            <RuleIcon>
              <span className="piece fixed-piece glass" />
            </RuleIcon>
            <div>
              <strong>Glass piece</strong>
              <p>Works once during a shot, then disappears for the rest of that shot. Glass resets on the next attempt.</p>
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
 
