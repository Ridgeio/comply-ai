# Monorepo Scaffold Task Onboarding

## Task Overview
Build a production-ready monorepo scaffold with TDD approach for a compliance AI application that will be hosted on Vercel.

## Tech Stack
- **Monorepo**: pnpm + Turborepo
- **Frontend**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **Testing**: Vitest (TDD approach)
- **Code Quality**: ESLint + Prettier
- **CI/CD**: GitHub Actions
- **Hosting**: Vercel

## Project Structure
```
.
├── apps/
│   └── web/                    # Next.js 14 app with App Router
├── packages/
│   └── shared/                 # Shared utilities, schemas, future rule engine
├── .github/
│   └── workflows/
│       └── ci.yml             # CI pipeline
├── turbo.json                 # Turborepo config
├── package.json               # Root package with workspaces
├── tsconfig.base.json         # Base TypeScript config
├── .nvmrc                     # Node version (v20)
├── env.example                # Environment variables template
└── README.md                  # Setup documentation
```

## TDD Implementation Steps

### Phase 1: Failing Test Setup
1. Create monorepo structure with pnpm workspaces
2. Set up packages/shared package
3. Write failing test: `packages/shared/src/math.spec.ts`
   - Import `sum` from `./math`
   - Test: `sum(2, 2)` expects **5** (intentionally wrong)
4. Configure Vitest in packages/shared
5. Add test scripts to root package.json
6. Print file tree and contents
7. **STOP** - User runs `pnpm install && pnpm test` to see failure

### Phase 2: Fix Test & Build App
1. Create `packages/shared/src/math.ts` with correct implementation
2. Update test to expect correct value (4)
3. Verify tests pass
4. Create Next.js 14 app in apps/web:
   - App Router structure
   - Layout with Tailwind and navigation
   - Home page with "Hello, Houston" card
   - Component using `sum` from shared package
5. Install shadcn/ui components:
   - button, card, table, badge, alert, select, input

### Phase 3: CI/CD & Documentation
1. Create GitHub Actions workflow
2. Create README with setup instructions
3. Create env.example with Supabase placeholders

## Key Requirements
- **Node**: 20+ (use .nvmrc)
- **Package Aliases**: Use `@repo/*` for internal packages
- **TypeScript**: Strict mode everywhere
- **No TODOs**: Generate complete, working code
- **TDD First**: Write failing tests before implementation

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Commands
- Development: `pnpm dev --filter @app/web`
- Testing: `pnpm test`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Type Check: `pnpm typecheck`

## Current State
- Repository is initialized with git
- Two existing files: plan.md and prompts.md
- Ready to implement monorepo structure following TDD approach