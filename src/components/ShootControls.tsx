type ShootControlsProps = {
  locked: boolean;
  solved: boolean;
  onShoot: () => void;
  onClear: () => void;
  onResetShot: () => void;
};

export function ShootControls({ locked, solved, onShoot, onClear, onResetShot }: ShootControlsProps) {
  return (
    <section className="shoot-controls">
      <button className="primary" onClick={onShoot} disabled={locked || solved}>
        Shoot
      </button>
      <button onClick={onClear} disabled={locked || solved}>
        Clear Board
      </button>
      <button onClick={onResetShot} disabled={locked}>
        Reset View
      </button>
    </section>
  );
}
