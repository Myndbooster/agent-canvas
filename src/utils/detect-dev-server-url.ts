// Matches a localhost-style dev-server URL. Restricted to loopback hosts so we
// never treat an arbitrary URL printed in terminal output as a preview target.
const LOCALHOST_URL_RE =
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:\/[^\s'"]*)?/gi;

// CSI escape sequences (Vite/Next/CRA colorize their "Local:" banner). Strip
// them first — including the leading ESC — so a trailing reset code like
// `\x1b[39m` isn't swallowed into a greedy URL match.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]/g;

function normalizePreviewUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // 0.0.0.0 means "all interfaces" and isn't directly loadable in a browser
    // on every platform — point it at localhost instead.
    if (parsed.hostname === "0.0.0.0") {
      parsed.hostname = "localhost";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Scan terminal/bash output for a local dev-server URL (e.g. Vite's
 * `➜  Local:   http://localhost:5173/`). Returns the most recent match, or
 * `null` when none is found.
 *
 * Lines announcing a `Local:` address are preferred over any other localhost
 * URL that happens to appear in the output; within the chosen pool the last
 * match wins so a restart on a new port supersedes an earlier one.
 */
export function detectDevServerUrl(rawText: string): string | null {
  if (!rawText) return null;

  const text = rawText.replace(ANSI_RE, "");
  const lines = text.split(/\r?\n/);

  const localLines = lines.filter((line) => /local:/i.test(line));
  const pool = localLines.length > 0 ? localLines : lines;

  let latest: string | null = null;
  for (const line of pool) {
    const matches = line.match(LOCALHOST_URL_RE);
    if (matches && matches.length > 0) {
      latest = matches[matches.length - 1];
    }
  }

  return latest ? normalizePreviewUrl(latest) : null;
}
