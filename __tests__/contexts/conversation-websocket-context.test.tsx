import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createUserMessageEvent } from "test-utils";
import { ConversationWebSocketProvider } from "#/contexts/conversation-websocket-context";
import { useEventStore } from "#/stores/use-event-store";
import { useOptimisticUserMessageStore } from "#/stores/optimistic-user-message-store";
import { useBrowserStore } from "#/stores/browser-store";
import { useConversationStore } from "#/stores/conversation-store";
import { useUserConversation } from "#/hooks/query/use-user-conversation";
import EventService from "#/api/event-service/event-service.api";
import {
  getStoredConversationMetadata,
  setStoredConversationMetadata,
} from "#/api/conversation-metadata-store";
import type { MessageEvent } from "#/types/agent-server/core";

// Captures the main socket's `onMessage` (`handleMainMessage`) so tests can
// drive the live message path without a real WebSocket. Only the main socket
// gets a non-empty url (planning stays ""), so url presence discriminates it.
const wsCapture = vi.hoisted(() => ({
  mainOnMessage: null as null | ((event: { data: string }) => void),
}));

// Keep the units under test real (the provider, `useConversationHistory`, the
// event store). Only the network is stubbed: the WebSocket transport and the
// REST service the history query depends on.
vi.mock("#/hooks/use-websocket", () => ({
  useWebSocket: vi.fn(
    (
      url: string,
      options?: { onMessage?: (event: { data: string }) => void },
    ) => {
      if (url && options?.onMessage) {
        wsCapture.mainOnMessage = options.onMessage;
      }
      return { socket: null, reconnect: vi.fn() };
    },
  ),
}));
vi.mock("#/hooks/query/use-user-conversation", () => ({
  useUserConversation: vi.fn(),
}));

const AGENT_REPLY_ID = "evt-agent-reply";

// An agent reply that streamed in over the WebSocket *after* the initial REST
// history page — i.e. it lives only in the event store, never in the cached
// history page. This is the class of event the old code dropped on re-entry.
const makeAgentReply = (): MessageEvent => ({
  id: AGENT_REPLY_ID,
  timestamp: new Date(Date.now() + 1000).toISOString(),
  source: "agent",
  llm_message: { role: "assistant", content: [{ type: "text", text: "Hi!" }] },
  activated_microagents: [],
  extended_content: [],
});

const eventIds = () => useEventStore.getState().events.map((event) => event.id);

