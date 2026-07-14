import React from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, RefreshCw } from "lucide-react";
import {
  useGitCommits,
  GIT_COMMITS_LIMIT,
  type CommitInfo,
} from "#/hooks/query/use-git-commits";
import { useSendAgentPrompt } from "#/hooks/use-send-agent-prompt";
import { useAgentState } from "#/hooks/use-agent-state";
import { useTracking } from "#/hooks/use-tracking";
import { AgentState, RUNTIME_INACTIVE_STATES } from "#/types/agent-state";
import { getRevertToCommitPrompt, cn } from "#/utils/utils";
import { I18nKey } from "#/i18n/declaration";
import { CommitRow } from "#/components/features/checkpoints/commit-row";
import { ConfirmationModal } from "#/components/shared/modals/confirmation-modal";
import { ConversationTabEmptyState } from "#/components/features/conversation/conversation-tab-empty-state";
import { RuntimeWaitingState } from "#/components/features/conversation-panel/runtime-waiting-state";
import { RandomTip } from "#/components/features/tips/random-tip";

function CheckpointsTab() {
  const { t } = useTranslation("openhands");
  const queryClient = useQueryClient();
  const { commits, isLoading, isFetching, isError, isSuccess, refetch } =
    useGitCommits();
  const sendAgentPrompt = useSendAgentPrompt();
  const { trackRevertToCheckpointClick } = useTracking();
  const { curAgentState } = useAgentState();

  const [pendingRevert, setPendingRevert] = React.useState<CommitInfo | null>(
    null,
  );

  const runtimeIsActive = !RUNTIME_INACTIVE_STATES.includes(curAgentState);
  const isAgentBusy = curAgentState === AgentState.RUNNING;

  // Refresh the commit list (and the Files-tab "has commits" default) once the
  // agent settles after running a checkpoint or a revert. Tracks the RUNNING →
  // not-RUNNING transition so we don't over-fetch on every state change.
  const wasBusyRef = React.useRef(isAgentBusy);
  React.useEffect(() => {
    if (wasBusyRef.current && !isAgentBusy) {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["has-git-commits"] });
    }
    wasBusyRef.current = isAgentBusy;
  }, [isAgentBusy, refetch, queryClient]);

  const handleRevertConfirm = () => {
    if (!pendingRevert) return;
    trackRevertToCheckpointClick();
    sendAgentPrompt(
      getRevertToCommitPrompt(pendingRevert.sha, pendingRevert.subject),
    );
    setPendingRevert(null);
  };

  const hasCommits = isSuccess && commits.length > 0;

  const renderBody = () => {
    if (!runtimeIsActive) {
      return (
        <RuntimeWaitingState
          testId="checkpoints-tab-status"
          messageKey={I18nKey.DIFF_VIEWER$WAITING_FOR_RUNTIME}
        />
      );
    }

    if (isLoading) {
      return (
        <RuntimeWaitingState
          testId="checkpoints-tab-status"
          messageKey={I18nKey.DIFF_VIEWER$LOADING}
        />
      );
    }

    if (hasCommits) {
      return (
        <div className="h-full overflow-y-auto flex flex-col items-stretch custom-scrollbar-always">
          {commits.map((commit) => (
            <CommitRow
              key={commit.sha}
              commit={commit}
              onRevert={setPendingRevert}
              isRevertDisabled={isAgentBusy}
            />
          ))}
          {commits.length >= GIT_COMMITS_LIMIT && (
            <p className="px-3 py-2 text-xs text-center text-[var(--oh-muted)]">
              {t(I18nKey.CHECKPOINTS$SHOWING_LATEST)}
            </p>
          )}
        </div>
      );
    }

    // Success with no commits, or an error (e.g. not a git repo) — both mean
    // "no checkpoints yet".
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 flex items-center justify-center">
          <ConversationTabEmptyState icon={<Flag />}>
            {t(I18nKey.CHECKPOINTS$EMPTY)}
          </ConversationTabEmptyState>
        </div>
        {!isError && <RandomTip />}
      </div>
    );
  };

  return (
    <main className="h-full w-full flex flex-col items-stretch">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--oh-border)]">
        <span className="text-sm font-medium text-white">
          {t(I18nKey.COMMON$CHECKPOINTS)}
        </span>
        <button
          type="button"
          data-testid="checkpoints-refresh-button"
          onClick={() => refetch()}
          disabled={!runtimeIsActive || isFetching}
          aria-label={t(I18nKey.CHECKPOINTS$REFRESH)}
          title={t(I18nKey.CHECKPOINTS$REFRESH)}
          className="shrink-0 rounded-md p-1 text-[var(--oh-muted)] hover:text-white hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
        </button>
      </div>

      <div className="flex-1 min-h-0">{renderBody()}</div>

      {pendingRevert && (
        <ConfirmationModal
          text={t(I18nKey.CHECKPOINTS$REVERT_WARNING, {
            sha: pendingRevert.sha.slice(0, 7),
          })}
          onConfirm={handleRevertConfirm}
          onCancel={() => setPendingRevert(null)}
        />
      )}
    </main>
  );
}

export default CheckpointsTab;
