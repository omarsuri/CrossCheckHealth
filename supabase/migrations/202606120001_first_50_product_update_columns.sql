alter table products add column if not exists main_ingredients jsonb default '[]'::jsonb;
alter table products add column if not exists key_specs jsonb default '[]'::jsonb;
alter table products add column if not exists ingredient_source_name text;
alter table products add column if not exists ingredient_source_url text;
alter table products add column if not exists ingredient_verified boolean default false;
alter table products add column if not exists ingredient_checked_at timestamptz;
alter table products add column if not exists ingredient_review_status text default 'needs_review';
