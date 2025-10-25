# 🚀 Reclaim.AI Quick Start

## ✅ Phase 1 Complete!

Your Reclaim.AI foundation is ready. Here's what to do next:

## 📋 Before You Start

You need accounts for:
1. [Supabase](https://supabase.com) - Database & Auth (Free tier available)
2. [Anthropic](https://console.anthropic.com) - Claude AI API (Free credits available)

## 🔧 Setup Steps (5 minutes)

### Step 1: Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy these to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Step 2: Deploy Database

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/schema.sql`
3. Paste and click "Run"
4. Verify 7 tables created

### Step 3: Anthropic API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create API key
3. Add to `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

### Step 4: Run the App

```bash
npm run dev
```

Visit: http://localhost:3000

## 🎯 Test It Out

1. Click "Sign Up"
2. Create account with email/password
3. Should redirect to dashboard
4. Try logging out and back in

## 📁 What You Have

```
✅ Landing page with features
✅ Authentication (signup/login/logout)
✅ Protected dashboard
✅ Database schema (7 tables)
✅ Anthropic Claude integration ready
✅ Beautiful UI with shadcn/ui
```

## 🏗️ Architecture Overview

```
User → Next.js App → Supabase (Auth + Database)
                  → Anthropic Claude (AI)
```

## 📖 Documentation

- `SETUP.md` - Detailed setup instructions
- `PROGRESS.md` - What was built in Phase 1
- `tasks/todo.md` - Full implementation plan
- `RECLAIM_AI_TECHNICAL_PLAN.md` - Complete technical spec

## 🐛 Troubleshooting

**Issue: Supabase connection error**
→ Check all 3 Supabase env vars are set

**Issue: 404 on dashboard**
→ Make sure you're logged in

**Issue: Port already in use**
→ App will auto-use next available port

## 🎬 What's Next?

Ready for Phase 2? We'll add:
- Email receipt processing
- Claude AI receipt extraction
- Purchase tracking
- Price monitoring

See `tasks/todo.md` for the roadmap!

## 💡 Tips

- Check `.env.local.example` for all available config
- Database has 20 retailers pre-seeded
- RLS (Row Level Security) enabled for data safety
- Middleware protects dashboard routes

---

**Need help?** Check `SETUP.md` for detailed instructions!
