import { useEffect, useState } from "react";
import { ExternalLink, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";

type BrowserChromeBarProps = {
  url: string;
  hasPage: boolean;
  onNavigate: (url: string) => void;
  onReload: () => void;
};

// Add a scheme when the user types a bare host so the iframe/anchor get a valid
// absolute URL. Loopback hosts default to http; everything else to https.
function normalizeInputUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const isLoopback = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(
    trimmed,
  );
  return `${isLoopback ? "http" : "https"}://${trimmed}`;
}

export function BrowserChromeBar({
  url,
  hasPage,
  onNavigate,
  onReload,
}: BrowserChromeBarProps) {
  const { t } = useTranslation("openhands");

  const [inputValue, setInputValue] = useState(url);
  const [isEditing, setIsEditing] = useState(false);

  // Keep the field in sync with auto-detected/agent-driven URL changes, but
  // never clobber what the user is actively typing.
  useEffect(() => {
    if (!isEditing) setInputValue(url);
  }, [url, isEditing]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeInputUrl(inputValue);
    if (normalized) onNavigate(normalized);
    setIsEditing(false);
  };

  const buttonBaseClassName =
    "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md";
  const enabledButtonClassName = cn(
    buttonBaseClassName,
    "text-[var(--oh-text-tertiary)] hover:bg-tertiary cursor-pointer",
  );
  const disabledButtonClassName = cn(
    buttonBaseClassName,
    "text-[var(--oh-text-tertiary)] opacity-40 cursor-not-allowed",
  );

  const iconClassName = "w-3.5 h-3.5";

  return (
    <div
      className="flex w-full min-h-[34px] shrink-0 items-center gap-1 border-b border-[var(--oh-border)] px-2 py-1.5"
      data-testid="browser-chrome-bar"
    >
      <button
        type="button"
        onClick={onReload}
        disabled={!hasPage}
        aria-label={t(I18nKey.BUTTON$REFRESH)}
        title={t(I18nKey.BUTTON$REFRESH)}
        data-testid="browser-chrome-reload"
        className={hasPage ? enabledButtonClassName : disabledButtonClassName}
      >
        <RotateCw className={iconClassName} aria-hidden strokeWidth={2} />
      </button>

      <form onSubmit={handleSubmit} className="flex min-w-0 flex-1">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={t(I18nKey.BROWSER$ADDRESS_BAR_LABEL)}
          placeholder={t(I18nKey.BROWSER$ADDRESS_BAR_LABEL)}
          data-testid="browser-chrome-url"
          className={cn(
            "min-h-7 w-full min-w-0 rounded-md border border-[var(--oh-border)]",
            "bg-[var(--oh-surface-raised)] px-2 text-xs leading-5 outline-none",
            "text-[var(--oh-text-tertiary)] placeholder:text-[var(--oh-text-dim)]",
            "focus:border-[var(--oh-primary)]",
          )}
        />
      </form>

      {hasPage && url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t(I18nKey.BUTTON$OPEN_IN_NEW_TAB)}
          title={t(I18nKey.BUTTON$OPEN_IN_NEW_TAB)}
          data-testid="browser-chrome-open-external"
          className={enabledButtonClassName}
        >
          <ExternalLink className={iconClassName} aria-hidden strokeWidth={2} />
        </a>
      ) : (
        <button
          type="button"
          disabled
          aria-label={t(I18nKey.BUTTON$OPEN_IN_NEW_TAB)}
          title={t(I18nKey.BUTTON$OPEN_IN_NEW_TAB)}
          className={disabledButtonClassName}
        >
          <ExternalLink className={iconClassName} aria-hidden strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
