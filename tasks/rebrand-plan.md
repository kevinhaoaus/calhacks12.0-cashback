# Rebrand Reclaim.AI to FairVal - Plan

## Files to Update

### Core Application Files (Priority)
1. **package.json** - Change project name
2. **src/app/layout.tsx** - Update metadata title and description
3. **src/components/header.tsx** - Update header branding
4. **src/components/hero-section.tsx** - Update hero text
5. **src/components/footer-section.tsx** - Update footer
6. **src/components/cta-section.tsx** - Update CTA text
7. **src/components/faq-section.tsx** - Update FAQ references
8. **src/components/documentation-section.tsx** - Update docs
9. **src/app/page.tsx** - Main landing page
10. **src/app/signup/page.tsx** - Signup page
11. **src/app/login/page.tsx** - Login page
12. **src/app/dashboard/page.tsx** - Dashboard
13. **src/app/notifications/page.tsx** - Notifications page
14. **src/app/test/page.tsx** - Test page

### API Routes
15. **src/app/api/refund/generate/route.ts** - Email generation
16. **src/app/api/webhooks/email/route.ts** - Email webhooks
17. **src/app/api/debug/route.ts** - Debug endpoint

### Documentation Files (Lower Priority)
- README.md
- RECLAIM_AI_TECHNICAL_PLAN.md
- SETUP.md
- DEPLOYMENT.md
- QUICKSTART.md
- Various other .md files

### Skip These
- landing-template/ folder (old template, not used)
- cloudflare-worker/ (separate service)
- package-lock.json (will auto-update)

## Replacement Strategy

- "Reclaim.AI" → "FairVal"
- "Reclaim AI" → "FairVal"
- "reclaim-ai" → "fairval" (in package names, etc.)
- "RECLAIM" → "FAIRVAL"

## Todo Items

- [ ] Update package.json name
- [ ] Update layout.tsx metadata
- [ ] Update all component files
- [ ] Update all app page files
- [ ] Update API routes
- [ ] Update key documentation files (README, SETUP, QUICKSTART)
- [ ] Test build
- [ ] Commit and push

Ready to proceed?
