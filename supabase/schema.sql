-- Run this in the Supabase SQL editor for a new project.

create table public.haikus (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  haiku_param text not null,   -- formatShareParam output, e.g. "p001,p045,p112"
  style_param text not null,   -- formatStyleParam output, e.g. "3.2,14.0,7.5"
  upvotes integer not null default 0,
  creator_name text not null default 'haikuguru'
    check (char_length(btrim(creator_name)) between 1 and 24)
);

alter table public.haikus enable row level security;

create policy "public can read haikus" on public.haikus
  for select to anon using (true);

create policy "public can insert haikus" on public.haikus
  for insert to anon with check (upvotes = 0);

-- No update/delete policy for anon at all -- direct UPDATE is blocked.
-- Upvoting goes only through this narrowly-scoped RPC:
create or replace function public.increment_upvote(haiku_id uuid)
returns public.haikus
language plpgsql
security definer
set search_path = public
as $$
declare result public.haikus;
begin
  update public.haikus set upvotes = upvotes + 1
  where id = haiku_id returning * into result;
  if result.id is null then raise exception 'haiku not found'; end if;
  return result;
end;
$$;

grant execute on function public.increment_upvote(uuid) to anon;

-- Lets a visitor retract their upvote. Never drops below zero.
create or replace function public.decrement_upvote(haiku_id uuid)
returns public.haikus
language plpgsql
security definer
set search_path = public
as $$
declare result public.haikus;
begin
  update public.haikus set upvotes = greatest(upvotes - 1, 0)
  where id = haiku_id returning * into result;
  if result.id is null then raise exception 'haiku not found'; end if;
  return result;
end;
$$;

grant execute on function public.decrement_upvote(uuid) to anon;
revoke all on public.haikus from anon;
grant select, insert on public.haikus to anon;
