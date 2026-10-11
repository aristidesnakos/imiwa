/**
 * Words on /play that make a promise, kept in one reviewed place.
 *
 * Not a client module, so a server page or a validator can import the real
 * object (a 'use client' module would hand a server importer a reference).
 * app/subscribed/page.tsx imports `signup` for the waitlist's expired-link form.
 */

/**
 * The phone-app fake door, reviewed as one block (as JLPT_RESULTS_SIGNUP_COPY
 * is in app/kanji/n5/quiz/page.tsx). Every line must stay true:
 *
 *  - There is no app and no date for one, and no more game content is
 *    promised.
 *  - The form joins the app waitlist (source `play-app-waitlist`,
 *    lib/email/lists.ts), not the story list, so nothing here mentions the
 *    story email. The waitlist gets the double opt-in confirmation, then one
 *    email if a Tan Dash app ships, and nothing else: no welcome email,
 *    nothing regular, no game news.
 *  - No unsubscribe link is promised: the waitlist is sent nothing that could
 *    carry one until the launch email. The way off is a reply to the
 *    confirmation email, whose reply-to is a person (app/api/subscribe).
 *  - Every `signup` field is set. EmailCapture's defaults describe a general
 *    list ("new study material", "unsubscribe anytime"), which this is not.
 *
 * pnpm validate:play checks the words this list depends on.
 */
export const PLAY_APP_WAITLIST_COPY = {
  button: 'I’d play this as a phone app',
  /** Replaces the button on the results card once pressed. */
  ack: 'There is no app yet. More below.',
  heading: 'There is no Tan Dash app yet',
  body: 'And no date. Want to hear if one ships?',
  signup: {
    title: 'One email if an app ships',
    description: 'We will email you once, if a Tan Dash app ships. Nothing else.',
    cta: 'Email me if it ships',
    successTitle: 'Nearly there',
    successMessage: 'Tap the link in our confirmation email. Then you get one email if an app ships.',
    footnote: 'One confirmation email now, then nothing until an app ships. Reply to it to leave.',
  },
} as const;
