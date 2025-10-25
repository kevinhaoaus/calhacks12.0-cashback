# Reclaim.AI Setup Guide

## Phase 1: Foundation - COMPLETED ✅

### What We Built

1. **Next.js 14 Application** with TypeScript, Tailwind CSS, and App Router
2. **Supabase Integration** with authentication and database setup
3. **Authentication Flow** with login, signup, and dashboard pages
4. **UI Components** using shadcn/ui (Button, Card, Input, Form, Label)
5. **Database Schema** ready to deploy

### Project Structure

```
Reclaim/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── login/page.tsx           # Login page
│   │   ├── signup/page.tsx          # Signup page
│   │   ├── dashboard/page.tsx       # Main dashboard
│   │   └── api/
│   │       └── auth/
│   │           └── signout/route.ts # Signout endpoint
│   ├── components/ui/               # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/               # Supabase client utilities
│   │   │   ├── client.ts           # Browser client
│   │   │   ├── server.ts           # Server client
│   │   │   └── middleware.ts       # Auth middleware
│   │   └── anthropic/
│   │       └── index.ts            # Claude API client
│   └── middleware.ts               # Next.js middleware
├── supabase/
│   └── schema.sql                  # Database schema
├── tasks/
│   └── todo.md                     # Implementation plan
└── .env.local                      # Environment variables
```

## Next Steps: Deploy Database

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - Project name: `reclaim-ai`
   - Database password: (save this securely)
   - Region: (choose closest to you)

### 2. Get Supabase Credentials

After project creation:

1. Go to Settings → API
2. Copy these values to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (keep secret!)

### 3. Deploy Database Schema

1. In Supabase Dashboard, go to SQL Editor
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste and click "Run"
5. You should see tables created successfully

### 4. Get Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up / Login
3. Go to API Keys
4. Create new key
5. Add to `.env.local`:
   - `ANTHROPIC_API_KEY=sk-ant-xxx`

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` and you should see:
- Landing page with features
- Login/Signup working
- Dashboard accessible after login

## Environment Variables Checklist

Required for basic functionality:
- [x] `NEXT_PUBLIC_APP_URL` (default: http://localhost:3000)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ANTHROPIC_API_KEY`

Optional (for later phases):
- [ ] `BRIGHT_DATA_API_KEY`
- [ ] `BRIGHT_DATA_CUSTOMER_ID`
- [ ] `POSTMAN_API_KEY`
- [ ] `MINDEE_API_KEY`
- [ ] `RESEND_API_KEY`

## Testing Authentication

1. Go to `http://localhost:3000/signup`
2. Create an account
3. You should be redirected to `/dashboard`
4. Try logging out and back in

## Common Issues

### Issue: Supabase connection error
**Solution:** Check that all three Supabase env vars are set correctly

### Issue: Middleware redirect loop
**Solution:** Clear browser cookies and try again

### Issue: 404 on dashboard
**Solution:** Make sure you're logged in, middleware redirects to /login if not

## What's Next (Phase 2)

- Email processing with Cloudflare Workers
- Receipt OCR with Mindee
- Claude AI receipt extraction
- Purchase tracking in database

See `tasks/todo.md` for the full implementation plan!
