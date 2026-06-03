# Development Guide

This guide explains how coworkers should run, edit, and safely extend the SwasthyaSathi project.

## Local Setup

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Create `.env.local`:

```bash
cp .env.example .env.local
```

4. Add Supabase values to `.env.local`.
5. Start the app:

```bash
npm run dev
```

## Environment Variables

Required:

```text
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Rules:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be used in browser/client code.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must only be used in API routes, server utilities, or backend code.
- Never commit `.env.local`.

## Quality Checks

Before sharing changes:

```bash
npx tsc --noEmit
npm run build
```

If the build shows a multiple-lockfile warning, check whether the parent folder has an extra `package-lock.json`. The warning is not always fatal, but it should be cleaned before deployment if possible.

## Development Rules

- Keep changes scoped to the feature being edited.
- Do not change Supabase schema unless the task requires backend/database support.
- Do not change assessment, dashboard, parent profile, payment, or auth flows while editing the product UI unless the task asks for it.
- Keep frontend data fetching through existing API helpers/routes where possible.
- Do not paste large prototype HTML directly into React components. Convert designs into typed, reusable components.
- Keep TypeScript types explicit for product, assessment, user, and parent data.

## Product Comparison Area

The product compare page is one of the most active areas.

Main frontend files:

```text
app/tools/products/page.tsx
components/tools/products/ProductsPage.tsx
components/tools/products/ProductVisuals.tsx
components/tools/products/ProductScannerPage.tsx
```

Main API files:

```text
app/api/products/route.ts
app/api/products/[id]/route.ts
app/api/products/comparisons/route.ts
app/api/products/comparisons/[id]/route.ts
```

Main backend/helper file:

```text
lib/backend/product-normalizer.ts
```

Main database files:

```text
supabase/schema.sql
supabase/product-reference-ui-migration.sql
supabase/seed-products.sql
supabase/import-indian-health-products.sql
```

When changing product UI:

1. Keep backend API calls unchanged unless backend data is missing.
2. Use normalized product fields from the API.
3. Keep loading, error, empty, and logged-out states.
4. Preserve saved comparison behavior.
5. Test search, filters, detail modal, compare tray, and saved comparisons.

## Supabase Setup

For a fresh Supabase project:

1. Open Supabase SQL Editor.
2. Run `supabase/schema.sql`.
3. Run `supabase/product-reference-ui-migration.sql`.
4. Run either `supabase/seed-products.sql` for demo data or `supabase/import-indian-health-products.sql` for the imported product list.
5. Configure Row Level Security policies as needed for production.

Do not use the service role key in the browser. Use it only from server-side code.

## Common Tasks

### Add a New Page

1. Create a route in `app/`.
2. Create page UI under `components/` if it is more than a tiny page.
3. Add navigation links in the relevant layout/navigation component.
4. Run type check and build.

### Add a New API Route

1. Create `app/api/<feature>/route.ts`.
2. Validate input with Zod where possible.
3. Use Supabase server/admin helpers from `lib/supabase/`.
4. Return clear JSON error messages.
5. Do not expose server-only env variables.

### Add or Change Database Fields

1. Update `supabase/schema.sql` if the field belongs in the base schema.
2. Add a migration/patch SQL file if existing databases need to be updated.
3. Update API route select/insert/update logic.
4. Update TypeScript types.
5. Update frontend mapping/rendering.
6. Update seed/import SQL if relevant.

## Deployment Checklist

Before deployment:

- Remove local build artifacts: `.next`, `node_modules`, logs.
- Confirm `.gitignore` excludes build artifacts and env files.
- Run `npm install` from a clean checkout.
- Run `npx tsc --noEmit`.
- Run `npm run build`.
- Add production Supabase env vars in the deployment platform.
- Confirm API routes can reach Supabase.
- Check the product page, dashboard, auth state, assessment flows, and legal pages after deploy.

## Known Cleanup Items

- Avoid committing `node_modules` and `.next`.
- Replace placeholder legal contact emails before production.
- Strengthen TypeScript types when adding new backend fields.
- Keep moving static/mock frontend data into backend-backed APIs as the backend matures.
