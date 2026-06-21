import { useState } from "react";

type ShareButtonProps = {
  text: string;
  disabled?: boolean;
};

export function ShareButton({ text, disabled = false }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button onClick={copy} disabled={disabled} className="share-button">
      {copied ? "Copied" : "Share"}
    </button>
  );
}
