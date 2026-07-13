import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSelectConversationTab } from "#/hooks/use-select-conversation-tab";
import { useConversationStore } from "#/stores/conversation-store";

const TEST_CONVERSATION_ID = "test-conversation-id";

vi.mock("#/hooks/use-conversation-id", () => ({
  useOptionalConversationId: () => ({ conversationId: "test-conversation-id" }),
  useConversationId: () => ({ conversationId: TEST_CONVERSATION_ID }),
}));

describe("useSelectConversationTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useConversationStore.setState({
      selectedTab: null,
      isRightPanelShown: false,
      hasRightPanelToggled: false,
    });
  });

  describe("selectTab", () => {
    it("should open panel and select tab when panel is closed", () => {
      // Arrange: Panel is closed
      useConversationStore.setState({
        selectedTab: null,
        isRightPanelShown: false,
        hasRightPanelToggled: false,
      });

      const { result } = renderHook(() => useSelectConversationTab());

      // Act: Select a tab
      act(() => {
        result.current.selectTab("files");
      });

      // Assert: Panel should be open and tab selected (in-memory only).
      expect(useConversationStore.getState().selectedTab).toBe("files");
      expect(useConversationStore.getState().hasRightPanelToggled).toBe(true);

      // Tab selection is persisted; the right-drawer open state is
      // intentionally session-only and must NOT touch localStorage.
      const storedState = JSON.parse(
        localStorage.getItem(`conversation-state-${TEST_CONVERSATION_ID}`)!,
      );
      expect(storedState.selectedTab).toBe("files");
      expect(storedState).not.toHaveProperty("rightPanelShown");
    });

    it("keeps the panel open when re-clicking the active tab (pure switcher)", () => {
      // The tabbed panel is the always-visible main area now, so re-clicking
      // the active tab no longer collapses anything.
      useConversationStore.setState({
        selectedTab: "files",
        isRightPanelShown: true,
        hasRightPanelToggled: true,
      });

      const { result } = renderHook(() => useSelectConversationTab());

      act(() => {
        result.current.selectTab("files");
      });

      expect(useConversationStore.getState().hasRightPanelToggled).toBe(true);
      expect(useConversationStore.getState().selectedTab).toBe("files");

      // Never persists a `rightPanelShown` field (session-only behavior).
      const raw = localStorage.getItem(
        `conversation-state-${TEST_CONVERSATION_ID}`,
      );
      if (raw !== null) {
        expect(JSON.parse(raw)).not.toHaveProperty("rightPanelShown");
      }
    });

    it("should switch to different tab when panel is already open", () => {
      // Arrange: Panel is open with editor tab selected
      useConversationStore.setState({
        selectedTab: "files",
        isRightPanelShown: true,
        hasRightPanelToggled: true,
      });

      const { result } = renderHook(() => useSelectConversationTab());

      // Act: Select a different tab
      act(() => {
        result.current.selectTab("terminal");
      });

      // Assert: New tab should be selected, panel still open
      expect(useConversationStore.getState().selectedTab).toBe("terminal");
      expect(useConversationStore.getState().isRightPanelShown).toBe(true);

      // Verify localStorage was updated
      const storedState = JSON.parse(
        localStorage.getItem(`conversation-state-${TEST_CONVERSATION_ID}`)!,
      );
      expect(storedState.selectedTab).toBe("terminal");
    });
  });

  describe("isTabActive", () => {
    it("should return true when tab is selected and panel is visible", () => {
      // Arrange: Panel is open with editor tab selected
      useConversationStore.setState({
        selectedTab: "files",
        isRightPanelShown: true,
        hasRightPanelToggled: true,
      });

      const { result } = renderHook(() => useSelectConversationTab());

      // Assert: Editor tab should be active
      expect(result.current.isTabActive("files")).toBe(true);
    });

    it("stays active regardless of panel visibility (panel always shown on desktop)", () => {
      // isTabActive is now purely about the selected tab — the tabbed panel is
      // always visible on desktop, so it no longer depends on isRightPanelShown.
      useConversationStore.setState({
        selectedTab: "files",
        isRightPanelShown: false,
        hasRightPanelToggled: false,
      });

      const { result } = renderHook(() => useSelectConversationTab());

      expect(result.current.isTabActive("files")).toBe(true);
    });

    it("should return false when different tab is selected", () => {
      // Arrange: Panel is open with editor tab selected
      useConversationStore.setState({
        selectedTab: "files",
        isRightPanelShown: true,
        hasRightPanelToggled: true,
      });

      const { result } = renderHook(() => useSelectConversationTab());

      // Assert: Terminal tab should not be active
      expect(result.current.isTabActive("terminal")).toBe(false);
    });
  });

  describe("onTabChange", () => {
    it("should update both Zustand store and localStorage when changing tab", () => {
      // Arrange
      useConversationStore.setState({
        selectedTab: null,
        isRightPanelShown: false,
        hasRightPanelToggled: false,
      });

      const { result } = renderHook(() => useSelectConversationTab());

      // Act: Change tab
      act(() => {
        result.current.onTabChange("browser");
      });

      // Assert: Both store and localStorage should be updated
      expect(useConversationStore.getState().selectedTab).toBe("browser");

      // Verify localStorage was updated
      const storedState = JSON.parse(
        localStorage.getItem(`conversation-state-${TEST_CONVERSATION_ID}`)!,
      );
      expect(storedState.selectedTab).toBe("browser");
    });

    it("should set tab to null when passing null", () => {
      // Arrange
      useConversationStore.setState({
        selectedTab: "files",
        isRightPanelShown: true,
        hasRightPanelToggled: true,
      });

      const { result } = renderHook(() => useSelectConversationTab());

      // Act: Set tab to null
      act(() => {
        result.current.onTabChange(null);
      });

      // Assert: Tab should be null
      expect(useConversationStore.getState().selectedTab).toBe(null);

      // Verify localStorage was updated
      const storedState = JSON.parse(
        localStorage.getItem(`conversation-state-${TEST_CONVERSATION_ID}`)!,
      );
      expect(storedState.selectedTab).toBe(null);
    });
  });

  describe("returned values", () => {
    it("should return current selectedTab from store", () => {
      // Arrange
      useConversationStore.setState({
        selectedTab: "browser",
        isRightPanelShown: true,
        hasRightPanelToggled: true,
      });

      const { result } = renderHook(() => useSelectConversationTab());

      // Assert: Should return current selectedTab
      expect(result.current.selectedTab).toBe("browser");
    });

    it("should return current isRightPanelShown from store", () => {
      // Arrange
      useConversationStore.setState({
        selectedTab: "files",
        isRightPanelShown: true,
        hasRightPanelToggled: true,
      });

      const { result } = renderHook(() => useSelectConversationTab());

      // Assert: Should return current panel state
      expect(result.current.isRightPanelShown).toBe(true);
    });
  });
});
