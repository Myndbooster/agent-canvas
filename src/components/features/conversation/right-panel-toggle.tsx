import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useConversationStore } from "#/stores/conversation-store";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { mobileTopBarIconButtonClassName } from "#/utils/mobile-top-bar-icon-button-classes";
import BlockDrawerLeftIcon from "#/icons/block-drawer-left.svg?react";
import { ChatActionTooltip } from "../chat/chat-action-tooltip";
import { useBreakpoint } from "#/hooks/use-breakpoint";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useIsArchivedConversation } from "#/hooks/use-is-archived-conversation";

interface RightPanelToggleProps {
  className?: string;
}

/**
 * Toggle button for the tab panel.
 *
 * Desktop no longer collapses the tab panel — it's the always-visible main
 * area, and the chat is the resizable right column (see `ConversationMain`) —
 * so this renders nothing on desktop. On mobile it navigates to the full-page
 * `/panel` route.
 */
export function RightPanelToggle({ className }: RightPanelToggleProps) {
  const { t } = useTranslation("openhands");
  const isMobile = useBreakpoint();
  const isArchivedConversation = useIsArchivedConversation();
  const navigate = useNavigate();
  const { conversationId } = useConversationId();
  const { setHasRightPanelToggled, setIsRightPanelShown, setSelectedTab } =
    useConversationStore();

  // Desktop keeps both panels visible (chat + the tabbed main area), so there
  // is nothing to toggle — only mobile uses this, to open the /panel route.
  if (!isMobile) {
    return null;
  }

  const handleToggle = () => {
    if (isArchivedConversation) {
      return;
    }
    if (!conversationId) return;
    setHasRightPanelToggled(true);
    setIsRightPanelShown(true);
    const { selectedTab } = useConversationStore.getState();
    if (!selectedTab) {
      setSelectedTab("browser");
    }
    navigate(`/conversations/${conversationId}/panel`);
  };

  const tooltipText = isArchivedConversation
    ? t(I18nKey.CONVERSATION$UNAVAILABLE_FOR_ARCHIVES)
    : t(I18nKey.COMMON$SHOW_PANEL);

  const ariaPressed = false;

  return (
    <ChatActionTooltip tooltip={tooltipText} ariaLabel={tooltipText}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isArchivedConversation}
        className={cn(
          mobileTopBarIconButtonClassName,
          isArchivedConversation &&
            "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-[var(--oh-muted)]",
          className,
        )}
        aria-label={tooltipText}
        aria-pressed={ariaPressed}
        aria-disabled={isArchivedConversation}
        data-testid="right-panel-toggle"
      >
        <BlockDrawerLeftIcon className="w-5 h-5 -scale-x-100" />
      </button>
    </ChatActionTooltip>
  );
}
