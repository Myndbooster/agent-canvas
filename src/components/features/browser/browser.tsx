import { useState } from "react";
import { BrowserSnapshot } from "./browser-snapshot";
import { BrowserChromeBar } from "./browser-chrome-bar";
import { BrowserPreviewFrame } from "./browser-preview-frame";
import { EmptyBrowserMessage } from "./empty-browser-message";
import { useBrowserStore } from "#/stores/browser-store";

export function BrowserPanel() {
  const { url, screenshotSrc, previewUrl } = useBrowserStore();
  const setPreviewUrl = useBrowserStore((state) => state.setPreviewUrl);
  const [reloadNonce, setReloadNonce] = useState(0);

  const hasPreview = Boolean(previewUrl);
  const hasScreenshot = Boolean(screenshotSrc);
  const hasPage = hasPreview || hasScreenshot;

  // Address bar shows the live preview URL when present, otherwise the agent
  // browser tool's last navigated URL.
  const displayUrl = previewUrl || url;

  const imgSrc = screenshotSrc?.startsWith("data:image/png;base64,")
    ? screenshotSrc
    : `data:image/png;base64,${screenshotSrc ?? ""}`;

  const handleNavigate = (nextUrl: string) => {
    setPreviewUrl(nextUrl);
    setReloadNonce((nonce) => nonce + 1);
  };

  const handleReload = () => setReloadNonce((nonce) => nonce + 1);

  return (
    <div className="flex h-full min-h-0 w-full flex-col text-[var(--oh-muted)]">
      <BrowserChromeBar
        url={displayUrl}
        hasPage={hasPage}
        onNavigate={handleNavigate}
        onReload={handleReload}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide bg-[var(--oh-surface)]">
        {hasPreview ? (
          <BrowserPreviewFrame src={previewUrl} reloadNonce={reloadNonce} />
        ) : hasScreenshot ? (
          <BrowserSnapshot src={imgSrc} />
        ) : (
          <EmptyBrowserMessage />
        )}
      </div>
    </div>
  );
}
