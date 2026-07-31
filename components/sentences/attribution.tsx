import { cn } from '@/lib/utils';
import type { SentenceLicense, SentenceSource } from '@/lib/sentences/types';

const LICENSE_URL: Record<SentenceLicense, string> = {
  'CC BY 2.0 FR': 'https://creativecommons.org/licenses/by/2.0/fr/',
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
};

/**
 * The attribution block, per docs/prd/example-sentences-phase0-findings.md §3:
 * credit BOTH the project and the individual contributor, because Tatoeba does
 * not own the sentences and cannot waive contributors' droit de paternité on
 * their behalf.
 *
 * A null contributor is NORMAL — 40.2% of Japanese sentences are unadopted
 * Tanaka Corpus imports. It is not a quality signal and must never render as a
 * missing-data error. In that case project-level credit stands alone.
 *
 * Licence is read per side, never assumed corpus-wide: a CC0 Japanese sentence
 * paired with a CC BY English translation is a live case.
 */
export function Attribution({
  japanese,
  english,
  className,
}: {
  japanese: SentenceSource;
  english: SentenceSource;
  className?: string;
}) {
  const sameLicense = japanese.license === english.license;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground',
        className
      )}
    >
      <SideCredit label="JP" source={japanese} showLicense={!sameLicense} />
      <span aria-hidden className="text-border">
        ·
      </span>
      <SideCredit label="EN" source={english} showLicense={!sameLicense} />
      {sameLicense ? (
        <>
          <span aria-hidden className="text-border">
            ·
          </span>
          <LicenseLink license={japanese.license} />
        </>
      ) : null}
      <span aria-hidden className="text-border">
        ·
      </span>
      <a
        href="https://tatoeba.org"
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Tatoeba Project
      </a>
    </div>
  );
}

function SideCredit({
  label,
  source,
  showLicense,
}: {
  label: string;
  source: SentenceSource;
  showLicense: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-semibold text-foreground/70">{label}</span>
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer noopener"
        className="font-mono underline underline-offset-2 hover:text-foreground"
      >
        #{source.sentenceId}
      </a>
      {source.contributor ? (
        <>
          <span>by</span>
          <span className="font-medium text-foreground/80">{source.contributor}</span>
        </>
      ) : (
        // Not an error. Unadopted Tanaka Corpus import: project credit only.
        <span className="italic">— no individual contributor (Tanaka Corpus import)</span>
      )}
      {showLicense ? (
        <>
          <span aria-hidden>·</span>
          <LicenseLink license={source.license} />
        </>
      ) : null}
    </span>
  );
}

function LicenseLink({ license }: { license: SentenceLicense }) {
  return (
    <a
      href={LICENSE_URL[license]}
      target="_blank"
      rel="noreferrer noopener license"
      className="underline underline-offset-2 hover:text-foreground"
    >
      {license}
    </a>
  );
}
