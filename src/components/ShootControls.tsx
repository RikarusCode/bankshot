type ShootControlsProps = {
  animating: boolean;
  disabled: boolean;
  onShoot: () => void;
  onClear: () => void;
  onResetBall: () => void;
};

export function ShootControls({ animating, disabled, onShoot, onClear, onResetBall }: ShootControlsProps) {
  return (
    <section className="shoot-controls">
      <button className="primary" onClick={onShoot} disabled={disabled || animating}>
        Shoot
      </button>
      <button onClick={onClear}>
        Clear Table
      </button>
      <button onClick={onResetBall}>
        Reset Shot
      </button>
    </section>
  );
}
