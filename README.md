# Reclaim.AI 💰

> Automatically recover money from your online purchases using AI

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green)](https://supabase.com/)
[![Anthropic](https://img.shields.io/badge/Claude-Sonnet%204.5-purple)](https://www.anthropic.com/)

## 🎯 What is Reclaim.AI?

Reclaim.AI is a post-purchase money recovery system that helps you:

- 📧 **Track purchases** via email receipt forwarding
- 🤖 **AI-powered analysis** of return policies with Claude
- 💵 **Monitor price drops** and get refund opportunities
- ✍️ **Auto-generate** professional refund request emails
- ⏰ **Never miss** a return window deadline

## ✨ Features

### Phase 1 (✅ Complete)
- User authentication (signup, login, logout)
- Protected dashboard
- Database schema with 7 tables
- Beautiful UI with shadcn/ui components
- Anthropic Claude integration ready

### Coming Soon
- Email receipt processing with OCR
- Automated purchase tracking
- Real-time price monitoring
- Smart refund request generation
- Notification system

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- [Supabase account](https://supabase.com) (free tier)
- [Anthropic API key](https://console.anthropic.com) (free credits available)

### Installation

1. **Clone and Install**
   ```bash
   cd Reclaim
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Create Supabase Project**
   - Visit [supabase.com](https://supabase.com)
   - Create new project
   - Copy Project URL and API keys to `.env.local`

4. **Deploy Database**
   - Open Supabase SQL Editor
   - Run the SQL in `supabase/schema.sql`

5. **Get Anthropic API Key**
   - Visit [console.anthropic.com](https://console.anthropic.com)
   - Generate API key
   - Add to `.env.local`

6. **Run Development Server**
   ```bash
   npm run dev
   ```

7. **Open** [http://localhost:3000](http://localhost:3000)

For detailed setup instructions, see **[QUICKSTART.md](QUICKSTART.md)**

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get up and running in 5 minutes
- **[SETUP.md](SETUP.md)** - Detailed setup guide
- **[PROGRESS.md](PROGRESS.md)** - Phase 1 implementation details
- **[tasks/todo.md](tasks/todo.md)** - Complete roadmap
- **[RECLAIM_AI_TECHNICAL_PLAN.md](RECLAIM_AI_TECHNICAL_PLAN.md)** - Full technical specification

## 🏗️ Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI:** shadcn/ui components
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** Anthropic Claude Sonnet 4.5
- **Price Tracking:** Bright Data (coming soon)
- **API Docs:** Postman (coming soon)

## 📁 Project Structure

```
Reclaim/
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── page.tsx        # Landing page
│   │   ├── login/          # Login page
│   │   ├── signup/         # Signup page
│   │   ├── dashboard/      # User dashboard
│   │   └── api/            # API routes
│   ├── components/ui/      # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/       # Database & auth clients
│   │   └── anthropic/      # Claude AI client
│   └── middleware.ts       # Route protection
├── supabase/
│   └── schema.sql          # Database schema
└── tasks/
    └── todo.md             # Implementation plan
```

## 🎯 Roadmap

- [x] **Phase 1:** Foundation (Auth, Database, UI)
- [ ] **Phase 2:** Email Processing & OCR
- [ ] **Phase 3:** Claude AI Receipt Parsing
- [ ] **Phase 4:** Price Tracking System
- [ ] **Phase 5:** Postman API Integration
- [ ] **Phase 6:** Polish & Demo

See [tasks/todo.md](tasks/todo.md) for detailed plan.

## 🧪 Testing

```bash
# Start dev server
npm run dev

# Test authentication
1. Visit http://localhost:3000
2. Click "Sign Up"
3. Create account
4. Verify redirect to dashboard
5. Test logout
```

## 🤝 Contributing

This is a hackathon project for Anthropic, Bright Data, and Postman prizes!

## 📄 License

MIT

## 🙏 Acknowledgments

- **Anthropic** - Claude AI for receipt parsing and refund generation
- **Bright Data** - Web scraping for price tracking
- **Postman** - API documentation and workflow automation
- **Supabase** - Database and authentication
- **Vercel** - Deployment platform

---

Built with ❤️ for smarter shopping
