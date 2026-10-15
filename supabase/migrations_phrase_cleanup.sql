-- Reconcile saved haikus with the phrases.json cleanup (commit 5530882).
-- Run in the Supabase SQL editor (anon can't update/delete). Idempotent.
--
-- haiku_param stores phrase ids, so text-only edits (p066, p104, p117, p215, p219)
-- need nothing. Only id-level changes matter:
--   p024 removed as a dupe of p036      -> remap to p036
--   p231 removed as a dupe of p170      -> remap to p170
--   p160 removed                        -> delete haikus using it
--   p131, p215, p219 relabeled 7 -> 5   -> they can no longer be the middle line, delete haikus using them
--   line 1 == line 3 after remapping    -> delete (parseShareParam rejects these)

-- 1. Preview what will change.
select id, haiku_param, upvotes, creator_name,
  case
    when string_to_array(haiku_param, ',') && array['p160','p131','p215','p219'] then 'DELETE'
    else 'REMAP'
  end as action
from public.haikus
where string_to_array(haiku_param, ',') && array['p024','p231','p160','p131','p215','p219']
order by action, created_at;

begin;

-- 2. Back up every affected row (RLS on, no policies: not readable via the anon key).
create table if not exists public.haikus_backup_phrase_cleanup (like public.haikus);
alter table public.haikus_backup_phrase_cleanup enable row level security;
insert into public.haikus_backup_phrase_cleanup
select * from public.haikus h
where string_to_array(h.haiku_param, ',') && array['p024','p231','p160','p131','p215','p219']
  and not exists (select 1 from public.haikus_backup_phrase_cleanup b where b.id = h.id);

-- 3. Remap duplicates to their surviving ids, keeping line order.
update public.haikus
set haiku_param = (
  select string_agg(case x when 'p024' then 'p036' when 'p231' then 'p170' else x end, ',' order by i)
  from unnest(string_to_array(haiku_param, ',')) with ordinality as t(x, i)
)
where string_to_array(haiku_param, ',') && array['p024','p231'];

-- 4. Delete haikus whose phrases were eliminated or can no longer fill their line,
--    plus any that now repeat the same phrase on lines 1 and 3.
delete from public.haikus
where string_to_array(haiku_param, ',') && array['p160','p131','p215','p219']
   or split_part(haiku_param, ',', 1) = split_part(haiku_param, ',', 3);

commit;
