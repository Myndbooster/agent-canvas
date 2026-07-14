import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSendMessage } from "#/hooks/use-send-message";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useOptimisticUserMessageStore } from "#/stores/optimistic-user-message-store";
import { useOptionalScrollContext } from "#/context/scroll-context";
import { I18nKey } from "#/i18n/declaration";

/**
 * Sends a prompt to the agent as if the user typed it: an optimistic user
 * bubble is enqueued immediately, the chat scrolls to the bottom, and a failed
 * send flips the bubble to an error state (with retry) rather than leaving it
 * stuck on "Sending…". Mirrors the send flow in `git-control-bar.tsx`'s
 * `handleLaunchRepository`, so actions triggered from the right-drawer tabs
 * (e.g. reverting to a checkpoint) behave like the chat-input chips.
 */
export function useSendAgentPrompt() {
  const { t } = useTranslation("openhands");
  const { conversationId } = useConversationId();
  const { send } = useSendMessage();
  const scrollContext = useOptionalScrollContext();
  const enqueuePendingMessage = useOptimisticUserMessageStore(
    (state) => state.enqueuePendingMessage,
  );
  const markPendingMessageError = useOptimisticUserMessageStore(
    (state) => state.markPendingMessageError,
  );

  // Always call the latest `send` to avoid a stale closure holding a
  // now-closed WebSocket reference.
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  return useCallback(
    (prompt: string) => {
      const pendingId = conversationId
        ? enqueuePendingMessage({ conversationId, text: prompt })
        : null;
      scrollContext?.scrollDomToBottom();
      Promise.resolve(
        sendRef.current({
          action: "message",
          args: {
            content: prompt,
            timestamp: new Date().toISOString(),
          },
        }),
      ).catch((error) => {
        if (!pendingId) return;
        const errorMessage =
          error instanceof Error
            ? error.message
            : t(I18nKey.CHAT_INTERFACE$FAILED_TO_SEND_MESSAGE);
        markPendingMessageError(pendingId, errorMessage);
      });
    },
    [
      conversationId,
      enqueuePendingMessage,
      markPendingMessageError,
      scrollContext,
      t,
    ],
  );
}
