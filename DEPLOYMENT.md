# Deployment Guide for Reclaim.AI

This guide will help you deploy Reclaim.AI to Vercel for the hackathon demo.

## Prerequisites

- GitHub account (already set up ✅)
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Supabase project (already set up ✅)
- Anthropic API key (already set up ✅)
- Bright Data API key (already set up ✅)

---

## Quick Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "Add New Project"

2. **Import Your Repository**
   - Select: `sajeevmagesh/calhacks12.0-cashback`
   - Branch: `kevin`
   - Framework Preset: Next.js
   - Root Directory: `./` (default)

3. **Configure Environment Variables**

   Click "Environment Variables" and add the following:

   **Important**: Copy these values from your `.env.local` file.

   ```
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

   ANTHROPIC_API_KEY=<your-anthropic-api-key>

   BRIGHT_DATA_API_KEY=<your-bright-data-api-key>
   BRIGHT_DATA_CUSTOMER_ID=<your-bright-data-customer-id>

   CRON_SECRET=<generate-a-random-secret>
   ```

   💡 **Tip**: You can find all these values in your local `.env.local` file. Just copy them over to Vercel.

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Once deployed, copy your deployment URL

5. **Update Environment Variable**
   - Go to your project settings
   - Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
   - Redeploy (Vercel will auto-redeploy)

---

### Option 2: Deploy via Vercel CLI (Advanced)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables (interactive)
vercel env add ANTHROPIC_API_KEY
vercel env add BRIGHT_DATA_API_KEY
# ... add all other variables

# Or deploy with all env vars at once
vercel --prod \
  -e NEXT_PUBLIC_SUPABASE_URL=https://hirzlkuklsoewbyiibsx.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -e ANTHROPIC_API_KEY=your_key
```

---

## Post-Deployment Steps

### 1. Update Supabase URL Whitelist

Go to your Supabase project settings and add your Vercel URL to the allowed URLs:

1. Visit [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Under "Site URL", add your Vercel deployment URL
5. Under "Redirect URLs", add:
   - `https://your-app.vercel.app/*`
   - `https://your-app.vercel.app/login`
   - `https://your-app.vercel.app/signup`

### 2. Test Your Deployment

Visit your deployed app and test:

1. **Authentication**: Sign up and log in
2. **Dashboard**: Check if forwarding email is generated
3. **Receipt Parsing**: Go to `/test` and test with sample receipts
4. **Database**: Verify purchases are saved

### 3. Verify Cron Jobs (Optional)

Vercel automatically sets up cron jobs from `vercel.json`. To verify:

1. Go to your Vercel project
2. Click "Settings" → "Cron Jobs"
3. You should see: "Check Prices" running every 6 hours

**Note**: Cron jobs are limited on the free tier. Consider upgrading to Vercel Pro ($20/month) for production use.

---

## What Works on Deployment

✅ **Fully Working**:
- User authentication (signup, login, logout)
- Dashboard with purchase tracking
- Claude AI receipt parsing via `/test` page
- Manual purchase creation
- Price tracking API endpoints
- Database integration

⚠️ **Limited Functionality**:
- **Cron jobs**: Limited on free tier (may not run reliably)
- **Price tracking**: API calls may timeout on free tier (10s limit)
- **Email forwarding**: Requires Cloudflare setup (optional for demo)

---

## Recommended Demo Flow (Without Email)

Since email forwarding requires additional Cloudflare setup, here's how to demo the app:

### 1. User Registration
- Show signup page
- Create a new account
- Demonstrate authentication flow

### 2. Dashboard Tour
- Point out the forwarding email (explain concept)
- Show the statistics cards
- Explain the features

### 3. Receipt Parsing Demo
- Navigate to `/test` page
- Use one of the sample receipts
- Click "Extract Data"
- Show Claude AI parsing in real-time
- Display extracted data: merchant, date, items, total

### 4. Price Tracking Demo (Manual)
- Explain the price tracking system
- Show the `/api/track-price` endpoint in code
- Demonstrate the Bright Data integration
- Show the cron job configuration

### 5. Architecture Overview
- Show `src/lib/claude/` - AI integration
- Show `src/lib/bright-data/` - Price tracking
- Show `src/app/api/` - API routes
- Explain the database schema

---

## Troubleshooting

### Build Fails

**Error**: Module not found
```bash
# Run locally first to check
npm install
npm run build

# Fix any TypeScript errors
npm run type-check
```

**Error**: Environment variables missing
- Double-check all env vars in Vercel dashboard
- Ensure no typos in variable names
- Redeploy after adding vars

### Database Errors

**Error**: User settings not created
- Make sure RLS policies are set up
- Run `supabase/fix-rls-policies.sql` in Supabase SQL Editor
- Check Supabase logs for permission errors

### API Timeouts

**Error**: Function timeout (10s limit on free tier)
- Bright Data price checks can take 10-30 seconds
- Upgrade to Vercel Pro for 60s timeout
- Or use the cron job for background processing

### Cron Jobs Not Running

- Free tier has limited cron reliability
- For the demo, manually call `/api/cron/check-prices` with:
  ```bash
  curl -X GET https://your-app.vercel.app/api/cron/check-prices \
    -H "Authorization: Bearer production_secret_key_change_this_randomly"
  ```

---

## Cost Analysis (Production)

### Free Tier (Perfect for Demo)
- ✅ Vercel Free: 100GB bandwidth, serverless functions
- ✅ Supabase Free: 500MB database, 2GB storage
- ✅ Anthropic Free: $5 in credits (thousands of receipts)
- ✅ Bright Data: Pay-as-you-go (trial available)

**Estimated demo cost**: $0-5

### Production Costs (If Scaling)
- Vercel Pro: $20/month (better timeouts, cron reliability)
- Supabase Pro: $25/month (better performance)
- Anthropic: ~$0.001 per receipt
- Bright Data: ~$0.005 per price check

**Estimated cost per user/month**: ~$0.85

---

## Next Steps After Deployment

1. **Test Everything**
   - Create test account
   - Parse sample receipts
   - Verify data in Supabase

2. **Prepare Demo Script**
   - Practice the demo flow
   - Prepare backup screenshots
   - Have sample receipts ready

3. **Optional Enhancements** (if time allows)
   - Set up Cloudflare Email Routing
   - Create demo video
   - Prepare pitch deck

---

## Support & Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **Supabase Setup**: [supabase.com/docs](https://supabase.com/docs)

---

## Quick Reference: Important URLs

After deployment, bookmark these:

- **Live App**: `https://your-app.vercel.app`
- **Dashboard**: `https://your-app.vercel.app/dashboard`
- **Test Page**: `https://your-app.vercel.app/test`
- **Debug Endpoint**: `https://your-app.vercel.app/api/debug`
- **Vercel Dashboard**: `https://vercel.com/dashboard`
- **Supabase Dashboard**: `https://supabase.com/dashboard`

---

**Good luck with your hackathon demo! 🚀**
