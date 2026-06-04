import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'MichiKanji – Interactive Japanese Kanji Dictionary';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand colours (from globals.css)
const DEEP_OCEAN   = '#1B365D';
const CORAL_SUNSET = '#FF6B47';
const TEMPLE_STONE = '#FAF8F5';
const MOUNTAIN_MIST = '#2C5F7C';
const SAKURA_WATERS = '#7BB3D3';

// Decorative kanji shown behind the card
const BG_KANJI = ['漢', '字', '道', '学', '語', '本', '日', '書'];

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(145deg, ${DEEP_OCEAN} 0%, ${MOUNTAIN_MIST} 100%)`,
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative kanji grid in the background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexWrap: 'wrap',
            opacity: 0.08,
          }}
        >
          {Array.from({ length: 48 }).map((_, i) => (
            <span
              key={i}
              style={{
                width: '150px',
                height: '105px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '72px',
                color: TEMPLE_STONE,
              }}
            >
              {BG_KANJI[i % BG_KANJI.length]}
            </span>
          ))}
        </div>

        {/* Coral accent stripe on the left */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '10px',
            height: '100%',
            background: CORAL_SUNSET,
          }}
        />

        {/* Main card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            padding: '56px 72px',
            background: 'rgba(27, 54, 93, 0.72)',
            border: `2px solid rgba(123, 179, 211, 0.35)`,
            borderRadius: '24px',
            backdropFilter: 'blur(8px)',
            maxWidth: '900px',
            textAlign: 'center',
          }}
        >
          {/* Logo row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {/* Kanji badge */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '16px',
                background: CORAL_SUNSET,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                color: TEMPLE_STONE,
                fontWeight: 700,
                boxShadow: '0 4px 24px rgba(255,107,71,0.45)',
              }}
            >
              道
            </div>
            <span
              style={{
                fontSize: '52px',
                fontWeight: 800,
                color: TEMPLE_STONE,
                letterSpacing: '-1px',
              }}
            >
              MichiKanji
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: '120px',
              height: '3px',
              borderRadius: '2px',
              background: `linear-gradient(90deg, ${CORAL_SUNSET}, ${SAKURA_WATERS})`,
            }}
          />

          {/* Headline */}
          <p
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: TEMPLE_STONE,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Learn Japanese Kanji with Stroke Order
          </p>

          {/* Sub-headline */}
          <p
            style={{
              fontSize: '20px',
              color: SAKURA_WATERS,
              margin: 0,
              lineHeight: 1.5,
              maxWidth: '680px',
            }}
          >
            Interactive stroke order animations · JLPT N5–N1 · 2,000+ kanji
          </p>

          {/* JLPT badges */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => (
              <div
                key={level}
                style={{
                  padding: '6px 18px',
                  borderRadius: '999px',
                  background: 'rgba(123, 179, 211, 0.18)',
                  border: `1.5px solid ${SAKURA_WATERS}`,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: SAKURA_WATERS,
                }}
              >
                {level}
              </div>
            ))}
          </div>
        </div>

        {/* Domain tag bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '32px',
            fontSize: '18px',
            color: 'rgba(250, 248, 245, 0.5)',
            letterSpacing: '0.5px',
          }}
        >
          michikanji.com
        </div>
      </div>
    ),
    { ...size },
  );
}
