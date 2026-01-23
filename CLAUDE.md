# Gmail Dashboard

An AI-powered email dashboard built with Next.js for managing Gmail with intelligent classification and context-aware assistance.

## Quick Reference

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **State**: Zustand (stores in `lib/stores/`)
- **Auth**: NextAuth v5 (Google OAuth)
- **Database**: Prisma with PostgreSQL
- **AI**: Google Gemini API (@google/generative-ai)

## Architecture

### Directory Structure

```
app/                    # Next.js App Router pages & API routes
├── api/               # API endpoints
│   ├── ai/           # AI chat & analysis
│   ├── gmail/        # Gmail message fetching
│   └── classifications/  # Email classification
├── dashboard/         # Main dashboard page
└── login/            # Auth pages

components/            # React components
├── email/            # Email list, detail, filters
├── ai/               # AI assistant panel, feedback
├── layout/           # Header, sidebar, modals
├── theme/            # Theme provider & toggle
└── ui/               # Reusable UI primitives

lib/                   # Shared utilities
├── stores/           # Zustand state stores
├── gemini.ts         # Gemini AI client
├── gmail.ts          # Gmail API utilities
├── auth.ts           # NextAuth configuration
└── db.ts             # Prisma client
```

### State Management

Three Zustand stores in `lib/stores/`:
- **email-store**: Emails, selection, filters, classifications
- **ui-store**: Sidebar, detail panel, modals
- **ai-store**: Chat history, AI context

Pattern: Use `useStore.getState()` in event handlers outside React's event system, then trigger re-render with local state if needed.

### API Routes

All API routes are in `app/api/` using Next.js Route Handlers:
- Return `NextResponse.json()` for responses
- Use `auth()` from `lib/auth` for authentication
- Handle errors with try/catch and appropriate status codes

## Code Style

- Use TypeScript strict mode
- 2-space indentation
- Prefer `interface` over `type` for object shapes
- Use `cn()` utility from `lib/utils` for conditional classes
- Components: PascalCase files matching export name
- Utilities: camelCase

## Component Patterns

- Mark client components with `"use client"` directive
- Keep components focused; extract hooks for complex logic
- Use barrel exports (`index.ts`) in component directories
- Prefer composition over prop drilling

## AI Integration

- Gemini API calls go through `/api/ai/*` routes
- Use `gemini-2.5-flash-lite` for cost optimization
- Email context is built in `lib/gemini.ts` (`buildEmailContext`)
- Classifications stored in database via Prisma

## Git Workflow

- Branch naming: `feature/`, `fix/`, `chore/`
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Include `Co-Authored-By: Claude <noreply@anthropic.com>` for AI-assisted commits

## Environment Variables

Required in `.env.local`:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
GEMINI_API_KEY=
DATABASE_URL=
```

## Keyboard Shortcuts

The dashboard supports vim-style navigation:
- `j/k` or Arrow keys: Navigate emails
- `Enter/o`: Open email detail
- `Escape`: Close panel/clear selection
- `x`: Toggle selection
- `r`: Refresh
- `[`: Toggle sidebar
