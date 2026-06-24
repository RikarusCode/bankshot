import type { SimulationResult } from "../game/types";

type ResultPanelProps = {
  result?: SimulationResult;
};

export function ResultPanel({ result }: ResultPanelProps) {
  if (!result) return null;

  const copy = {
    win: "Pocketed. Nice shot.",
    loop: "Loop detected. Try again."
  }[result.status];

  return (
    <section className={`result-panel ${result.status}`}>
      <strong>{result.status.toUpperCase()}</strong>
      <span>{copy}</span>
      <span>{result.bounces} bounce{result.bounces === 1 ? "" : "s"}</span>
    </section>
  );
}
