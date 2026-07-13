import { useTranslation } from "react-i18next";
import { Play } from "lucide-react";
import { BrandButton } from "#/components/features/settings/brand-button";
import { I18nKey } from "#/i18n/declaration";
import { useStartDevServerPreview } from "#/hooks/use-start-dev-server-preview";
import { useOptionalConversationId } from "#/hooks/use-conversation-id";

/**
 * Quick-access button shown in the empty Browser panel. Clicking it asks the
 * agent to inspect the project, find its dev script, and run the dev server so
 * the preview loads here. Rendered only inside a conversation.
 */
export function StartDevServerButton() {
  const { t } = useTranslation("openhands");
  const { conversationId } = useOptionalConversationId();
  const { startDevServerPreview } = useStartDevServerPreview();

  if (!conversationId) return null;

  return (
    <BrandButton
      type="button"
      variant="primary"
      testId="start-dev-server-button"
      onClick={startDevServerPreview}
      startContent={
        <Play className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
      }
    >
      {t(I18nKey.BROWSER$START_DEV_SERVER)}
    </BrandButton>
  );
}
