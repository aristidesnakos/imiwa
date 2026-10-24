import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { getPrimaryMeaning } from '@/lib/seo/kanji-optimization';
import { redirectToBareImagePath } from '@/lib/seo/bare-image-path';
import {
  CHIP,
  HEADLINE,
  KANJI_SHARE_CARD_SIZE,
  kanjiShareCardChips,
  kanjiShareCardHeadline,
  type ShareCardChip,
} from '@/lib/seo/kanji-share-card';

/**
 * GET /kanji/<char>/share-card.png: the character page's own link card.
 *
 * Until 2026-10-23 every character page shared as the navy site-wide card
 * (/opengraph-image). This draws one card per character in the design of the
 * static quiz card (public/og/kanji-n5-quiz.jpg, `quizCard()` in
 * scripts/render-share-cards.ts): cream with a sage grid, a sage blob, the
 * glyph in a rotated framed tile, Tan pointing at it, and on the left the
 * level pill, the meaning, the reading chips and a tag line, with the page's
 * address at the foot. The page names it in its og:image (twitter inherits)
 * and as the Article JSON-LD's second image, through lib/seo/kanji-share-card.ts,
 * which also decides what the card says (the headline's lines and size, the
 * reading chips), so this file only draws and the alt text names what it shows.
 *
 * THE ONE EXCEPTION TO "N5 KANJI ONLY". The static cards set no kanji outside
 * the N5 list as text (scripts/render-share-cards.ts checks it). This card's
 * glyph, and the character in the address line, are the page's own character
 * at whatever JLPT level it is: the card is that character's. No other kanji
 * appears as text on it: the headline is English, the chips are kana and
 * romaji.
 *
 * PNG, from next/og. The static cards are JPEGs because next/og writes only
 * PNG; this one is drawn per request, and a 340px Tan keeps it at 229-247 kB
 * (measured 2026-10-23 across two dozen characters, the densest layouts
 * included), under the ~300 kB beyond which WhatsApp ignores an og:image. No
 * sharp.
 *
 * FONTS ARE FETCHED, unlike app/play/_og/: a card per character cannot ship
 * a committed subset per character. Each card asks Google Fonts for a `text=`
 * subset of just its own glyphs (Noto Serif JP 900 and 700, Noto Sans JP 500
 * and 700), and both the CSS and the font file go through the Data Cache
 * (`cache: 'force-cache'`), so a re-render does not refetch. The Data Cache
 * keeps only 200s, so a failure is never pinned. Satori reads TTF/OTF/WOFF,
 * never WOFF2, which is what the CSS API answers a browser; a fixed, non-browser
 * User-Agent gets the truetype URL every time.
 *
 * Tan is a real cutout, never mirrored: app/kanji/_og/tan-point.png, a 340px
 * downscale of public/assets/tan-point.png (`sips -Z 340`). It is read from
 * disk, so next.config.js names it in outputFileTracingIncludes.
 *
 * Colours are the renderer's palette constants. Kept as named constants: a hex
 * written straight into a style is what `pnpm validate:palette` rejects.
 */

// Never prerendered: 1,907 PNGs are not worth a build step. A request renders
// on demand and the response sits in the CDN for a day, like the diagram's.
export const dynamic = 'force-dynamic';

// The ceiling the sibling stroke-order.svg route uses for its upstream fetch.
export const maxDuration = 30;

// The same merge as app/kanji/[character]/page.tsx: N5 first, and `.find`
// takes the first match, so a character on two lists resolves to its lowest
// level, exactly as its page does. Only characters with a page get a card.
const ALL_KANJI_DATA = [
  ...N5_KANJI.map(k => ({ ...k, level: 'N5' as const })),
  ...N4_KANJI.map(k => ({ ...k, level: 'N4' as const })),
  ...N3_KANJI.map(k => ({ ...k, level: 'N3' as const })),
  ...N2_KANJI.map(k => ({ ...k, level: 'N2' as const })),
  ...N1_KANJI.map(k => ({ ...k, level: 'N1' as const })),
];

