type ShootControlsProps = {
  animating: boolean;
  solved: boolean;
  onShoot: () => void;
  onClear: () => void;
  onResetBall: () => void;
};

export function ShootControls({ animating, solved, onShoot, onClear, onResetBall }: ShootControlsProps) {
  return (
    <section className="shoot-controls">
      <button className="primary" onClick={onShoot} disabled={animating || solved}>
        Shoot
      </button>
      <button onClick={onClear} disabled={solved && !animating}>
        Clear Table
      </button>
      <button onClick={onResetBall} disabled={solved && !animating}>
        Reset Ball
      </button>
    </section>
  );
}
