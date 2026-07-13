import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { screen, render, fireEvent } from "@testing-library/react";
import React from "react";

// Mock modules before importing the component
vi.mock("#/hooks/use-conversation-id", () => ({
  useOptionalConversationId: () => ({ conversationId: "test-conversation-id" }),
  useConversationId: () => ({ conversationId: "test-conversation-id" }),
}));

vi.mock("#/context/conversation-context", () => ({
  useConversation: () => ({ conversationId: "test-conversation-id" }),
  ConversationProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual("react-i18next");
  return {
    ...(actual as object),
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: {
        changeLanguage: () => new Promise(() => {}),
      },
    }),
  };
});

const mockStartDevServerPreview = vi.fn();
vi.mock("#/hooks/use-start-dev-server-preview", () => ({
  useStartDevServerPreview: () => ({
    startDevServerPreview: mockStartDevServerPreview,
  }),
}));

import { BrowserPanel } from "#/components/features/browser/browser";
import { useBrowserStore } from "#/stores/browser-store";

const SCREENSHOT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN0uGvyHwAFCAJS091fQwAAAABJRU5ErkJggg==";

describe("Browser", () => {
  beforeEach(() => {
    useBrowserStore.getState().reset();
  });

  afterEach(() => {
    useBrowserStore.getState().reset();
    vi.clearAllMocks();
  });

  it("renders a message if no screenshotSrc or previewUrl is provided", () => {
    useBrowserStore.setState({
      url: "https://example.com",
      screenshotSrc: "",
      previewUrl: "",
    });

    render(<BrowserPanel />);

    expect(screen.getByText("BROWSER$NO_PAGE_LOADED")).toBeInTheDocument();
    expect(screen.getByTestId("browser-chrome-bar")).toBeInTheDocument();
    expect(screen.getByTestId("browser-chrome-url")).toHaveValue(
      "https://example.com",
    );
  });

  it("shows the Start-dev-server button in the empty state and sends on click", () => {
    useBrowserStore.setState({ screenshotSrc: "", previewUrl: "" });

    render(<BrowserPanel />);

    const button = screen.getByTestId("start-dev-server-button");
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(mockStartDevServerPreview).toHaveBeenCalledTimes(1);
  });

  it("keeps the chrome bar height and disables open-in-new-tab when empty", () => {
    useBrowserStore.setState({
      url: "",
      screenshotSrc: "",
      previewUrl: "",
    });

    render(<BrowserPanel />);

    expect(screen.getByTestId("browser-chrome-bar")).toHaveClass(
      "min-h-[34px]",
    );
    expect(screen.getByTestId("browser-chrome-url")).toHaveValue("");
    expect(screen.getByTestId("browser-chrome-url")).toHaveAttribute(
      "placeholder",
      "BROWSER$ADDRESS_BAR_LABEL",
    );
    expect(
      screen.getByRole("button", { name: "BUTTON$OPEN_IN_NEW_TAB" }),
    ).toBeDisabled();
  });

  it("renders the url and a screenshot", () => {
    useBrowserStore.setState({
      url: "https://example.com",
      screenshotSrc: SCREENSHOT,
    });

    render(<BrowserPanel />);

    expect(screen.getByTestId("browser-chrome-url")).toHaveValue(
      "https://example.com",
    );
    expect(screen.getByAltText("BROWSER$SCREENSHOT_ALT")).toBeInTheDocument();
  });

  it("does not clear a preloaded screenshot when the browser tab first mounts", () => {
    useBrowserStore.setState({
      url: "https://example.com",
      screenshotSrc: SCREENSHOT,
    });

    render(<BrowserPanel />);

    expect(useBrowserStore.getState().screenshotSrc).toBe(SCREENSHOT);
    expect(screen.getByAltText("BROWSER$SCREENSHOT_ALT")).toBeInTheDocument();
    expect(
      screen.queryByText("BROWSER$NO_PAGE_LOADED"),
    ).not.toBeInTheDocument();
  });

  it("renders a live preview iframe when a previewUrl is set", () => {
    useBrowserStore.setState({ previewUrl: "http://localhost:5173/" });

    render(<BrowserPanel />);

    const frame = screen.getByTitle("BROWSER$TITLE");
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute("src", "http://localhost:5173/");
    expect(screen.getByTestId("browser-chrome-url")).toHaveValue(
      "http://localhost:5173/",
    );
  });

  it("prefers the preview iframe over a screenshot", () => {
    useBrowserStore.setState({
      previewUrl: "http://localhost:5173/",
      screenshotSrc: SCREENSHOT,
    });

    render(<BrowserPanel />);

    expect(screen.getByTitle("BROWSER$TITLE")).toBeInTheDocument();
    expect(
      screen.queryByAltText("BROWSER$SCREENSHOT_ALT"),
    ).not.toBeInTheDocument();
  });

  it("navigates the preview when a URL is typed into the address bar", () => {
    render(<BrowserPanel />);

    const input = screen.getByTestId("browser-chrome-url");
    fireEvent.change(input, { target: { value: "localhost:4321" } });
    fireEvent.submit(input.closest("form")!);

    expect(useBrowserStore.getState().previewUrl).toBe("http://localhost:4321");
    expect(screen.getByTitle("BROWSER$TITLE")).toHaveAttribute(
      "src",
      "http://localhost:4321",
    );
  });

  it("remounts the iframe (reloads) when the reload button is clicked", () => {
    useBrowserStore.setState({ previewUrl: "http://localhost:5173/" });

    render(<BrowserPanel />);

    const before = screen.getByTitle("BROWSER$TITLE");
    fireEvent.click(screen.getByTestId("browser-chrome-reload"));
    const after = screen.getByTitle("BROWSER$TITLE");

    // A new key forces React to mount a fresh DOM node.
    expect(after).not.toBe(before);
    expect(after).toHaveAttribute("src", "http://localhost:5173/");
  });
});
