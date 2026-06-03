alter table products add column if not exists main_ingredients jsonb default '[]'::jsonb;
alter table products add column if not exists ingredient_source_url text;
alter table products add column if not exists ingredient_source_name text;
alter table products add column if not exists ingredient_verified boolean default false;
alter table products add column if not exists ingredient_checked_at timestamptz;
alter table products add column if not exists ingredient_review_status text default 'needs_review';

update products
set ingredient_review_status = 'not_applicable_device',
    ingredient_checked_at = coalesce(ingredient_checked_at, now()),
    updated_at = now()
where lower(coalesce(category, cat, '')) = 'device';

update products
set ingredient_review_status = 'needs_review',
    updated_at = now()
where lower(coalesce(category, cat, '')) <> 'device'
  and (
    main_ingredients is null
    or jsonb_typeof(main_ingredients) <> 'array'
    or jsonb_array_length(main_ingredients) = 0
  )
  and coalesce(ingredient_verified, false) = false;
