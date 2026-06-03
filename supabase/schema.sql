create extension if not exists "pgcrypto";

create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text,
  email text,
  phone text,
  age int,
  gender text,
  country text,
  city text,
  plan text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  anonymous_id text,
  assessment_type text not null,
  risk_level text,
  risk_score int,
  result_summary text,
  is_anonymous boolean default false,
  created_at timestamptz default now()
);

create table if not exists assessment_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  question_id text not null,
  answer_value text not null,
  created_at timestamptz default now()
);

create table if not exists assessment_recommendations (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  title text not null,
  description text,
  priority text,
  recommendation_type text,
  created_at timestamptz default now()
);

create table if not exists body_fitness_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  inputs jsonb not null,
  result jsonb not null,
  created_at timestamptz default now()
);

create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  source_product_id text unique,
  category_id uuid references product_categories(id),
  category text,
  cat text,
  subcategory text,
  product_type text,
  primary_use text,
  form text,
  pack_variant text,
  diet_type text,
  price numeric,
  original_price numeric,
  price_unit text,
  currency text default 'INR',
  rating numeric,
  review_count int default 0,
  fssai_verified boolean default false,
  is_fssai_certified boolean default false,
  is_lab_tested boolean default false,
  is_sugar_free boolean default false,
  is_vegetarian boolean default false,
  safe_for_elderly boolean default false,
  diet_label text,
  verdict text,
  interpretation text,
  practical_take text,
  usp_headline text,
  usp_context text,
  label_image_url text,
  certifications jsonb default '[]'::jsonb,
  chips jsonb default '[]'::jsonb,
  ingredient_research text,
  main_ingredients jsonb default '[]'::jsonb,
  ingredient_source_url text,
  ingredient_source_name text,
  ingredient_verified boolean default false,
  ingredient_checked_at timestamptz,
  ingredient_review_status text default 'needs_review',
  consumer_transparency text,
  wellness_context text,
  exposure_interpretation text,
  evidence_strength text,
  wellness_markers jsonb default '[]'::jsonb,
  affiliate_url text,
  image_url text,
  image_source_url text,
  image_search_url text,
  image_status text,
  image_checked_at timestamptz,
  image_link_type text,
  image_verification_notes text,
  source_name text,
  source_url text,
  india_availability_evidence text,
  review_status text,
  source_notes text,
  last_checked date,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists product_scores (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  science_score int default 0,
  value_score int default 0,
  safety_score int default 0,
  parent_score int default 0,
  family_safety_score int default 0,
  transparency_score int default 0,
  efficacy_score int default 0,
  hype_score int default 0,
  overall_score int default 0,
  verdict text,
  verdict_key text,
  verdict_text text
);

create table if not exists product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  ingredient_name text not null,
  amount text,
  status text,
  evidence_level text,
  ingredient_type text,
  microcopy text
);

create table if not exists product_warnings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  warning_title text not null,
  warning_text text,
  severity text default 'medium',
  caution_label text
);

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

create table if not exists parent_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null,
  relation text not null,
  age int,
  gender text,
  email text,
  phone text,
  location text,
  notes text,
  status text default 'pending',
  latest_result text,
  last_assessment timestamptz,
  consent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists parent_invites (
  id uuid primary key default gen_random_uuid(),
  parent_profile_id uuid references parent_profiles(id) on delete cascade,
  token text not null unique,
  send_to_email text,
  send_to_phone text,
  status text default 'created',
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text,
  title text not null,
  message text,
  related_entity_type text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  status text default 'open',
  created_at timestamptz default now()
);
