# Vercel Build Fix - Todo

## Problem 🐛
Vercel build is failing with this error:
```
Type error: Cannot find module 'dotenv' or its corresponding type declarations.
./scripts/test-bright-data.ts:2:25
```

## Root Cause 🔍
The `scripts/test-bright-data.ts` file is being included in TypeScript compilation during the Next.js build, but:
- `dotenv` is not in package.json dependencies
- The scripts folder is included in tsconfig.json (via `**/*.ts` pattern)
- This test script is not needed for production builds

## Solution Options

**Option 1: Exclude scripts folder from build** (Recommended - Simplest)
- Update `tsconfig.json` to exclude the `scripts/` directory
- Keeps test scripts separate from production code
- No additional dependencies needed

**Option 2: Add dotenv to dependencies**
- Add `dotenv` to devDependencies
- But still includes unnecessary test scripts in build

## Recommendation
**Use Option 1** because:
- The test script in `scripts/` is not needed for production
- Simpler fix with no new dependencies
- Follows best practice of excluding utility scripts from builds
- Minimal code change (1 line in tsconfig.json)

## Plan 📋

### Todo Items
- [x] Update `tsconfig.json` to exclude `scripts/` directory
- [x] Fix TypeScript error in scrape-price.ts
- [x] Test build locally to confirm fix

## Review 📝

### Summary of Changes
**Problem:** Vercel build failing with "Cannot find module 'dotenv'" error from scripts/test-bright-data.ts

**Root Cause:** Test scripts were being included in production TypeScript compilation

**Solution:** Excluded scripts directory from build + fixed TypeScript error

### Files Changed

1. **[tsconfig.json:33](tsconfig.json#L33)** (Modified)
   - Added `"scripts"` to the exclude array
   - Change: `"exclude": ["node_modules", "landing-template"]` → `"exclude": ["node_modules", "landing-template", "scripts"]`

2. **[src/lib/claude/scrape-price.ts:149](src/lib/claude/scrape-price.ts#L149)** (Modified)
   - Initialized `html` variable to prevent TypeScript error
   - Change: `let html: string;` → `let html: string = '';`

### Impact
- **Build Status:** Fixed - build now completes successfully ✅
- **Code Changes:** Minimal - 2 simple one-line changes
- **Dependencies:** No new dependencies added
- **Production:** Test scripts properly excluded from production builds

### Build Output
```
✓ Compiled successfully in 2.5s
✓ Generating static pages (18/18) in 408.7ms
```

**Vercel deployment should now work!** The build passes locally and will pass on Vercel.
