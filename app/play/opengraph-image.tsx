import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { PLAY_OG_IMAGE } from '@/lib/play/seo';

/**
 * The /play share card: a pixel-arcade frame in the game's own palette, not
 * the site's. It is what a link to the game looks like in a chat or a feed, so
 * it shows the game: the sign, Tan mid-jump, and the kanji rolling in.
 *
 * app/play/page.tsx names this image explicitly (PLAY_OG_IMAGE in
 * lib/play/seo.ts) in its openGraph metadata, because getSEOTags always sets
 * `openGraph.images`, and Next only applies a file-convention image to a
 * segment whose metadata leaves that key unset. Twitter inherits it from
 * openGraph, so there is no twitter-image file.
 *
 * FONTS ARE COMMITTED, NOT FETCHED. app/play/_og/ holds two subsets cut by the
 * Google Fonts `text=` API with only the glyphs drawn here, so the build never
 * reaches the network and the card cannot change under it. Drawing a glyph
 * outside them (any new letter in the tagline, a new kanji tile) means cutting
 * the subset again: app/play/_og/OFL.txt says how, and what the licence asks.
 * Satori reads TTF/OTF/WOFF only, never WOFF2.
 *
 * Node runtime with no dynamic API, so the build prerenders it once
 * (.next/server/app/play/opengraph-image.body). `process.cwd()` is the project
 * root, as in Next's own example for local fonts.
 *
 * Colours are the prototype's (lib/play is the game's palette; the site tokens
 * in globals.css are for the site). Kept as named constants: a hex written
 * straight into a style is what `pnpm validate:palette` rejects.
 */

export const alt = PLAY_OG_IMAGE.alt;
export const size = { width: PLAY_OG_IMAGE.width, height: PLAY_OG_IMAGE.height };
export const contentType = 'image/png';

const CAB = '#1E1814';
const BEZEL = '#3A2E26';
const INK = '#2B211B';
const CREAM = '#FAF6EE';
const CREAM_2 = '#E9DFCB';
const MUTED = '#B9AC98';
const TERRA = '#CC543C';
const TERRA_DEEP = '#9B3A26';
const GOLD = '#E8B84A';
const SKY = '#DCEBD4';
const FAR = '#B3CBB0';
const MID = '#8FB08A';
const GRASS = '#6F9466';
const GRASS_HI = '#93B884';
const DIRT = '#4A382E';
const DIRT_2 = '#5C4739';

/** The sprite palette, from the prototype's PAL. */
const PAL: Record<string, string> = {
  k: INK,
  b: '#4A382E',
  f: '#967052',
  c: CREAM,
  r: TERRA,
  w: CREAM,
  p: '#E88C78',
  s: '#6E543E',
  g: GOLD,
  e: '#7A6A60',
};

/** Tan, jumping: the prototype's HEAD rows plus TAN_J's body. 16 x 16. */
const TAN_JUMP = [
  '..kk........kk..',
  '.kbbk......kbbk.',
  '.kbfkkkkkkkkfbk.',
  'krrrrrrrrrrrrrrk',
  'krrrrrrwwrrrrrrk',
  'kffffffffffffffk',
  'kffbbbbffbbbbffk',
  'kfbbkbbffbbkbbfk',
  'kffbbbccccbbbffk',
  '.kpffcckkccffpk.',
  '..kkfcccccccfkk.',
  'ks.kfccccccfkk..',
  'ksskffccccffbk..',
  '.kskfffffffffk..',
  '..kbbk...kbbk...',
  '..kkk.....kkk...',
];

const HEART = ['.kk.kk.', 'krrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'];

const PIXEL = 'Tan Dash Pixel';
const DOT = 'DotGothic16';

/**
 * A pixel sprite as absolutely positioned runs: one div per horizontal run of
 * one colour rather than one per pixel, so Tan is ~70 boxes, not ~200.
 */
