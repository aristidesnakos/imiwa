# Japan-Inspired Frontend Redesign

**Status**: ✅ Shipped — color system is live
**Reconciled with code**: June 14, 2026
**Source of truth for the live palette**: `app/globals.css` + `tailwind.config.js`

## Summary

Imiwa's frontend was migrated from a subtle sepia/amber theme to a vibrant,
Japan-inspired palette (coral sunset, deep ocean, sakura) that evokes Japanese
landscapes and culture while keeping the interface clean and readable. **The
color system described below is implemented and live.** Some of the richer
visual ideas from the original proposal (layered mountain silhouettes, sakura
petal hover animations, dedicated cultural-connection section) remain aspirational
— see "Implemented vs. Aspirational" at the bottom.

## Live Color Palette (as-built)

Defined as CSS custom properties at the top of `app/globals.css`:

| Token | Hex | Role |
|-------|-----|------|
| `--coral-sunset` | `#FF6B47` | Main background accent (Japanese sunsets) |
| `--deep-ocean` | `#1B365D` | Primary / strong elements (deep waters) |
| `--mountain-mist` | `#2C5F7C` | Secondary elements (mountain silhouettes) |
| `--sakura-waters` | `#7BB3D3` | Accent highlights (temple waters) |
| `--cherry-blossom` | `#F4A6CD` | Call-to-action (sakura petals) |
| `--temple-stone` | `#FAF8F5` | Card / surface backgrounds (traditional stone) |
| `--ink-black` | `#1A1A1A` | Primary text (calligraphy ink) |

### Semantic mapping (how the tokens are wired)

```css
--background:          var(--temple-stone);
--foreground:          var(--ink-black);
--primary:             var(--deep-ocean);
--primary-foreground:  var(--temple-stone);
--secondary:           var(--mountain-mist);
--accent:              var(--sakura-waters);
--muted-foreground:    var(--mountain-mist);
--ring:                var(--sakura-waters);
--border:              #E8EDF2;
```

Tailwind exposes these under a `japan` color namespace (`tailwind.config.js`), so
components use classes like `text-japan-*` / `bg-japan-*`.

### What was replaced

The previous sepia palette (`#fefcf7` background, `#d4a574` amber accent,
`#8b5a3c` brown secondary) is **no longer in the codebase**.

## Design Intent (rationale, retained)

### Color psychology & Japan connection
- **Coral Sunset** — famous Japanese sunsets; warmth and invitation.
- **Deep Ocean** — surrounding seas; stability and depth (primary text/elements).
- **Mountain Mist** — iconic mountain landscapes (Mt. Fuji).
- **Sakura Waters** — temple koi ponds and peaceful gardens.
- **Cherry Blossom** — instantly recognizable symbol of Japan; used for CTAs.
- **Temple Stone** — traditional architecture; calm surfaces.

The goal is to make a functional kanji tool feel like a cultural gateway —
subtly motivating learners toward Japan while improving emotional engagement.

## Accessibility & Performance Guardrails

- Maintain WCAG 2.1 AA contrast (deep-ocean text on temple-stone surfaces).
- Prefer CSS gradients over raster images for decorative patterns.
- Keep decorative pattern backgrounds (seigaiha waves, asanoha) lightweight.

## Implemented vs. Aspirational

**Implemented (live):**
- Full Japan-inspired color token system in `globals.css`.
- `japan` Tailwind color namespace used across components (Header, Footer, etc.).
- CSS gradient / pattern decorations using the palette (see `globals.css`).

**Aspirational (from the original proposal, not yet built):**
- Layered mountain-silhouette hero background.
- Sakura-petal hover animation on kanji cards.
- Dedicated "Experience Japan Through Every Character" cultural section.
- Feature renaming with torii / brush / map iconography.

## Success Metrics (to validate)

- Average session duration (+ target).
- Progression rate to kanji detail pages.
- Qualitative feedback on cultural authenticity / Japan-travel interest.
