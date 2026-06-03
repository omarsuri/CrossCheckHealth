-- Product image scraping pipeline support.
-- Safe to run multiple times.

alter table products add column if not exists image_source_url text;
alter table products add column if not exists image_checked_at timestamptz;
alter table products add column if not exists image_search_url text;
alter table products add column if not exists image_status text;

create table if not exists product_image_candidates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  candidate_url text not null,
  source_page text,
  source_domain text,
  confidence_score numeric,
  width int,
  height int,
  status text default 'pending',
  created_at timestamptz default now(),
  unique(product_id, candidate_url)
);
