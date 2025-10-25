# Reclaim.AI - UI Migration Plan

## Task: Migrate Better UI from landing-template

### Overview
Updating the current basic landing page UI with the polished, modern design from the landing-template folder.

### Plan

- [ ] **Copy and review all component dependencies**
  - Copy all UI components from landing-template/components/ui/
  - Copy custom components (header, hero-section, feature-cards, etc.)
  - Review and merge package.json dependencies

- [ ] **Update global styles and configuration**
  - Copy globals.css from landing-template
  - Update tailwind.config if needed
  - Copy any missing utility files (lib/utils.ts)

- [ ] **Replace landing page (src/app/page.tsx)**
  - Backup current page
  - Replace with new landing-template page
  - Update import paths to match src/ structure
  - Adjust routing for auth pages (/auth, /login, /signup)

- [ ] **Copy public assets**
  - Copy all images and SVGs from landing-template/public/
  - Verify image paths are correct

- [ ] **Test and verify**
  - Run dev server and check for errors
  - Verify all components render correctly
  - Test responsive design on mobile/tablet
  - Verify auth links work correctly

### Notes
- Keep existing authentication flow intact
- Maintain existing dashboard functionality
- Only update the landing page UI, not the entire app structure
