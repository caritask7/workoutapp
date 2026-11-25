-- =============================================================================
-- WORKOUT — schéma relationnel
-- Chaque table utilisateur porte user_id → auth.users et est protégée par RLS.
-- Les catalogues (muscles, exercices, aliments) sont partagés en lecture
-- (owner_id NULL) et acceptent des entrées privées (owner_id = utilisateur).
-- Les noms de colonnes sont la version snake_case des types TypeScript
-- (src/types/domain.ts) : le driver convertit automatiquement.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Profils
-- ----------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  display_name          text not null check (char_length(display_name) between 1 and 40),
  age                   smallint check (age between 13 and 100),
  height_cm             numeric(5,1) check (height_cm between 100 and 250),
  start_weight_kg       numeric(5,1) check (start_weight_kg between 30 and 300),
  target_weight_min_kg  numeric(5,1) check (target_weight_min_kg between 30 and 300),
  target_weight_max_kg  numeric(5,1) check (target_weight_max_kg between 30 and 300),
  level                 text not null default 'beginner' check (level in ('beginner','intermediate','advanced')),
  goal                  text not null default 'muscle_gain' check (goal in ('muscle_gain','strength','fat_loss','maintenance')),
  goal_notes            text not null default '' check (char_length(goal_notes) <= 280),
  training_days         smallint[] not null default '{1,3,5}',
  preferences           jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint profiles_target_range check (
    target_weight_min_kg is null or target_weight_max_kg is null or target_weight_min_kg <= target_weight_max_kg
  )
);

-- ----------------------------------------------------------------------------
-- Catalogue : muscles & exercices
-- ----------------------------------------------------------------------------
create table public.muscle_groups (
  id          text primary key,
  name        text not null,
  short_name  text not null,
  region      text not null check (region in ('upper','core','lower')),
  bias        text not null check (bias in ('push','pull','legs','core')),
  views       text[] not null
);

create table public.exercises (
  id                text primary key,
  owner_id          uuid references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 60),
  equipment         text not null check (equipment in ('barbell','dumbbell','machine','cable','bodyweight','kettlebell','other')),
  tracking_type     text not null check (tracking_type in ('weight_reps','reps','duration')),
  pattern           text not null,
  description       text not null default '',
  instructions      text[] not null default '{}',
  default_rest_sec  integer not null default 90 check (default_rest_sec between 0 and 600),
  created_at        timestamptz not null default now()
);
create index exercises_owner_idx on public.exercises (owner_id);

create table public.exercise_muscles (
  id           text primary key,
  owner_id     uuid references auth.users (id) on delete cascade,
  exercise_id  text not null references public.exercises (id) on delete cascade,
  muscle_id    text not null references public.muscle_groups (id),
  role         text not null check (role in ('primary','secondary')),
  position     smallint not null default 0,
  unique (exercise_id, muscle_id)
);
create index exercise_muscles_muscle_idx on public.exercise_muscles (muscle_id);

