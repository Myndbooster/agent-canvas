import type { PostHog } from "posthog-js";

interface ErrorDetails {
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
  msgId?: string;
  posthog?: PostHog;
}

export function trackError(_details: ErrorDetails) {
  // TELEMETRY DISABLED (privacy): error/exception reporting to PostHog is turned
  // off so no error messages or metadata leave the browser. This is now a no-op.
  // Original implementation (kept for restoration):
  //
  // const { message, source, metadata = {}, posthog } = _details;
  // if (!posthog) return;
  //
  // const error = new Error(message);
  // posthog.captureException(error, {
  //   error_source: source || "unknown",
  //   ...metadata,
  // });
}
