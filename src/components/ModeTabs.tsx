import type { Mode } from "../game/types";

type ModeTabsProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  return (
    <nav className="mode-tabs" aria-label="Bankshot modes">
      {(["daily", "archive", "custom", "editor"] as Mode[]).map((item) => (
        <button key={item} className={mode === item ? "active" : ""} onClick={() => onModeChange(item)} aria-current={mode === item ? "page" : undefined}>
          {item === "daily" ? "Daily" : item === "archive" ? "Archive" : item === "custom" ? "Custom" : "Editor"}
        </button>
      ))}
    </nav>
  );
}
