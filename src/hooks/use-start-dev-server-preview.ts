import { useCallback } from "react";
import { useSendMessage } from "#/hooks/use-send-message";
import { createChatMessage } from "#/services/chat-service";
import { useOptimisticUserMessageStore } from "#/stores/optimistic-user-message-store";
import { useOptionalConversationId } from "#/hooks/use-conversation-id";

// Canned instruction sent when the user clicks the "Start dev server" button in
// the Browser panel. The agent inspects the project, finds the dev script, and
// runs it in the background; the printed local URL is auto-detected and loaded
// into the Browser panel (see detect-dev-server-url + conversation-websocket).
// The <WEB_PREVIEW> system suffix reinforces the background-launch + print-URL
// mechanics.
export const START_DEV_SERVER_PROMPT =
  "Look at this project and start its web dev server so I can preview it. " +
  "Inspect the project (for example package.json scripts or the framework's " +
  "config) to find the correct dev or start command, run it in the background " +
  "so it keeps running, and print the local URL (for example " +
  "http://localhost:5173). If a dev server is already running, just tell me the URL. " +
  "Once the server responds, end your reply with a line exactly like " +
  "`Preview URL: http://localhost:PORT/` so the preview loads automatically.";

/**
 * Sends the user-initiated "start dev server / preview" instruction to the
 * agent. Mirrors {@link useHandleBuildPlanClick}: shows an optimistic pending
 * message and dispatches the prompt over the conversation WebSocket.
 */
export const useStartDevServerPreview = () => {
  const { send } = useSendMessage();
  const { conversationId } = useOptionalConversationId();
  const enqueuePendingMessage = useOptimisticUserMessageStore(
    (state) => state.enqueuePendingMessage,
  );
  const markPendingMessageError = useOptimisticUserMessageStore(
    (state) => state.markPendingMessageError,
  );

  const startDevServerPreview = useCallback(
    (event?: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
      event?.preventDefault();
      event?.stopPropagation();

      const timestamp = new Date().toISOString();
      const pendingId = conversationId
        ? enqueuePendingMessage({
            conversationId,
            text: START_DEV_SERVER_PROMPT,
            timestamp,
          })
        : null;

      send(createChatMessage(START_DEV_SERVER_PROMPT, [], [], timestamp)).catch(
        (error) => {
          if (!pendingId) return;
          const errorMessage =
            error instanceof Error ? error.message : "Failed to send message";
          markPendingMessageError(pendingId, errorMessage);
        },
      );
    },
    [send, conversationId, enqueuePendingMessage, markPendingMessageError],
  );

  return { startDevServerPreview };
};
