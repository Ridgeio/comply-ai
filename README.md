# Comply AI

A production-ready compliance AI platform built with Next.js 14, TypeScript, and Turborepo.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Testing**: Vitest
- **Code Quality**: ESLint, Prettier
- **CI/CD**: GitHub Actions
- **Hosting**: Vercel-ready

## Project Structure

```
.
├── apps/
│   └── web/                 # Next.js 14 application
├── packages/
│   └── shared/              # Shared utilities and business logic
├── .github/
│   └── workflows/           # CI/CD pipelines
└── turbo.json              # Turborepo configuration
```

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm 8.15.1+

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd comply-ai
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment variables:
```bash
cp env.example .env.local
```

4. Configure your environment variables in `.env.local`

## Development

Run the development server:

```bash
# Run the Next.js app
pnpm dev --filter @app/web

# Or run all dev scripts in parallel
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages
- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run tests once
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier

## Testing

Run tests across the monorepo:

```bash
# Run all tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run tests for a specific package
pnpm test --filter @repo/shared
```

## Building for Production

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build --filter @app/web
```

## Deployment

This project is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Configure the following settings:
   - Framework Preset: Next.js
   - Build Command: `pnpm build --filter @app/web`
   - Output Directory: `apps/web/.next`
   - Install Command: `pnpm install`

## Environment Variables

Required environment variables (see `env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

MIT