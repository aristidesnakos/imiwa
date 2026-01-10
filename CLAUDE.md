# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start development server  
- `pnpm build` - Build for production (includes postbuild sitemap generation)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm analyze` - Build with bundle analyzer

### Package Management
- Uses pnpm (version 9.15.4+) as package manager
- Install dependencies with `pnpm install`

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router and React Server Components
- **Styling**: Tailwind CSS + Radix UI components
- **Data Storage**: Client-side localStorage for progress tracking
- **Stroke Diagrams**: KanjiVG SVG integration with custom animation engine
- **Email**: Resend for contact form functionality
- **Deployment**: Vercel hosting

### Project Structure

#### Core Directories
- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable UI components (shadcn/ui + custom)
- `lib/` - Utility functions, kanji data, and service integrations
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions

#### Key Features

**Kanji Learning System**:
- JLPT level organization (N5, N4, N3, N2, N1) with kanji data in `lib/constants/`
- Interactive stroke order animations using KanjiVG data
- Progress tracking stored in browser localStorage
- Search functionality by character, meaning, or reading

**API Routes**:
- `app/api/kanji-svg/[hex]/route.ts` - Serves KanjiVG stroke order SVGs
- `app/api/webhook/resend/route.ts` - Handles contact form emails
- `app/robots.txt/route.ts` - Dynamic robots.txt generation
- `app/sitemap.xml/route.ts` - Dynamic sitemap generation

**Component Organization**:
- UI primitives in `components/ui/` (shadcn/ui based)
- Kanji-specific components for stroke order display and progress tracking
- Responsive design with mobile-first approach

**Data Architecture**:
- Kanji data structured with character, onyomi, kunyomi, and meaning fields
- Progress data tracks learned kanji with timestamps for analytics
- No user accounts - all data stored client-side for privacy
- JLPT level organization: N5 (~88), N4 (~170), N3 (~370), N2 (~370), N1 (~1000+) kanji

### Key Services

**KanjiVG Integration**: SVG stroke order diagrams fetched dynamically from external CDN
**Resend**: Contact form email delivery
**Analytics**: Client-side progress visualization with time-based charts

### Development Notes

- TypeScript with strict type checking for kanji data structures
- Client-side only data persistence - no database or authentication
- Optimized for mobile touch interaction and offline capability
- SEO optimized with sitemap generation and proper meta tags
- Performance focused with lazy loading of stroke diagrams
- ALWAYS refer to /documentation/learnings/development-guide.md for developing our project