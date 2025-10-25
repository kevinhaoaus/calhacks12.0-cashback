# Cloudflare Email Worker

This Cloudflare Worker receives forwarded emails and sends them to the Reclaim.AI API for processing.

## Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Configure Email Routing

1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to Email → Email Routing
4. Enable Email Routing
5. Add a catch-all address that forwards to the worker

### 4. Deploy Worker

```bash
cd cloudflare-worker
wrangler deploy
```

### 5. Configure Email Route

In Cloudflare Dashboard:
1. Go to Email → Email Routing → Routes
2. Add route: `*@reclaim.ai` → Send to Worker → `reclaim-email-processor`

## Environment Variables

Set in Cloudflare Dashboard (Workers → Settings → Variables):

- `API_URL` - Your Reclaim.AI API endpoint (e.g., `https://your-app.vercel.app/api/webhooks/email`)
- `API_SECRET` - Secret key for authenticating webhook requests

## Testing

Send a test email to any address @your-domain and it will be forwarded to your API.

Example:
```
To: test@reclaim.ai
Subject: Test Receipt
Body: [Receipt content]
```

## How It Works

1. Email arrives at your domain
2. Cloudflare Email Routing forwards to Worker
3. Worker extracts email content
4. Worker POSTs to `/api/webhooks/email`
5. API processes with Claude AI
6. Purchase saved to database