-- ----------------------------------------------------------------------------
-- Programmes & entraînements
-- ----------------------------------------------------------------------------
create table public.workout_programs (
  id                  uuid primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  name                text not null,
  description         text not null default '',
  duration_weeks      smallint not null default 12 check (duration_weeks between 1 and 52),
  sessions_per_week   smallint not null default 3 check (sessions_per_week between 1 and 7),
  start_date          date not null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index workout_programs_user_idx on public.workout_programs (user_id);
create unique index workout_programs_one_active on public.workout_programs (user_id) where is_active;

create table public.workouts (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  program_id  uuid references public.workout_programs (id) on delete set null,
  name        text not null check (char_length(name) between 1 and 60),
  focus       text not null default '',
  position    integer not null default 0,
  is_custom   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index workouts_user_idx on public.workouts (user_id, position);

create table public.workout_exercises (
  id                uuid primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  workout_id        uuid not null references public.workouts (id) on delete cascade,
  exercise_id       text not null references public.exercises (id),
  position          integer not null,
  sets              smallint not null check (sets between 1 and 10),
  reps_min          smallint check (reps_min between 1 and 100),
  reps_max          smallint check (reps_max between 1 and 100),
  duration_min_sec  integer check (duration_min_sec between 5 and 600),
  duration_max_sec  integer check (duration_max_sec between 5 and 600),
  rest_sec          integer not null default 90 check (rest_sec between 0 and 600),
  target_weight_kg  numeric(6,2) check (target_weight_kg between 0 and 500),
  notes             text not null default ''
);
create index workout_exercises_workout_idx on public.workout_exercises (workout_id, position);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

-- ----------------------------------------------------------------------------
-- Séances & séries
-- ----------------------------------------------------------------------------
create table public.workout_sessions (
  id               uuid primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  workout_id       uuid references public.workouts (id) on delete set null,
  workout_name     text not null,
  plan             jsonb not null,
  status           text not null check (status in ('in_progress','paused','completed','abandoned')),
  started_at       timestamptz not null,
  ended_at         timestamptz,
  paused_at        timestamptz,
  paused_ms        bigint not null default 0,
  current_index    integer not null default 0,
  rest_ends_at     timestamptz,
  notes            text not null default '',
  duration_sec     integer,
  total_volume_kg  numeric(10,1),
  total_sets       integer
);
create index workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);
create index workout_sessions_user_status_idx on public.workout_sessions (user_id, status);
create unique index workout_sessions_one_active on public.workout_sessions (user_id)
  where status in ('in_progress','paused');

create table public.workout_sets (
  id            uuid primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  session_id    uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id   text not null references public.exercises (id),
  plan_index    integer not null,
  set_number    integer not null,
  weight_kg     numeric(6,2) check (weight_kg between 0 and 500),
  reps          smallint check (reps between 0 and 200),
  duration_sec  integer check (duration_sec between 0 and 3600),
  rpe           numeric(3,1) check (rpe between 1 and 10),
  completed     boolean not null default false,
  completed_at  timestamptz
);
create index workout_sets_session_idx on public.workout_sets (session_id, plan_index, set_number);
create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id);

create table public.personal_records (
  id           uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  exercise_id  text not null references public.exercises (id),
  type         text not null check (type in ('max_weight','est_1rm','max_reps','max_set_volume','max_duration')),
  value        numeric(10,2) not null,
  weight_kg    numeric(6,2),
  reps         smallint,
  session_id   uuid not null references public.workout_sessions (id) on delete cascade,
  set_id       uuid not null references public.workout_sets (id) on delete cascade,
  achieved_at  timestamptz not null
);
create index personal_records_user_exercise_idx on public.personal_records (user_id, exercise_id, type);

-- ----------------------------------------------------------------------------
-- Corps
-- ----------------------------------------------------------------------------
create table public.body_measurements (
  id            uuid primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          date not null,
  weight_kg     numeric(5,1) check (weight_kg between 30 and 300),
  chest_cm      numeric(5,1) check (chest_cm between 40 and 200),
  arm_cm        numeric(4,1) check (arm_cm between 15 and 80),
  waist_cm      numeric(5,1) check (waist_cm between 40 and 200),
  thigh_cm      numeric(5,1) check (thigh_cm between 25 and 120),
  body_fat_pct  numeric(4,1) check (body_fat_pct between 2 and 60),
  notes         text not null default '',
  created_at    timestamptz not null default now(),
  unique (user_id, date)
);

create table public.progress_photos (
  id            uuid primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          date not null,
  storage_path  text not null,
  weight_kg     numeric(5,1),
  notes         text not null default '',
  created_at    timestamptz not null default now()
);
create index progress_photos_user_date_idx on public.progress_photos (user_id, date);

-- ----------------------------------------------------------------------------
-- Nutrition
-- ----------------------------------------------------------------------------
create table public.nutrition_goals (
  id              uuid primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  effective_from  date not null,
  calories        integer not null check (calories between 800 and 8000),
  protein_g       numeric(5,1) not null check (protein_g between 0 and 500),
  carbs_g         numeric(5,1) not null check (carbs_g between 0 and 1000),
  fat_g           numeric(5,1) not null check (fat_g between 0 and 400),
  created_at      timestamptz not null default now(),
  unique (user_id, effective_from)
);

create table public.foods (
  id                text primary key,
  owner_id          uuid references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 80),
  brand             text not null default '',
  source            text not null check (source in ('user','ciqual','label')),
  source_ref        text not null default '',
  unit              text not null default 'g' check (unit in ('g','ml')),
  kcal_per100       numeric(6,1) not null check (kcal_per100 between 0 and 900),
  protein_per100    numeric(5,2) not null check (protein_per100 between 0 and 100),
  carbs_per100      numeric(5,2) not null check (carbs_per100 between 0 and 100),
  fat_per100        numeric(5,2) not null check (fat_per100 between 0 and 100),
  fiber_per100      numeric(5,2) check (fiber_per100 between 0 and 100),
  serving_name      text not null default '',
  serving_quantity  numeric(7,1),
  created_at        timestamptz not null default now()
);
create index foods_owner_idx on public.foods (owner_id);
create index foods_name_idx on public.foods (lower(name) text_pattern_ops);

