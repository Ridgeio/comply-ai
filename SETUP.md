# Setup Instructions

## Prerequisites

- Node.js 18+ and pnpm installed
- Supabase account (free tier works)

## Environment Setup

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Create a new project (or use existing)
3. Wait for the project to be ready

### 2. Get Your API Keys

1. Go to your project settings: `Settings → API`
2. Copy these values:
   - **Project URL**: `https://[your-project].supabase.co`
   - **Anon/Public Key**: `eyJ...` (safe for browser)
   - **Service Role Key**: `eyJ...` (keep secret, server-only!)

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

2. Edit `apps/web/.env.local` and add your values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 4. Set Up Database Tables

The app expects these tables to exist. Run this SQL in your Supabase SQL editor:

```sql
-- Organizations
CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction files
CREATE TABLE transaction_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  kind TEXT DEFAULT 'contract',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingest jobs for processing files
CREATE TABLE ingest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  tx_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_id UUID REFERENCES transaction_files(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'error')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  tx_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_id UUID REFERENCES transaction_files(id) ON DELETE CASCADE,
  issues JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingest_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust as needed)
-- Example: Users can see orgs they're members of
CREATE POLICY "Users can view their orgs" ON orgs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = orgs.id
      AND org_members.user_id = auth.uid()
    )
  );

-- Similar policies for other tables...
```

### 5. Create Storage Bucket

1. Go to your Supabase project → Storage
2. Create a new bucket called `transactions`
3. Set it to **Private** (not public)

### 6. Create a Test User and Organization

For development, you'll need at least one user and org:

```sql
-- After signing up a user through Supabase Auth, run:
-- Replace 'your-user-id' with the actual user ID from auth.users

-- Create a test organization
INSERT INTO orgs (name) VALUES ('Test Organization')
RETURNING id; -- Note this org ID

-- Add user to the organization
-- Replace with actual user_id and org_id
INSERT INTO org_members (org_id, user_id, role)
VALUES ('org-id-here', 'user-id-here', 'admin');
```

## Running the Application

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

## Testing

Run all tests:
```bash
pnpm test
```

Run tests for web app only:
```bash
pnpm test --filter @app/web
```

## Troubleshooting

### "Missing required environment variable" error
- Make sure you've created `.env.local` with all required variables
- Restart the dev server after adding environment variables

### "Transaction not found" or access errors
- Ensure your user is a member of an organization
- Check that RLS policies are configured correctly

### Storage upload fails
- Verify the `transactions` bucket exists and is set to private
- Check that your service role key is correct