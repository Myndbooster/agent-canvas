import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockSend = vi.fn(() => Promise.resolve());
const mockEnqueue = vi.fn(() => "pending-1");
const mockMarkError = vi.fn();

vi.mock("#/hooks/use-send-message", () => ({
  useSendMessage: () => ({ send: mockSend }),
}));

vi.mock("#/hooks/use-conversation-id", () => ({
  useOptionalConversationId: () => ({ conversationId: "conv-1" }),
}));

vi.mock("#/stores/optimistic-user-message-store", () => ({
  useOptimisticUserMessageStore: (
    selector: (s: {
      enqueuePendingMessage: typeof mockEnqueue;
      markPendingMessageError: typeof mockMarkError;
    }) => unknown,
  ) =>
    selector({
      enqueuePendingMessage: mockEnqueue,
      markPendingMessageError: mockMarkError,
    }),
}));

import {
  useStartDevServerPreview,
  START_DEV_SERVER_PROMPT,
} from "#/hooks/use-start-dev-server-preview";

describe("useStartDevServerPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the canned dev-server prompt and shows an optimistic pending message", () => {
    const { result } = renderHook(() => useStartDevServerPreview());

    act(() => {
      result.current.startDevServerPreview();
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conv-1",
        text: START_DEV_SERVER_PROMPT,
      }),
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
    // The prompt tells the agent to inspect the project and run in background.
    expect(START_DEV_SERVER_PROMPT.toLowerCase()).toContain("background");
  });
});
