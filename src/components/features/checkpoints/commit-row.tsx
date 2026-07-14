import { useTranslation } from "react-i18next";
import { Flag } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { formatTimeDelta } from "#/utils/format-time-delta";
import type { CommitInfo } from "#/hooks/query/use-git-commits";

interface CommitRowProps {
  commit: CommitInfo;
  onRevert: (commit: CommitInfo) => void;
  /** Disabled while the agent is running so a revert can't land mid-task. */
  isRevertDisabled?: boolean;
}

export function CommitRow({
  commit,
  onRevert,
  isRevertDisabled = false,
}: CommitRowProps) {
  const { t } = useTranslation("openhands");
  const shortSha = commit.sha.slice(0, 7);
  const relativeTime = Number.isFinite(commit.timestamp)
    ? formatTimeDelta(new Date(commit.timestamp))
    : "";

  return (
    <div
      data-testid="checkpoint-row"
      className="flex justify-between items-center gap-3 px-3 py-2.5 border-b border-[var(--oh-border)]"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Flag
          size={14}
          className="shrink-0 text-[var(--oh-muted)]"
          fill={commit.isCheckpoint ? "currentColor" : "none"}
          aria-hidden
        />
        <div className="flex flex-col min-w-0">
          <span
            className="text-sm font-normal leading-5 truncate text-white"
            title={commit.subject}
          >
            {commit.subject}
          </span>
          <span className="text-xs leading-4 truncate text-[var(--oh-muted)]">
            {shortSha}
            {commit.author ? ` · ${commit.author}` : ""}
            {relativeTime ? ` · ${relativeTime}` : ""}
          </span>
        </div>
      </div>

      <button
        type="button"
        data-testid="checkpoint-revert-button"
        onClick={() => onRevert(commit)}
        disabled={isRevertDisabled}
        className="shrink-0 rounded-[100px] border border-[var(--oh-border)] px-2.5 py-1 text-sm font-normal leading-5 text-white hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t(I18nKey.CHECKPOINTS$REVERT)}
      </button>
    </div>
  );
}
