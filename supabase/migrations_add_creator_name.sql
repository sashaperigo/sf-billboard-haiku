-- Run once in the Supabase SQL editor on an existing project.
-- The default backfills every existing row with 'haikuguru'.
alter table public.haikus
  add column if not exists creator_name text not null default 'haikuguru'
    check (char_length(btrim(creator_name)) between 1 and 24);
