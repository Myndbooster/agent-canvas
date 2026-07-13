import { describe, it, expect } from "vitest";
import { detectDevServerUrl } from "#/utils/detect-dev-server-url";

describe("detectDevServerUrl", () => {
  it("returns null for empty or url-less output", () => {
    expect(detectDevServerUrl("")).toBeNull();
    expect(detectDevServerUrl("Compiling...\nDone in 1.2s")).toBeNull();
  });

  it("detects a plain Vite Local URL", () => {
    const out =
      "  VITE v8.0.10  ready in 300 ms\n  ➜  Local:   http://localhost:5173/";
    expect(detectDevServerUrl(out)).toBe("http://localhost:5173/");
  });

  it("strips ANSI color codes around the URL", () => {
    // Vite colorizes the banner; a trailing reset must not be captured.
    const out =
      "\x1b[32m➜\x1b[39m  Local:   \x1b[36mhttp://localhost:5173/\x1b[39m";
    expect(detectDevServerUrl(out)).toBe("http://localhost:5173/");
  });

  it("prefers the Local: line over a Network line", () => {
    const out = [
      "  ➜  Local:   http://localhost:3000/",
      "  ➜  Network: http://127.0.0.1:3000/",
    ].join("\n");
    expect(detectDevServerUrl(out)).toBe("http://localhost:3000/");
  });

  it("normalizes 0.0.0.0 to localhost", () => {
    expect(detectDevServerUrl("Local: http://0.0.0.0:8080/")).toBe(
      "http://localhost:8080/",
    );
  });

  it("takes the most recent match when a server restarts on a new port", () => {
    const out = [
      "Local: http://localhost:5173/",
      "Port 5173 in use, retrying...",
      "Local: http://localhost:5174/",
    ].join("\n");
    expect(detectDevServerUrl(out)).toBe("http://localhost:5174/");
  });

  it("falls back to any localhost URL when no Local: line exists", () => {
    expect(detectDevServerUrl("Server started at http://127.0.0.1:4000")).toBe(
      "http://127.0.0.1:4000/",
    );
  });

  it("ignores non-loopback URLs", () => {
    expect(detectDevServerUrl("Deployed to https://example.com")).toBeNull();
  });

  it("extracts the URL from a curl verify command", () => {
    expect(
      detectDevServerUrl(
        'curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/index.html',
      ),
    ).toBe("http://localhost:5173/index.html");
  });
});
