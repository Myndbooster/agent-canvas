import { useTranslation } from "react-i18next";
import { Flag } from "lucide-react";
import { cn, getCheckpointPrompt } from "#/utils/utils";
import {
  gitControlBarActionButtonClassName,
  gitControlBarActionIconColor,
  gitControlBarActionLabelClassName,
} from "#/utils/git-control-bar-classes";
import { I18nKey } from "#/i18n/declaration";
import { useTracking } from "#/hooks/use-tracking";

interface GitControlBarCheckpointButtonProps {
  onSuggestionsClick: (value: string) => void;
  isConversationReady?: boolean;
  isAgentBusy?: boolean;
}

/**
 * "Checkpoint" chip: asks the agent to commit the current work (initializing a
 * git repo first when none exists). Unlike push/pull/PR, it does not require a
 * connected remote repository, so it stays visible even with no repo. It is
 * disabled while the agent is actively running so a commit can't land mid-task.
 */
export function GitControlBarCheckpointButton({
  onSuggestionsClick,
  isConversationReady = true,
  isAgentBusy = false,
}: GitControlBarCheckpointButtonProps) {
  const { t } = useTranslation("openhands");
  const { trackCheckpointButtonClick } = useTracking();

  const isButtonEnabled = isConversationReady && !isAgentBusy;

  const handleCheckpointClick = () => {
    trackCheckpointButtonClick();
    onSuggestionsClick(getCheckpointPrompt());
  };

  return (
    <button
      type="button"
      onClick={handleCheckpointClick}
      disabled={!isButtonEnabled}
      data-testid="git-control-bar-checkpoint-button"
      className={cn(
        gitControlBarActionButtonClassName(isButtonEnabled),
        "px-2.5 py-1 w-auto",
      )}
    >
      <div className="w-3 h-3 flex items-center justify-center">
        <Flag size={12} color={gitControlBarActionIconColor(isButtonEnabled)} />
      </div>
      <div
        className={cn(gitControlBarActionLabelClassName, "max-w-[120px]")}
        title={t(I18nKey.COMMON$CHECKPOINT)}
      >
        {t(I18nKey.COMMON$CHECKPOINT)}
      </div>
    </button>
  );
}
