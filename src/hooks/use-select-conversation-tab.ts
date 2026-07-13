import { useConversationLocalStorageState } from "#/utils/conversation-local-storage";
import {
  useConversationStore,
  type ConversationTab,
} from "#/stores/conversation-store";
import { useConversationId } from "#/hooks/use-conversation-id";

/**
 * Custom hook for selecting conversation tabs with consistent behavior.
 *
 * Handles panel visibility and tab toggling logic. The selected tab is
 * persisted per conversation (so users land on the same tab when they
 * come back), but the drawer's open/closed state is intentionally
 * session-only — see `useConversationStore` for the rationale.
 */
export function useSelectConversationTab() {
  const { conversationId } = useConversationId();
  const {
    selectedTab,
    isRightPanelShown,
    setHasRightPanelToggled,
    setSelectedTab,
  } = useConversationStore();

  const { setSelectedTab: setPersistedSelectedTab } =
    useConversationLocalStorageState(conversationId);

  const onTabChange = (value: ConversationTab | null) => {
    setSelectedTab(value);
    setPersistedSelectedTab(value);
  };

  /**
   * Selects a tab. The tabbed panel is always visible on desktop (it's the
   * main area), so this is a pure content switcher — it no longer collapses
   * the panel when the active tab is re-clicked. On mobile it just ensures the
   * panel is shown.
   */
  const selectTab = (tab: ConversationTab) => {
    onTabChange(tab);
    if (!isRightPanelShown) {
      setHasRightPanelToggled(true);
    }
  };

  /**
   * Navigates to a tab without toggle behavior.
   * Always shows the panel and selects the tab, even if already selected.
   * Use this for "View" or "Read More" buttons that should always navigate.
   */
  const navigateToTab = (tab: ConversationTab) => {
    onTabChange(tab);
    if (!isRightPanelShown) {
      setHasRightPanelToggled(true);
    }
  };

  /**
   * Checks if a specific tab is currently selected. The tabbed panel is always
   * visible on desktop, so this no longer depends on panel visibility.
   */
  const isTabActive = (tab: ConversationTab) => selectedTab === tab;

  return {
    selectTab,
    navigateToTab,
    isTabActive,
    onTabChange,
    selectedTab,
    isRightPanelShown,
  };
}
