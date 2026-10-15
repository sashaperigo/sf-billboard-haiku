-- Run once in the Supabase SQL editor. Authors now auto-upvote their own haiku,
-- so give every existing haiku the +1 its author would have cast.
update public.haikus set upvotes = upvotes + 1;
