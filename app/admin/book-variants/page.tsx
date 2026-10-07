import { BookCTA, type BookCardDesign } from '@/components/commerce/BookCTA';
import { KanjiN5WorkbookCTA } from '@/components/kanji/KanjiN5WorkbookCTA';
import { assertLocalOnlyPage } from '@/lib/sentences/local-only';

/**
 * /admin/book-variants — every book-offer design for the N5 sheets page, side
 * by side, each under the free pack exactly as the live page stacks them.
 * Local only, like the rest of /admin. The live page picks one in
 * app/free-resources/kanji-sheets/n5-sheets/page.tsx.
 */

const CARDS: { design: BookCardDesign; label: string }[] = [
  { design: 'current', label: 'Current: text only, outline button' },
  { design: 'cover', label: 'A. Cover: same words, the real cover beside them' },
  { design: 'nextStep', label: 'B. Next step: cover, copy answering the free pack, filled button' },
];

export default function BookVariantsPage() {
  assertLocalOnlyPage();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-japan-deep-ocean">Book offer variants (N5 sheets)</h1>
      {CARDS.map(({ design, label }) => (
        <section key={design} className="mt-12" data-variant={design}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-japan-mountain-mist">
            {label}
          </h2>
          <KanjiN5WorkbookCTA />
          <BookCTA surface="n5Sheets" variant="card" design={design} />
        </section>
      ))}
      <section className="mt-12" data-variant="inline">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-japan-mountain-mist">
          C. In the pack: one line under the free download, no card below
        </h2>
        <KanjiN5WorkbookCTA book={<BookCTA surface="n5Sheets" variant="inline" />} />
      </section>
    </main>
  );
}