// The stroke-order.svg route's header: a day in the browser and the CDN, then a
// week of serving stale while the CDN refreshes. A deploy purges the CDN.
const CACHE_IMAGE = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

// Nothing that is not the image is cached anywhere. A failed font fetch is
// transient, and pinning it would hand every chat a broken card for a day.
const CACHE_NONE = 'no-store';

const SAGE = '#C0D8B4';
const SAGE_DEEP = '#9CB49C';
const TERRA = '#CC543C';
const TERRA_INK = '#9B3A26'; // terracotta deep enough to carry cream text
const INK = '#3E2F26';
const INK_2 = '#4A382E';
const CREAM = '#FAF6EE';
/** The 48px grid: SAGE at 32% alpha, as the renderer's `.grid`. */
const GRID_LINE = `${SAGE}52`;

const TAG_LINE = 'Stroke order, meaning and readings';
const SITE_HOST_LABEL = 'michikanji.com';
const FONT_USER_AGENT = 'MichiKanji share-card renderer';

/** Where the left column starts. Its width is HEADLINE.width (the helper's). */
const LEFT = 64;

// Malformed percent-encoding (a crawler requesting /kanji/%E6/...) makes
// decodeURIComponent throw. Fall back to the raw segment, which matches no
// kanji and so 404s, as the page does.
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function textResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': CACHE_NONE,
    },
  });
}

// ─── Assets ──────────────────────────────────────────────────────────────────

let tanDataUri: Promise<string> | null = null;

/** Read once per instance; a failed read is retried on the next request. */
function tan(): Promise<string> {
  tanDataUri ??= readFile(join(process.cwd(), 'app/kanji/_og/tan-point.png'))
    .then(buf => `data:image/png;base64,${buf.toString('base64')}`)
    .catch(error => {
      tanDataUri = null;
      throw error;
    });
  return tanDataUri;
}

function uniqueChars(text: string): string {
  return Array.from(new Set(Array.from(text))).join('');
}

