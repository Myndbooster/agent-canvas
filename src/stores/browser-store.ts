import { create } from "zustand";

interface BrowserState {
  // URL of the last page the agent navigated to in the browser panel.
  url: string;
  // Base64-encoded screenshot of the browser window, when the tool provides one.
  screenshotSrc: string;
  // Live dev-server URL to render in an <iframe> for an interactive preview.
  // Set from detected terminal output or the editable address bar. Takes
  // priority over the screenshot when present.
  previewUrl: string;
}

interface BrowserStore extends BrowserState {
  setUrl: (url: string) => void;
  setScreenshotSrc: (screenshotSrc: string) => void;
  setPreviewUrl: (previewUrl: string) => void;
  reset: () => void;
}

const initialState: BrowserState = {
  url: "",
  screenshotSrc: "",
  previewUrl: "",
};

export const useBrowserStore = create<BrowserStore>((set) => ({
  ...initialState,
  setUrl: (url: string) => set({ url }),
  setScreenshotSrc: (screenshotSrc: string) => set({ screenshotSrc }),
  setPreviewUrl: (previewUrl: string) => set({ previewUrl }),
  reset: () => set(initialState),
}));
