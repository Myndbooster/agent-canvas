import type { PostHog } from "posthog-js";

/**
 * Handle user consent for tracking
 * @param posthog PostHog instance (from usePostHog hook)
 * @param consent Whether the user consents to tracking
 */
export const handleCaptureConsent = (
  _posthog: PostHog | undefined,
  _consent: boolean,
) => {
  // TELEMETRY DISABLED (privacy): PostHog capturing is off entirely, so there is
  // nothing to opt in/out of. This is now a no-op. Original (kept for restore):
  //
  // if (!_posthog) return;
  //
  // if (_consent && !_posthog.has_opted_in_capturing()) {
  //   _posthog.opt_in_capturing();
  // }
  //
  // if (!_consent && !_posthog.has_opted_out_capturing()) {
  //   _posthog.opt_out_capturing();
  // }
};
