# Project Structure

This project uses the Next.js App Router. Route files live under `app/`, reusable UI lives under `components/`, and Supabase/database files live under `supabase/`.

## Root Files

```text
frontend-CKH/
+-- app/
+-- components/
+-- data/
+-- lib/
+-- scripts/
+-- styles/
+-- supabase/
+-- types/
+-- .env.example
+-- .gitignore
+-- next.config.mjs
+-- package.json
+-- tailwind.config.ts
`-- tsconfig.json
```

## `app/`

Next.js routes and API routes.

```text
app/
+-- api/
|   +-- assessments/
|   +-- auth/
|   +-- dashboard/
|   +-- notifications/
|   +-- parents/
|   +-- products/
|   +-- results/
|   +-- support/
|   `-- users/
+-- assessment/
+-- dashboard/
+-- results/
+-- tools/
+-- privacy/
+-- terms/
+-- disclaimer/
+-- refunds/
+-- cookies/
+-- grievance/
+-- dpa/
+-- pricing/
`-- support/
```

Important product routes:

```text
app/tools/products/page.tsx
app/tools/products/scanner/page.tsx
app/api/products/route.ts
app/api/products/[id]/route.ts
app/api/products/comparisons/route.ts
app/api/products/comparisons/[id]/route.ts
```

## `components/`

Reusable frontend components grouped by feature.

```text
components/
+-- assessment/
+-- auth/
+-- dashboard/
+-- home/
+-- layout/
+-- legal/
+-- parents/
+-- pricing/
+-- products/
+-- results/
+-- shared/
+-- support/
+-- tools/
|   +-- body-fat/
|   +-- heart/
|   +-- pcos/
|   +-- products/
|   `-- raktasetu/
`-- ui/
```

Use `components/ui/` for generic UI building blocks like buttons, cards, badges, modals, and icons. Use feature folders for page-specific UI.

## `lib/`

Shared application logic, API helpers, Supabase clients, backend normalizers, and service functions.

```text
lib/
+-- api.ts
+-- supabase.ts
+-- backend/
+-- services/
+-- supabase/
`-- utils/
```

Supabase clients:

```text
lib/supabase.ts
lib/supabase/server.ts
lib/supabase/admin.ts
```

Product API normalization:

```text
lib/backend/product-normalizer.ts
```

## `data/`

Static and mock data used by frontend flows where backend integration is not final yet.

## `types/`

Shared TypeScript types.

```text
types/
+-- assessment.ts
+-- bloodwork.ts
+-- parent.ts
+-- product.ts
`-- user.ts
```

## `supabase/`

Database schema, migrations, product seed data, and import SQL.

```text
supabase/
+-- schema.sql
+-- seed-products.sql
+-- product-reference-ui-migration.sql
`-- import-indian-health-products.sql
```

Run SQL files in Supabase SQL Editor in this order when setting up a new database:

1. `schema.sql`
2. `product-reference-ui-migration.sql`
3. `seed-products.sql` or `import-indian-health-products.sql`

## `scripts/`

Utility scripts for testing or generating import data.

```text
scripts/
+-- generate_product_import_sql.py
`-- test-quick-heart.ps1
```

## Styling

Global styles:

```text
styles/globals.css
```

Tailwind theme:

```text
tailwind.config.ts
```

The current visual direction is warm cream backgrounds, navy text, teal accents, restrained terracotta warnings, rounded cards, and premium healthcare styling.
