import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RightPanelToggle } from "#/components/features/conversation/right-panel-toggle";
import { useConversationStore } from "#/stores/conversation-store";

const CONVERSATION_ID = "conv-abc123";

const { mockNavigate, breakpointIsMobile } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  breakpointIsMobile: { value: false },
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("#/hooks/use-breakpoint", () => ({
  useBreakpoint: () => breakpointIsMobile.value,
}));

vi.mock("#/hooks/use-conversation-id", () => ({
  useOptionalConversationId: () => ({ conversationId: "test-conversation-id" }),
  useConversationId: () => ({ conversationId: CONVERSATION_ID }),
}));

vi.mock("#/hooks/use-is-archived-conversation", () => ({
  useIsArchivedConversation: () => false,
}));

describe("RightPanelToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    breakpointIsMobile.value = false;
    useConversationStore.setState({
      selectedTab: "files",
      isRightPanelShown: true,
      hasRightPanelToggled: true,
    });
  });

  it("renders nothing on desktop (both panels are always visible)", () => {
    render(<RightPanelToggle />);
    expect(screen.queryByTestId("right-panel-toggle")).not.toBeInTheDocument();
  });

  it("navigates to the full-screen panel route on mobile", async () => {
    breakpointIsMobile.value = true;
    const user = userEvent.setup();

    useConversationStore.setState({
      isRightPanelShown: false,
      hasRightPanelToggled: false,
    });

    render(<RightPanelToggle />);

    await user.click(screen.getByTestId("right-panel-toggle"));

    expect(mockNavigate).toHaveBeenCalledWith(
      `/conversations/${CONVERSATION_ID}/panel`,
    );
    const storeState = useConversationStore.getState();
    expect(storeState.hasRightPanelToggled).toBe(true);
    expect(storeState.isRightPanelShown).toBe(true);
  });
});
