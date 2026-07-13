import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

interface BrowserPreviewFrameProps {
  src: string;
  // Bumped by the chrome-bar reload button. Folded into the iframe `key` so a
  // same-URL reload forces a remount (cross-origin `iframe.reload()` is not
  // callable from here).
  reloadNonce: number;
}

function isSameOrigin(src: string): boolean {
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function BrowserPreviewFrame({
  src,
  reloadNonce,
}: BrowserPreviewFrameProps) {
  const { t } = useTranslation("openhands");

  // `allow-same-origin` + `allow-scripts` are required for the previewed app's
  // JS and Vite HMR websocket to run. That's safe for the user's own dev
  // server, but if the preview ever resolves to *our* origin the combination
  // would let the framed page escape the sandbox — drop `allow-same-origin`
  // in that (pathological) case.
  const sameOrigin = isSameOrigin(src);
  const sandbox = sameOrigin
    ? "allow-scripts allow-forms allow-popups allow-modals allow-downloads"
    : "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads";

  return (
    <iframe
      key={`${src}#${reloadNonce}`}
      src={src}
      title={t(I18nKey.BROWSER$TITLE)}
      className="h-full w-full border-0 bg-white"
      sandbox={sandbox}
    />
  );
}
