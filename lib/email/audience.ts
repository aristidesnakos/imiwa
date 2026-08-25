/**
 * The Resend contacts client — the only place a contact is written.
 *
 * ---------------------------------------------------------------------------
 * Why this file no longer mentions an audience id
 * ---------------------------------------------------------------------------
 *
 * It used to export `getAudienceId()`, reading `RESEND_AUDIENCE_ID`. Checked
 * against the live dashboard and API reference on 2026-08-25: **Resend has one
 * Audience per account and `audience_id` is gone from the contacts API.** The
 * dashboard shows a singular "Audience" at /audience/ with no id in the URL and
 * no create-audience button; what used to be multiple audiences is now Segments
 * and Topics inside that one. The endpoint is a flat `POST /contacts`, and
 * contacts are global to the account, keyed by email.
 *
 * That is not a cosmetic change. The old code refused to run (503) unless
 * `RESEND_AUDIENCE_ID` was set, and there is no longer any value to set it to —
 * so every confirmation would have failed, permanently, with a message blaming
 * a missing env var that cannot exist.
 *
 * ---------------------------------------------------------------------------
 * Why plain fetch and not the SDK
 * ---------------------------------------------------------------------------
 *
 * `resend` is a caret range (^4.8.0), so an install can move underneath us, and
 * its contacts surface has now moved twice. The installed 4.8.0 types still
 * require `audienceId` on `contacts.create` — i.e. the SDK we have is older
 * than the API we are calling. Raw fetch against a documented wire format is
 * the only way to reach the current endpoint without a dependency bump, and it
 * is why the migration cost nothing when the API changed.
 *
 * The wire format is snake_case even where the SDK's options are camelCase.
 * Re-verify against https://resend.com/docs/api-reference/contacts/create-contact
 * before changing anything here.
 */

const RESEND_API = 'https://api.resend.com';

/**
 * The contact property that records which surface someone subscribed from.
 *
 * Custom properties are pre-declared in the dashboard (Audience → Properties)
 * and this one exists as a string with no fallback, created 2026-08-25. If it
 * is ever deleted there, `setContactSource` starts failing — which is exactly
 * why it is a separate, non-fatal call rather than part of the create.
 */
export const SOURCE_PROPERTY = 'source';

export type ContactWriteResult = {
  ok: boolean;
  status: number;
  detail: string;
};

async function post(path: string, apiKey: string, body: unknown): Promise<ContactWriteResult> {
  const res = await fetch(`${RESEND_API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  return { ok: res.ok, status: res.status, detail: res.ok ? '' : await res.text() };
}

/**
 * Create the contact. This IS the consent record, so it carries nothing that
 * could make it fail for a reason unrelated to consent.
 *
 * Specifically: no `properties`. A custom property has to be declared in the
 * dashboard before it can be set, which puts a piece of someone else's UI state
 * on the critical path of the one write we are legally obliged to get right.
 * The signup surface is nice to have; the contact existing is not optional.
 * See `setContactSource` for the other half.
 */
export function createContact(email: string, apiKey: string): Promise<ContactWriteResult> {
  return post('/contacts', apiKey, { email, unsubscribed: false });
}

/**
 * Record the signup surface on an existing contact. Best-effort by design.
 *
 * Resend's contacts API is keyed by email as well as by id, so this needs no
 * id from the create call and is safe to replay.
 *
 * Until 2026-08-25 this was impossible — resend@4.8.0 has no contact-property
 * field at all, and `docs/prd/story-delivery-resend.md` §9.5 wrote off the loss:
 * the audience would not record which surface someone consented through, only
 * DataFast would, and DataFast holds analytics rather than a consent artefact.
 * Properties exist now, so the loss is recoverable, and recovering it while the
 * list is empty costs nothing.
 */
export function setContactSource(
  email: string,
  source: string,
  apiKey: string
): Promise<ContactWriteResult> {
  return post('/contacts', apiKey, {
    email,
    properties: { [SOURCE_PROPERTY]: source },
  });
}

/**
 * Is this non-2xx actually "the address is already on the list"?
 *
 * Deliberately narrow. A false positive is worse than the bug it guards
 * against: it would redirect someone to /subscribed without a contact having
 * been created, and the contact record is the ONLY consent artefact this design
 * keeps (docs/prd/story-delivery-resend.md §9.5). So this matches a plain
 * conflict, or an unprocessable-entity whose body says so in words, and lets
 * everything else fail loudly.
 *
 * Now more likely to fire than when it was written: contacts are global to the
 * account and keyed by email, so a returning subscriber is a collision on a
 * single flat namespace rather than within one audience.
 */
export function isAlreadySubscribed(status: number, detail: string): boolean {
  if (status === 409) return true;
  if (status !== 422) return false;
  return /already\s+(exists|registered|subscribed|in)/i.test(detail);
}
