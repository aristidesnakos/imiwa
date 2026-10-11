/**
 * Words on /play that make a promise, kept in one reviewed place.
 *
 * Not a client module, so a server page or a validator can import the real
 * object (a 'use client' module would hand a server importer a reference).
 */

/**
 * The phone-app fake door, reviewed as one block (as JLPT_RESULTS_SIGNUP_COPY
 * is in app/kanji/n5/quiz/page.tsx). Every line must stay true:
 *
 *  - There is no app, no date and no more game content promised.
 *  - The form joins the weekly story email, and it describes only what the
 *    app sends: the double opt-in confirmation, then the welcome email with an
 *    episode's quiz card, then the weekly Travels of Tan email.
 */
export const PLAY_APP_WAITLIST_COPY = {
  button: 'I’d play this as a phone app',
  /** Replaces the button on the results card once pressed. */
  ack: 'There is no app yet. More below.',
  heading: 'There is no Tan Dash app yet',
  body: 'Thanks for asking. If enough players ask for one, the weekly Travels of Tan email will say so first.',
  signup: {
    title: 'Get the weekly Travels of Tan email',
    description:
      'One short Japanese comic a week, written only in N5, with a quiz card on the words it teaches. It is a story email, not an app and not more of this game.',
    cta: 'Send me the stories',
    successTitle: 'Nearly there',
    successMessage:
      'Check your inbox for a confirmation link. Tap it to join, and we will send you the latest episode with its quiz card.',
    footnote:
      'We send one confirmation email first. Nothing else arrives until you tap it, and you can unsubscribe anytime.',
  },
} as const;