describe("ConversationWebSocketProvider — conversation-scoped event store", () => {
  let queryClient: QueryClient;

  const renderProvider = (conversationId: string) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ConversationWebSocketProvider
          conversationId={conversationId}
          conversationUrl={null}
        >
          <div />
        </ConversationWebSocketProvider>
      </QueryClientProvider>,
    );

  beforeEach(() => {
    wsCapture.mainOnMessage = null;
    window.localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    useEventStore.setState({
      events: [],
      eventIds: new Set(),
      uiEvents: [],
      loadedConversationId: null,
    });
    useOptimisticUserMessageStore.setState({ pendingMessages: [] });
    useBrowserStore.getState().reset();

    vi.mocked(useUserConversation).mockReturnValue({
      data: { conversation_url: "http://localhost/api", session_api_key: null },
    } as ReturnType<typeof useUserConversation>);

    // The cached REST history page ends at the user's message — a fresh page
    // per conversation so we can detect cross-conversation leakage.
    vi.spyOn(EventService, "searchEvents").mockImplementation(
      async (conversationId: string) => ({
        items: [createUserMessageEvent(`user-msg-${conversationId}`)],
        next_page_id: null,
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  // A successful model switch the agent performed on its own (via the
  // SwitchLLM tool), delivered over the main WebSocket.
  const makeAgentSwitchObservation = (profileName: string) => ({
    id: "evt-switch-1",
    timestamp: new Date().toISOString(),
    source: "environment",
    action_id: "action-switch-1",
    tool_name: "switch_llm",
    tool_call_id: "call-switch-1",
    observation: {
      kind: "SwitchLLMObservation",
      content: [{ type: "text", text: `Switched to ${profileName}` }],
      is_error: false,
      profile_name: profileName,
      reason: null,
      active_model: null,
    },
  });

  it("stamps active_profile on a successful agent-triggered model switch so it survives reload", async () => {
    // Arrange: open a conversation with a real ws url so the main socket's
    // onMessage (handleMainMessage) is wired and captured.
    render(
      <QueryClientProvider client={queryClient}>
        <ConversationWebSocketProvider
          conversationId="conv-switch"
          conversationUrl="http://localhost/api"
        >
          <div />
        </ConversationWebSocketProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(wsCapture.mainOnMessage).not.toBeNull());

    // Act: the agent switches to "fast-opus" via the SwitchLLM tool.
    act(() => {
      wsCapture.mainOnMessage!({
        data: JSON.stringify(makeAgentSwitchObservation("fast-opus")),
      });
    });

    // Assert: the profile identity is persisted to stored metadata — the same
    // field the chat-header switcher reads after a reload (#1082). Without the
    // stamp this stays null and the header falls back to ambiguous matching.
    expect(getStoredConversationMetadata("conv-switch")?.active_profile).toBe(
      "fast-opus",
    );
  });

  it("preserves the conversation's attached plugins across an agent-triggered model switch", async () => {
    // Arrange: the conversation's metadata already carries an attached plugin.
    setStoredConversationMetadata("conv-switch", {
      selected_repository: null,
      selected_branch: null,
      git_provider: null,
      plugins: [
        { source: "github:acme/city-weather", ref: null, repo_path: null },
      ],
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ConversationWebSocketProvider
          conversationId="conv-switch"
          conversationUrl="http://localhost/api"
        >
          <div />
        </ConversationWebSocketProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(wsCapture.mainOnMessage).not.toBeNull());

    // Act: the agent switches model via the SwitchLLM tool.
    act(() => {
      wsCapture.mainOnMessage!({
        data: JSON.stringify(makeAgentSwitchObservation("fast-opus")),
      });
    });

    // Assert: the plugins snapshot survives the full-object metadata replace.
    expect(getStoredConversationMetadata("conv-switch")?.plugins).toEqual([
      { source: "github:acme/city-weather", ref: null, repo_path: null },
    ]);
  });

  it("clears the previous conversation's events when switching conversations", async () => {
    // Arrange + Act: open conversation A.
    const { rerender } = renderProvider("conv-a");
    await waitFor(() => expect(eventIds()).toEqual(["user-msg-conv-a"]));

    // Act: switch to conversation B.
    rerender(
      <QueryClientProvider client={queryClient}>
        <ConversationWebSocketProvider
          conversationId="conv-b"
          conversationUrl={null}
        >
          <div />
        </ConversationWebSocketProvider>
      </QueryClientProvider>,
    );

    // Assert: B's history replaced A's — A did not leak into B.
    await waitFor(() => expect(eventIds()).toEqual(["user-msg-conv-b"]));
  });

  it("resets browser-panel state when switching conversations", async () => {
    const { rerender } = renderProvider("conv-a");
    await waitFor(() => expect(eventIds()).toEqual(["user-msg-conv-a"]));

    useBrowserStore.setState({
      url: "https://example.com",
      screenshotSrc: "data:image/png;base64,abc123",
      previewUrl: "http://localhost:5173/",
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <ConversationWebSocketProvider
          conversationId="conv-b"
          conversationUrl={null}
        >
          <div />
        </ConversationWebSocketProvider>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(useBrowserStore.getState().screenshotSrc).toBe(""),
    );
    expect(useBrowserStore.getState().url).toBe("");
    expect(useBrowserStore.getState().previewUrl).toBe("");
  });

  it("loads a dev-server URL into the preview when it appears in bash output", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ConversationWebSocketProvider
          conversationId="conv-preview"
          conversationUrl="http://localhost/api"
        >
          <div />
        </ConversationWebSocketProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(wsCapture.mainOnMessage).not.toBeNull());

    // Preset a different tab so revealing "browser" is an observable change.
    act(() => {
      useConversationStore.getState().setSelectedTab("files");
    });

    // Act: the agent's dev server prints its Vite "Local:" banner to stdout.
    act(() => {
      wsCapture.mainOnMessage!({
        data: JSON.stringify({
          id: "evt-bash-1",
          timestamp: new Date().toISOString(),
          source: "environment",
          action_id: "action-bash-1",
          tool_name: "terminal",
          tool_call_id: "call-bash-1",
          observation: {
            kind: "ExecuteBashObservation",
            content: [
              {
                type: "text",
                text: "  VITE ready\n  ➜  Local:   http://localhost:5173/",
              },
            ],
          },
        }),
      });
    });

    // Assert: the preview URL is populated and the Browser tab is revealed.
    await waitFor(() =>
      expect(useBrowserStore.getState().previewUrl).toBe(
        "http://localhost:5173/",
      ),
    );
    expect(useConversationStore.getState().selectedTab).toBe("browser");
  });

  const renderMainProvider = (conversationId: string) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ConversationWebSocketProvider
          conversationId={conversationId}
          conversationUrl="http://localhost/api"
        >
          <div />
        </ConversationWebSocketProvider>
      </QueryClientProvider>,
    );

  const agentMessageEvent = (id: string, text: string) => ({
    id,
    timestamp: new Date().toISOString(),
    source: "agent",
    llm_message: { role: "assistant", content: [{ type: "text", text }] },
    activated_microagents: [],
    extended_content: [],
  });

  it("loads the preview URL from an agent chat message announcing the server", async () => {
    renderMainProvider("conv-msg-preview");
    await waitFor(() => expect(wsCapture.mainOnMessage).not.toBeNull());

    act(() => {
      useConversationStore.getState().setSelectedTab("files");
    });

    // The agent backgrounds the server and only reports the URL in prose.
    act(() => {
      wsCapture.mainOnMessage!({
        data: JSON.stringify(
          agentMessageEvent(
            "evt-msg-1",
            "The dev server is running. Preview URL: http://localhost:5173/",
          ),
        ),
      });
    });

    await waitFor(() =>
      expect(useBrowserStore.getState().previewUrl).toBe(
        "http://localhost:5173/",
      ),
    );
    expect(useConversationStore.getState().selectedTab).toBe("browser");
  });

  it("loads the preview URL from a bash command (e.g. a curl verify step)", async () => {
    renderMainProvider("conv-cmd-preview");
    await waitFor(() => expect(wsCapture.mainOnMessage).not.toBeNull());

    act(() => {
      useConversationStore.getState().setSelectedTab("files");
    });

    // Backgrounded server: the URL never hits stdout, only the verify command.
    act(() => {
      wsCapture.mainOnMessage!({
        data: JSON.stringify({
          id: "evt-bash-act-1",
          timestamp: new Date().toISOString(),
          source: "agent",
          tool_name: "terminal",
          tool_call_id: "call-bash-act-1",
          thought: [],
          action: {
            kind: "ExecuteBashAction",
            command:
              'curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/index.html',
            is_input: false,
          },
        }),
      });
    });

    await waitFor(() =>
      expect(useBrowserStore.getState().previewUrl).toBe(
        "http://localhost:5173/index.html",
      ),
    );
    expect(useConversationStore.getState().selectedTab).toBe("browser");
  });

  it("ignores a localhost URL in the user's own message", async () => {
    renderMainProvider("conv-msg-user");
    await waitFor(() => expect(wsCapture.mainOnMessage).not.toBeNull());

    act(() => {
      wsCapture.mainOnMessage!({
        data: JSON.stringify({
          id: "evt-msg-user-1",
          timestamp: new Date().toISOString(),
          source: "user",
          llm_message: {
            role: "user",
            content: [
              {
                type: "text",
                text: "is it running on http://localhost:5173/ ?",
              },
            ],
          },
          activated_microagents: [],
          extended_content: [],
        }),
      });
    });

    expect(useBrowserStore.getState().previewUrl).toBe("");
  });

  it("ignores a localhost URL mentioned without a running-state keyword", async () => {
    renderMainProvider("conv-msg-nokeyword");
    await waitFor(() => expect(wsCapture.mainOnMessage).not.toBeNull());

    act(() => {
      wsCapture.mainOnMessage!({
        data: JSON.stringify(
          agentMessageEvent(
            "evt-msg-2",
            "The config maps the API base to http://localhost:5173/.",
          ),
        ),
      });
    });

    expect(useBrowserStore.getState().previewUrl).toBe("");
  });

  it("keeps events that arrived after history when re-entering the same conversation", async () => {
    // Arrange: open conversation A, then receive an agent reply over the socket
    // that is not part of the cached REST history page.
    const { unmount } = renderProvider("conv-a");
    await waitFor(() => expect(eventIds()).toEqual(["user-msg-conv-a"]));
    act(() => {
      useEventStore.getState().addEvent(makeAgentReply());
    });

    // Act: leave (e.g. to Settings) and return to the same conversation.
    unmount();
    renderProvider("conv-a");

    // Assert: both the user message and the streamed reply survive re-entry.
    await waitFor(() =>
      expect(eventIds()).toEqual(["user-msg-conv-a", AGENT_REPLY_ID]),
    );
    // ...and the re-seed deduped against the existing user message rather than
    // appending a second copy — exactly two events, no double-insertion.
    expect(eventIds()).toHaveLength(2);
  });

  it("consumes the optimistic pending bubble when the echoed user message arrives via REST preload", async () => {
    // Arrange: a cloud start-task conversation left a "Sending…" bubble whose
    // content matches the first message the server has already persisted. With
    // the WebSocket stubbed, the only path that delivers the echo is the REST
    // history preload — the path that previously left this bubble orphaned.
    useOptimisticUserMessageStore.setState({
      pendingMessages: [
        {
          id: "pending-1",
          conversationId: "conv-a",
          text: "User message",
          content: "User message",
          status: "sending",
          imageUrls: [],
          fileUrls: [],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    // Act: open the conversation; preload returns the echoed user message.
    renderProvider("conv-a");

    // Assert: the preloaded echo cleared the bubble, so it isn't shown twice.
    await waitFor(() =>
      expect(useOptimisticUserMessageStore.getState().pendingMessages).toEqual(
        [],
      ),
    );
  });
});
