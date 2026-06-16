create extension if not exists "pgcrypto";

create table if not exists user_health_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  age integer,
  sex text,
  height_cm numeric,
  weight_kg numeric,
  waist_cm numeric,
  smoking_status text,
  physical_activity_level text,
  has_heart_disease boolean,
  has_stroke boolean,
  has_high_blood_pressure boolean,
  has_diabetes boolean,
  has_lung_disease boolean,
  has_kidney_disease boolean,
  family_heart_history text,
  cholesterol_status text,
  blood_sugar_status text,
  consent_to_autofill boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_health_profile enable row level security;

drop policy if exists "Users can select own health profile" on user_health_profile;
create policy "Users can select own health profile"
  on user_health_profile
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own health profile" on user_health_profile;
create policy "Users can insert own health profile"
  on user_health_profile
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own health profile" on user_health_profile;
create policy "Users can update own health profile"
  on user_health_profile
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own health profile" on user_health_profile;
create policy "Users can delete own health profile"
  on user_health_profile
  for delete
  using (auth.uid() = user_id);
