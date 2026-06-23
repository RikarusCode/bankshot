import { useEffect, useState } from "react";
import { parsePuzzleJson, serializePuzzle } from "../game/puzzleExport";
import type { PuzzleConfig } from "../game/types";

type PuzzleImportExportProps = {
  puzzle: PuzzleConfig;
  onImport: (puzzle: PuzzleConfig) => void;
};

export function PuzzleImportExport({ puzzle, onImport }: PuzzleImportExportProps) {
  const [text, setText] = useState(serializePuzzle(puzzle));
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setText(serializePuzzle(puzzle));
    setErrors([]);
  }, [puzzle]);

  function importPuzzle() {
    const parsed = parsePuzzleJson(text);
    setErrors(parsed.errors);
    if (parsed.puzzle && parsed.errors.length === 0) onImport(parsed.puzzle);
  }

  async function copyCurrent() {
    await navigator.clipboard.writeText(serializePuzzle(puzzle));
  }

  return (
    <section className="import-export">
      <div className="panel-heading">
        <h2>Custom Puzzle</h2>
        <button onClick={copyCurrent}>Copy Current JSON</button>
      </div>
      <textarea value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} />
      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <button className="primary" onClick={importPuzzle}>
        Import And Play
      </button>
    </section>
  );
}
