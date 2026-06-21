import type { SimulationResult } from "../game/types";

type ResultPanelProps = {
  result?: SimulationResult;
};

export function ResultPanel({ result }: ResultPanelProps) {
  if (!result) return <section className="result-panel idle">Plan the shot, then press Shoot.</section>;

  const copy = {
    win: "Pocketed. That route was clean.",
    loop: "Loop detected. The ball cycled several times before the table froze."
  }[result.status];

  return (
    <section className={`result-panel ${result.status}`}>
      <strong>{result.status.toUpperCase()}</strong>
      <span>{copy}</span>
      <span>{result.bounces} bounce{result.bounces === 1 ? "" : "s"}</span>
    </section>
  );
}