create table public.meals (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  type        text not null check (type in ('breakfast','lunch','snack','dinner')),
  name        text not null default '',
  created_at  timestamptz not null default now()
);
create index meals_user_date_idx on public.meals (user_id, date);

create table public.meal_items (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  meal_id     uuid not null references public.meals (id) on delete cascade,
  -- Pas de clé étrangère stricte : l'historique survit à la suppression d'un aliment
  -- personnel grâce à l'instantané (food_name + macros).
  food_id     text not null,
  food_name   text not null,
  quantity    numeric(7,1) not null check (quantity > 0 and quantity <= 5000),
  unit        text not null check (unit in ('g','ml')),
  kcal        numeric(7,1) not null,
  protein_g   numeric(6,1) not null,
  carbs_g     numeric(6,1) not null,
  fat_g       numeric(6,1) not null,
  created_at  timestamptz not null default now()
);
create index meal_items_meal_idx on public.meal_items (meal_id);
create index meal_items_user_created_idx on public.meal_items (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Horodatage automatique
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger workout_programs_touch before update on public.workout_programs
  for each row execute function public.touch_updated_at();
create trigger workouts_touch before update on public.workouts
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.muscle_groups      enable row level security;
alter table public.exercises          enable row level security;
alter table public.exercise_muscles   enable row level security;
alter table public.workout_programs   enable row level security;
alter table public.workouts           enable row level security;
alter table public.workout_exercises  enable row level security;
alter table public.workout_sessions   enable row level security;
alter table public.workout_sets       enable row level security;
alter table public.personal_records   enable row level security;
alter table public.body_measurements  enable row level security;
alter table public.progress_photos    enable row level security;
alter table public.nutrition_goals    enable row level security;
alter table public.foods              enable row level security;
alter table public.meals              enable row level security;
alter table public.meal_items         enable row level security;

-- Profil : une seule ligne, celle de l'utilisateur.
create policy "profiles_own" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Muscles : lecture seule pour tous les utilisateurs connectés.
create policy "muscle_groups_read" on public.muscle_groups
  for select to authenticated using (true);

-- Catalogues partagés + entrées privées.
do $$
declare t text;
begin
  foreach t in array array['exercises','exercise_muscles','foods'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (owner_id is null or owner_id = (select auth.uid()))', t || '_read', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (owner_id = (select auth.uid()))', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (owner_id = (select auth.uid()))', t || '_delete_own', t);
  end loop;
end $$;

-- Données strictement personnelles.
do $$
declare t text;
begin
  foreach t in array array[
    'workout_programs','workouts','workout_exercises','workout_sessions','workout_sets',
    'personal_records','body_measurements','progress_photos','nutrition_goals','meals','meal_items'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_own', t);
  end loop;
end $$;

-- Cohérence inter-tables : un enfant ne peut pointer que vers un parent du même utilisateur.
create or replace function public.assert_same_owner() returns trigger
language plpgsql security invoker as $$
declare parent_owner uuid;
begin
  if tg_table_name = 'workout_exercises' then
    select user_id into parent_owner from public.workouts where id = new.workout_id;
  elsif tg_table_name = 'workout_sets' then
    select user_id into parent_owner from public.workout_sessions where id = new.session_id;
  elsif tg_table_name = 'meal_items' then
    select user_id into parent_owner from public.meals where id = new.meal_id;
  elsif tg_table_name = 'personal_records' then
    select user_id into parent_owner from public.workout_sessions where id = new.session_id;
  end if;
  if parent_owner is distinct from new.user_id then
    raise exception 'Parent introuvable ou appartenant à un autre utilisateur';
  end if;
  return new;
end $$;

create trigger workout_exercises_owner before insert or update on public.workout_exercises
  for each row execute function public.assert_same_owner();
create trigger workout_sets_owner before insert or update on public.workout_sets
  for each row execute function public.assert_same_owner();
create trigger meal_items_owner before insert or update on public.meal_items
  for each row execute function public.assert_same_owner();
create trigger personal_records_owner before insert or update on public.personal_records
  for each row execute function public.assert_same_owner();

-- ----------------------------------------------------------------------------
-- Storage : photos de progression (bucket privé, dossier = user id)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 8388608, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "progress_photos_own_objects" on storage.objects
  for all to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