function Sprite({ rows, scale, x, y }: { rows: string[]; scale: number; x: number; y: number }) {
  const runs: { x: number; y: number; w: number; ch: string }[] = [];
  rows.forEach((row, ry) => {
    let start = 0;
    for (let i = 1; i <= row.length; i++) {
      if (i === row.length || row[i] !== row[start]) {
        if (row[start] !== '.') runs.push({ x: start, y: ry, w: i - start, ch: row[start] });
        start = i;
      }
    }
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: rows[0].length * scale,
        height: rows.length * scale,
        display: 'flex',
      }}
    >
      {runs.map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: r.x * scale,
            top: r.y * scale,
            width: r.w * scale,
            height: scale,
            background: PAL[r.ch],
          }}
        />
      ))}
    </div>
  );
}

/** A kanji tile as the game draws it: ink rim, cream face, a cream-2 bevel right and below. */
function Tile({ c, x, y, s = 92 }: { c: string; x: number; y: number; s?: number }) {
  const rim = Math.round(s / 20);
  const bevel = rim * 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: s,
        height: s,
        display: 'flex',
        background: INK,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: rim,
          top: rim,
          width: s - rim * 2,
          height: s - rim * 2,
          display: 'flex',
          background: CREAM_2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: rim,
          top: rim,
          width: s - rim * 2 - bevel,
          height: s - rim * 2 - bevel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: CREAM,
          fontFamily: DOT,
          fontSize: Math.round(s * 0.66),
          lineHeight: 1,
          color: INK,
        }}
      >
        {c}
      </div>
    </div>
  );
}

/** The four gold pixels of a catch sparkle. */
function Sparkle({ x, y, p = 6 }: { x: number; y: number; p?: number }) {
  const dots = [
    [1, 0],
    [0, 1],
    [2, 1],
    [1, 2],
  ];
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: p * 3, height: p * 3, display: 'flex' }}>
      {dots.map(([dx, dy], i) => (
        <div
          key={i}
          style={{ position: 'absolute', left: dx * p, top: dy * p, width: p, height: p, background: GOLD }}
        />
      ))}
    </div>
  );
}

// The screen, in image pixels.
const SX = 520;
const SY = 40;
const SW = 624;
const SH = 496;
const RIM = 8;
const GROUND = SY + SH - 104; // top of the grass

