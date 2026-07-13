import { useTranslation } from "react-i18next";
import { IoIosGlobe } from "react-icons/io";
import { I18nKey } from "#/i18n/declaration";
import { ConversationTabEmptyState } from "#/components/features/conversation/conversation-tab-empty-state";
import { StartDevServerButton } from "./start-dev-server-button";

export function EmptyBrowserMessage() {
  const { t } = useTranslation("openhands");

  return (
    <ConversationTabEmptyState
      icon={<IoIosGlobe />}
      action={<StartDevServerButton />}
    >
      {t(I18nKey.BROWSER$NO_PAGE_LOADED)}
    </ConversationTabEmptyState>
  );
}
