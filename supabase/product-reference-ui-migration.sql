-- Product comparison reference UI support.
-- Safe to run on an existing Supabase database; it only adds missing fields/tables.

alter table products add column if not exists price_unit text;
alter table products add column if not exists source_product_id text;
alter table products add column if not exists product_type text;
alter table products add column if not exists primary_use text;
alter table products add column if not exists pack_variant text;
alter table products add column if not exists is_fssai_certified boolean default false;
alter table products add column if not exists is_lab_tested boolean default false;
alter table products add column if not exists is_sugar_free boolean default false;
alter table products add column if not exists is_vegetarian boolean default false;
alter table products add column if not exists safe_for_elderly boolean default false;
alter table products add column if not exists diet_label text;
alter table products add column if not exists verdict text;
alter table products add column if not exists interpretation text;
alter table products add column if not exists practical_take text;
alter table products add column if not exists usp_headline text;
alter table products add column if not exists usp_context text;
alter table products add column if not exists label_image_url text;
alter table products add column if not exists certifications jsonb default '[]'::jsonb;
alter table products add column if not exists chips jsonb default '[]'::jsonb;
alter table products add column if not exists ingredient_research text;
alter table products add column if not exists consumer_transparency text;
alter table products add column if not exists wellness_context text;
alter table products add column if not exists exposure_interpretation text;
alter table products add column if not exists evidence_strength text;
alter table products add column if not exists wellness_markers jsonb default '[]'::jsonb;
alter table products add column if not exists image_search_url text;
alter table products add column if not exists image_status text;
alter table products add column if not exists image_source_url text;
alter table products add column if not exists image_checked_at timestamptz;
alter table products add column if not exists image_link_type text;
alter table products add column if not exists image_verification_notes text;
alter table products add column if not exists source_name text;
alter table products add column if not exists source_url text;
alter table products add column if not exists india_availability_evidence text;
alter table products add column if not exists review_status text;
alter table products add column if not exists source_notes text;
alter table products add column if not exists last_checked date;

alter table product_scores add column if not exists family_safety_score int default 0;

alter table product_ingredients add column if not exists ingredient_type text;
alter table product_ingredients add column if not exists microcopy text;

alter table product_warnings add column if not exists caution_label text;

create table if not exists product_tags (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  label text not null,
  tag_type text default 'tag',
  created_at timestamptz default now(),
  unique(product_id, label)
);

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

drop index if exists products_source_product_id_key;
create unique index if not exists products_source_product_id_key
on products(source_product_id);

update products
set
  is_fssai_certified = coalesce(is_fssai_certified, false) or coalesce(fssai_verified, false),
  diet_label = coalesce(diet_label, case when diet_type = 'veg' then 'Vegetarian' when diet_type = 'nonveg' then 'Non-Veg' when diet_type = 'vegan' then 'Vegan' else null end),
  is_vegetarian = coalesce(is_vegetarian, false) or diet_type in ('veg', 'vegan');

update product_scores
set family_safety_score = coalesce(nullif(family_safety_score, 0), parent_score, 0);