export default async function Image() {
  const [pixel, dot] = await Promise.all([
    readFile(join(process.cwd(), 'app/play/_og/tan-dash-pixel.ttf')),
    readFile(join(process.cwd(), 'app/play/_og/dotgothic16-subset.ttf')),
  ]);

  const logo = {
    fontFamily: PIXEL,
    fontSize: 104,
    lineHeight: 1,
    letterSpacing: 6,
    textShadow: `8px 8px 0 ${TERRA_DEEP}, 13px 13px 0 ${INK}`,
  } as const;

  const signW = 404;
  const signX = SX + (SW - signW) / 2;
  const signY = SY + 28;
  const signH = 108;
  const band = 38;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          background: CAB,
        }}
      >
        {/* The cabinet's inner bezel. */}
        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 16,
            width: 1168,
            height: 598,
            display: 'flex',
            border: `4px solid ${BEZEL}`,
          }}
        />

        {/* Logo and HUD. */}
        <div
          style={{
            position: 'absolute',
            left: 64,
            top: 88,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ ...logo, display: 'flex', color: CREAM }}>TAN</div>
          <div style={{ ...logo, display: 'flex', color: GOLD, marginTop: 24 }}>DASH</div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 56 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: 'flex', position: 'relative', width: 56, height: 36, marginRight: 4 }}>
                <Sprite rows={HEART} scale={7} x={0} y={0} />
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                marginLeft: 20,
                fontFamily: PIXEL,
                fontSize: 34,
                lineHeight: 1,
                color: CREAM,
                textShadow: `4px 4px 0 ${INK}`,
              }}
            >
              004200
            </div>
          </div>
        </div>

        {/* The screen: ink rim, sky, hills, grass, dirt. */}
        <div
          style={{
            position: 'absolute',
            left: SX,
            top: SY,
            width: SW,
            height: SH,
            display: 'flex',
            background: INK,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: SX + RIM,
            top: SY + RIM,
            width: SW - RIM * 2,
            height: SH - RIM * 2,
            display: 'flex',
            background: SKY,
          }}
        />
        {[
          [SX + RIM, 120, 70],
          [SX + RIM + 110, 170, 110],
          [SX + RIM + 270, 140, 60],
          [SX + RIM + 400, 210, 96],
        ].map(([x, w, h], i) => (
          <div
            key={`far${i}`}
            style={{ position: 'absolute', left: x, top: GROUND - h, width: w, height: h, display: 'flex', background: FAR }}
          />
        ))}
        {[
          [SX + RIM + 40, 150, 34],
          [SX + RIM + 330, 190, 46],
        ].map(([x, w, h], i) => (
          <div
            key={`mid${i}`}
            style={{ position: 'absolute', left: x, top: GROUND - h, width: w, height: h, display: 'flex', background: MID }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: SX + RIM,
            top: GROUND,
            width: SW - RIM * 2,
            height: 16,
            display: 'flex',
            background: GRASS,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: SX + RIM,
            top: GROUND,
            width: SW - RIM * 2,
            height: 6,
            display: 'flex',
            background: GRASS_HI,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: SX + RIM,
            top: GROUND + 16,
            width: SW - RIM * 2,
            height: SY + SH - RIM - GROUND - 16,
            display: 'flex',
            background: DIRT,
          }}
        />
        {[40, 150, 230, 340, 470, 560].map((dx, i) => (
          <div
            key={`speck${i}`}
            style={{
              position: 'absolute',
              left: SX + RIM + dx,
              top: GROUND + 34 + (i % 3) * 18,
              width: 12,
              height: 6,
              display: 'flex',
              background: DIRT_2,
            }}
          />
        ))}

        {/* The sign. */}
        <div
          style={{
            position: 'absolute',
            left: signX,
            top: signY,
            width: signW,
            height: signH,
            display: 'flex',
            flexDirection: 'column',
            background: CREAM,
            border: `5px solid ${INK}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: band,
              background: TERRA,
              fontFamily: PIXEL,
              fontSize: 20,
              lineHeight: 1,
              color: CREAM,
              paddingTop: 2,
            }}
          >
            MEANS
          </div>
          <div
            style={{
              display: 'flex',
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: DOT,
              fontSize: 46,
              lineHeight: 1,
              color: INK,
            }}
          >
            mountain
          </div>
        </div>
        {[signX + 64, signX + signW - 64 - 14].map((x, i) => (
          <div
            key={`post${i}`}
            style={{ position: 'absolute', left: x, top: signY + signH, width: 14, height: 22, display: 'flex', background: INK }}
          />
        ))}

        {/* Tan, mid-jump, reaching for 山; the wrong ones roll in. */}
        <Sprite rows={TAN_JUMP} scale={10} x={SX + 40} y={GROUND - 196} />
        <Tile c="山" x={SX + 214} y={GROUND - 236} />
        <Sparkle x={SX + 306} y={GROUND - 252} />
        <Sparkle x={SX + 204} y={GROUND - 130} />
        <Tile c="日" x={SX + 488} y={GROUND - 226} />
        <Tile c="川" x={SX + 316} y={GROUND - 92} />
        <Tile c="人" x={SX + 412} y={GROUND - 92} />
        <Tile c="入" x={SX + 508} y={GROUND - 92} />

        {/* The line. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 560,
            width: 1200,
            display: 'flex',
            justifyContent: 'center',
            fontFamily: DOT,
            fontSize: 28,
            lineHeight: 1,
            color: MUTED,
          }}
        >
          A free one-thumb kanji game · all 82 JLPT N5 kanji · michikanji.com/play
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: PIXEL, data: pixel, weight: 400, style: 'normal' },
        { name: DOT, data: dot, weight: 400, style: 'normal' },
      ],
    },
  );
}
