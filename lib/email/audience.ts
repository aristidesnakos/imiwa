/**
 * The one place the audience id is read.
 *
 * There is exactly ONE audience. `resend@4.8.0` has no contact-property field
 * and the string "segment" appears zero times in its shipped types, so the
 * signup surface is not stored in Resend at all — DataFast already records it
 * at capture time via `trackEmailSignup(source)`.
 *
 * This is a function rather than `process.env.RESEND_AUDIENCE_ID` at the call
 * site so that if per-surface sending ever becomes worth having, it turns into
 * a source→id map in this file and nowhere else. At forty subscribers it is
 * not worth having.
 */
export function getAudienceId(): string | null {
  const id = process.env.RESEND_AUDIENCE_ID;
  return typeof id === 'string' && id.length > 0 ? id : null;
}
