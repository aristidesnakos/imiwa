# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm analyze` - Build with bundle analyzer

### Package Management
- Uses pnpm (version 9.15.4+) as package manager
- Install dependencies with `pnpm install`

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Database**: Supabase with SSR
- **Authentication**: Supabase Auth with custom magic link flow
- **Payments**: Stripe integration with webhooks
- **Styling**: Tailwind CSS + Radix UI components
- **Email**: Resend for transactional emails
- **Analytics**: PostHog for user analytics
- **AI**: OpenAI integration via ai-sdk

### Project Structure

#### Core Directories
- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable UI components (shadcn/ui + custom)
- `lib/` - Utility functions, configurations, and service integrations
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions
- `context/` - React Context providers

#### Key Patterns

**Authentication Flow**:
- Uses Supabase Auth with custom signin page at `/signin`
- Magic link authentication handled in `app/api/callback/route.ts`
- User context managed in `context/user.tsx`
- Protected routes use Supabase middleware

**API Structure**:
- Stripe integration: `app/api/stripe/` (checkout, portal, webhooks)
- Resend webhooks: `app/api/webhook/resend/`
- Secure signin endpoint: `app/api/secure-signin/`

**Component Organization**:
- UI primitives in `components/ui/` (shadcn/ui)
- Business components in `components/` root
- Section components in `components/sections/`
- Button variants in `components/buttons/`

**Configuration**:
- Main app config in `config.ts` with pricing plans
- Environment variables for Supabase, Stripe, OpenAI, PostHog, Resend
- TypeScript paths alias `@/*` points to project root

### Key Services

**Supabase**: Database and auth with client/server configurations in `lib/supabase/`
**Stripe**: Payment processing with webhook handling and portal management
**Resend**: Email templates in `lib/emails/` with HTML templates
**PostHog**: Analytics provider wrapped in `app/providers.tsx`

### Development Notes

- Uses TypeScript with `strict: false` but `noImplicitAny: true`
- Custom type definitions for external libraries in `types/`
- Blog functionality with markdown articles in `app/blog/_assets/articles/`
- Image optimization and performance hints in root layout
- SEO utilities in `lib/seo.tsx` and JSON-LD structured data