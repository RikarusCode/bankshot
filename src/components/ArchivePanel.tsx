import { useEffect, useState } from "react";
import { fetchAdminPuzzle, fetchArchive, fetchArchivePuzzle, loginAdmin, logoutAdmin, saveArchivePuzzle } from "../game/archiveApi";
import { displayDate } from "../game/daily";
import { parsePuzzleJson, serializePuzzle } from "../game/puzzleExport";
import type { ArchiveEntry, PuzzleConfig } from "../game/types";

type ArchivePanelProps = {
  selectedDate?: string;
  onPlayPuzzle: (puzzle: PuzzleConfig, date: string) => void;
};

type EditState = {
  date: string;
  text: string;
};

export function ArchivePanel({ selectedDate, onPlayPuzzle }: ArchivePanelProps) {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [newDate, setNewDate] = useState("");
  const [editing, setEditing] = useState<EditState | undefined>();
  const [errors, setErrors] = useState<string[]>([]);

  async function loadArchive() {
    setLoading(true);
    setMessage("");
    const result = await fetchArchive();
    if (result.data) {
      setToday(result.data.today);
      setNewDate((current) => current || result.data?.today || "");
      setEntries(result.data.entries);
    } else {
      setMessage(result.error ?? "Could not load archive.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadArchive();
  }, []);

  async function playEntry(entry: ArchiveEntry) {
    if (entry.puzzle) {
      onPlayPuzzle(entry.puzzle, entry.date);
      return;
    }
    const result = await fetchArchivePuzzle(entry.date);
    if (result.data) onPlayPuzzle(result.data.puzzle, entry.date);
    else setMessage(result.error ?? "That puzzle is not available yet.");
  }

  async function unlockAdmin() {
    setErrors([]);
    const result = await loginAdmin(password);
    if (result.data) {
      setAdminUnlocked(true);
      setPassword("");
      setMessage("Archive editing unlocked.");
    } else {
      setErrors([result.error ?? "Password was not accepted."]);
    }
  }

  async function lockAdmin() {
    await logoutAdmin();
    setAdminUnlocked(false);
    setEditing(undefined);
    setMessage("Archive editing locked.");
  }

  async function startEdit(entry: ArchiveEntry) {
    setErrors([]);
    setMessage("");
    if (adminUnlocked && !entry.puzzle) {
      const result = await fetchAdminPuzzle(entry.date);
      if (result.data) {
        setEditing({ date: entry.date, text: serializePuzzle(result.data.puzzle) });
        return;
      }
      if (result.status !== 404) setErrors([result.error ?? "Could not load private puzzle JSON."]);
    }
    setEditing({
      date: entry.date,
      text: entry.puzzle ? serializePuzzle(entry.puzzle) : ""
    });
  }

  function startEditDate(date: string) {
    if (!date.trim()) return;
    setErrors([]);
    setMessage("");
    setEditing({ date: date.trim(), text: "" });
  }

  async function saveEdit() {
    if (!editing) return;
    const parsed = parsePuzzleJson(editing.text);
    setErrors(parsed.errors);
    if (!parsed.puzzle || parsed.errors.length > 0) return;

    const result = await saveArchivePuzzle(editing.date, parsed.puzzle);
    if (result.data) {
      setEditing(undefined);
      setMessage(`Saved Bankshot ${displayDate(editing.date)}.`);
      await loadArchive();
    } else {
      setErrors([result.error ?? "Could not save puzzle."]);
    }
  }

  return (
    <section className="archive-panel">
      <div className="panel-heading">
        <div>
          <h2>Archive</h2>
          {today && <p>Daily date: {displayDate(today)}</p>}
        </div>
        <button onClick={loadArchive} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="archive-note">Loading archive...</p>
      ) : (
        <div className="archive-list">
          {entries.map((entry) => (
            <article key={entry.date} className={`archive-row ${selectedDate === entry.date ? "active" : ""}`}>
              <div>
                <strong>#{entry.number}</strong>
                <span>{displayDate(entry.date)}</span>
                <small>{entry.status === "available" ? entry.title ?? "Bankshot" : entry.status === "locked" ? "Locked" : "Missing puzzle"}</small>
              </div>
              <div className="archive-actions">
                <button onClick={() => playEntry(entry)} disabled={entry.status !== "available"}>
                  Play
                </button>
                <button onClick={() => void startEdit(entry)}>View JSON</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="archive-admin">
        {adminUnlocked ? (
          <>
            <input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} />
            <button onClick={() => startEditDate(newDate)} disabled={!newDate}>
              Edit Puzzle
            </button>
            <button onClick={lockAdmin}>Lock</button>
          </>
        ) : (
          <>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" />
            <button onClick={unlockAdmin} disabled={!password.trim()}>
              Unlock
            </button>
          </>
        )}
      </div>

      {editing && (
        <div className="archive-editor">
          <div className="panel-heading">
            <h2>Edit {displayDate(editing.date)}</h2>
            <button onClick={() => setEditing(undefined)}>Close</button>
          </div>
          <textarea value={editing.text} onChange={(event) => setEditing({ ...editing, text: event.target.value })} spellCheck={false} placeholder="Paste full puzzle JSON here." />
          <button className="primary" onClick={saveEdit} disabled={!adminUnlocked}>
            Publish Edits
          </button>
        </div>
      )}

      {message && <p className="archive-note">{message}</p>}
      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