/** A Google Fonts `text=` subset holding just `text`, as TTF. */
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(uniqueChars(text))}`;
  const css = await fetch(cssUrl, { cache: 'force-cache', headers: { 'User-Agent': FONT_USER_AGENT } });
  if (!css.ok) throw new Error(`${family} ${weight}: CSS answered ${css.status}`);
  const src = (await css.text()).match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!src) throw new Error(`${family} ${weight}: no TTF/OTF in the CSS`);
  const file = await fetch(src, { cache: 'force-cache' });
  if (!file.ok) throw new Error(`${family} ${weight}: font file answered ${file.status}`);
  return file.arrayBuffer();
}

// ─── The card ────────────────────────────────────────────────────────────────

function Chip({ chip, last }: { chip: ShareCardChip; last: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        border: `${CHIP.border}px solid ${SAGE_DEEP}`,
        background: CREAM,
        borderRadius: 14,
        padding: `8px ${CHIP.padX}px 10px`,
        marginRight: last ? 0 : CHIP.gap,
      }}
    >
      <span style={{ fontFamily: 'Serif', fontWeight: 700, fontSize: CHIP.kanaSize, color: INK }}>{chip.kana}</span>
      <span style={{ fontFamily: 'Sans', fontWeight: 500, fontSize: CHIP.romajiSize, color: SAGE_DEEP, marginLeft: CHIP.innerGap }}>
        {chip.romaji}
      </span>
    </div>
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const bare = redirectToBareImagePath(request);
  if (bare) return bare;

  const { character } = await params;
  const kanjiData = ALL_KANJI_DATA.find(k => k.kanji === safeDecode(character));

  if (!kanjiData) {
    return textResponse(404, 'No link card for this character.');
  }

  const { kanji, level } = kanjiData;
  const headline = kanjiShareCardHeadline(getPrimaryMeaning(kanjiData.meaning));
  const chipRows = kanjiShareCardChips(kanjiData);
  const pill = `JLPT ${level} kanji`;
  const path = `/kanji/${kanji}`;

  const serifText = kanji + headline.lines.join('') + chipRows.flat().map(c => c.kana).join('');
  const sansText =
    pill + pill.toUpperCase() + TAG_LINE + SITE_HOST_LABEL + path + chipRows.flat().map(c => c.romaji).join('');

  let fonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts'];
  try {
    const [serif900, serif700, sans500, sans700] = await Promise.all([
      googleFont('Noto Serif JP', 900, serifText),
      googleFont('Noto Serif JP', 700, serifText),
      googleFont('Noto Sans JP', 500, sansText),
      googleFont('Noto Sans JP', 700, sansText),
    ]);
    fonts = [
      { name: 'Serif', data: serif900, weight: 900, style: 'normal' },
      { name: 'Serif', data: serif700, weight: 700, style: 'normal' },
      { name: 'Sans', data: sans500, weight: 500, style: 'normal' },
      { name: 'Sans', data: sans700, weight: 700, style: 'normal' },
    ];
  } catch (error) {
    // A 502, never a 404: to a crawler or a link preview a 404 says the image
    // is gone for good, while a 5xx says try again, which is what this is.
    console.error(`share-card.png: fetching fonts failed for ${kanji}:`, error);
    return textResponse(502, 'The link card is temporarily unavailable.');
  }

  let png: ArrayBuffer;
  try {
    const tanSrc = await tan();
    // Rendered to the end before answering: ImageResponse renders while its
    // body streams, so a failure there would otherwise arrive as a broken 200
    // carrying CACHE_IMAGE.
    png = await new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: KANJI_SHARE_CARD_SIZE.width,
            height: KANJI_SHARE_CARD_SIZE.height,
            position: 'relative',
            background: CREAM,
            backgroundImage: `linear-gradient(${GRID_LINE} 1px, transparent 1px), linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
            fontFamily: 'Sans',
            color: INK,
          }}
        >
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              width: 560,
              height: 560,
              left: 600,
              top: 60,
              borderRadius: 999,
              background: SAGE,
              opacity: 0.55,
            }}
          />
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              left: 628,
              top: 96,
              width: 330,
              height: 330,
              transform: 'rotate(-4deg)',
              background: CREAM,
              border: `6px solid ${INK}`,
              borderRadius: 30,
              boxShadow: `12px 14px 0 ${SAGE_DEEP}`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: 'Serif', fontWeight: 900, fontSize: 236, lineHeight: 1, color: INK, marginTop: -14 }}>
              {kanji}
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image */}
          <img src={tanSrc} width={340} height={340} alt="" style={{ position: 'absolute', left: 880, top: 270 }} />
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              left: LEFT,
              top: 62,
              width: 560,
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                display: 'flex',
                background: TERRA_INK,
                color: CREAM,
                fontWeight: 700,
                fontSize: 19,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                padding: '9px 22px 10px',
                borderRadius: 999,
              }}
            >
              {pill}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: HEADLINE.width,
                marginTop: 28,
                fontFamily: 'Serif',
                fontWeight: 900,
                fontSize: headline.size,
                lineHeight: HEADLINE.lineHeight,
                color: INK,
              }}
            >
              {headline.lines.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </div>
            {chipRows.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30 }}>
                {chipRows.map((row, i) => (
                  <div key={i} style={{ display: 'flex', marginTop: i === 0 ? 0 : CHIP.gap }}>
                    {row.map((chip, j) => (
                      <Chip key={j} chip={chip} last={j === row.length - 1} />
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', marginTop: 24, fontWeight: 500, fontSize: 26, color: INK_2 }}>{TAG_LINE}</div>
          </div>
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              left: LEFT,
              bottom: 40,
              fontWeight: 700,
              fontSize: 24,
              color: INK_2,
            }}
          >
            {SITE_HOST_LABEL}
            <span style={{ color: TERRA }}>{path}</span>
          </div>
        </div>
      ),
      { ...KANJI_SHARE_CARD_SIZE, fonts }
    ).arrayBuffer();
  } catch (error) {
    console.error(`share-card.png: rendering failed for ${kanji}:`, error);
    return textResponse(500, 'The link card could not be drawn.');
  }

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': CACHE_IMAGE,
    },
  });
}
