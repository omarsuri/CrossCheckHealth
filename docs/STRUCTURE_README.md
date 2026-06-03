# SwasthyaSathi Frontend

SwasthyaSathi is a preventive healthcare web app built with Next.js, React, Tailwind CSS, TypeScript, and Supabase. It includes health assessments, a dashboard, parent/family profiles, RaktaSetu, PCOS risk flow, legal pages, and a product comparison tool.

## Tech Stack

- Next.js App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase
- Zod

## Getting Started

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project values.

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

If port `3000` is busy:

```bash
npm run dev -- --port 3001
```

## Useful Commands

```bash
npm run dev
npm run build
npx tsc --noEmit
npm run start
```

## Important Notes

- Do not commit `node_modules`, `.next`, `.env`, or `.env.local`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only on the server side. Never expose it in client components.
- Public Supabase keys must use the `NEXT_PUBLIC_` prefix.
- Product comparison currently uses the local Next.js API routes under `app/api/products`.
- Database schema and product SQL files live in `supabase/`.

## Main Features

- Landing page and app navigation
- Heart health quick and detailed assessments
- Body fat tool
- PCOS risk/reflection page
- RaktaSetu bloodwork page
- Product comparison tool
- Saved product comparisons
- Dashboard and assessment history
- Parent/family profile flows
- Legal, privacy, refund, cookie, grievance, and disclaimer pages

## Recommended Development Flow

1. Pull latest code.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Run `npx tsc --noEmit`.
5. Run `npm run dev`.
6. Make changes in small scoped commits.
7. Run `npx tsc --noEmit` and `npm run build` before sharing changes.

See `PROJECT_STRUCTURE.md` and `DEVELOPMENT_GUIDE.md` for more detail.
