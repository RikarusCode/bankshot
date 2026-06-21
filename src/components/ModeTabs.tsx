import type { Mode } from "../game/types";

type ModeTabsProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  return (
    <nav className="mode-tabs" aria-label="Bankshot modes">
      {(["daily", "custom", "editor"] as Mode[]).map((item) => (
        <button key={item} className={mode === item ? "active" : ""} onClick={() => onModeChange(item)}>
          {item === "daily" ? "Daily" : item === "custom" ? "Custom" : "Editor"}
        </button>
      ))}
    </nav>
  );
}
