create table if not exists public.anonymous_polls (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 5 and 200),
  options text[] not null check (cardinality(options) between 2 and 4),
  created_at timestamptz not null default now()
);

create table if not exists public.anonymous_poll_votes (
  poll_id uuid not null references public.anonymous_polls (id) on delete cascade,
  voter_id uuid not null references auth.users (id) on delete cascade,
  option_index integer not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  primary key (poll_id, voter_id)
);

alter table public.anonymous_polls enable row level security;
alter table public.anonymous_poll_votes enable row level security;
revoke all on table public.anonymous_polls from public, anon, authenticated;
revoke all on table public.anonymous_poll_votes from public, anon, authenticated;

create table if not exists public.confession_share_events (
  id bigint generated always as identity primary key,
  message_id uuid references public.messages (id) on delete set null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  shared_at timestamptz not null default now()
);

create index if not exists confession_share_events_owner_time_idx
  on public.confession_share_events (owner_id, shared_at desc);

alter table public.confession_share_events enable row level security;
revoke all on table public.confession_share_events from public, anon, authenticated;

create or replace function public.record_confession_share_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.is_public and not old.is_public then
    insert into public.confession_share_events (message_id, owner_id)
    values (new.id, new.recipient_id);
  end if;
  return new;
end;
$function$;

revoke all on function public.record_confession_share_event() from public, anon, authenticated;
drop trigger if exists record_confession_share_after_publish on public.messages;
create trigger record_confession_share_after_publish
after update of is_public on public.messages
for each row execute function public.record_confession_share_event();

create or replace function public.get_confession_share_streak(p_time_zone text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  current_day date;
  day_start timestamptz;
  day_end timestamptz;
  streak_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Sign in to view your sharing streak' using errcode = '42501';
  end if;

  if p_time_zone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = p_time_zone
  ) then
    p_time_zone := 'UTC';
  end if;

  current_day := (pg_catalog.now() at time zone p_time_zone)::date;
  day_start := current_day::timestamp at time zone p_time_zone;
  day_end := (current_day + 1)::timestamp at time zone p_time_zone;

  if not exists (
    select 1 from public.confession_share_events
    where owner_id = auth.uid() and shared_at >= day_start and shared_at < day_end
  ) then
    current_day := current_day - 1;
  end if;

  loop
    day_start := current_day::timestamp at time zone p_time_zone;
    day_end := (current_day + 1)::timestamp at time zone p_time_zone;

    if exists (
      select 1 from public.confession_share_events
      where owner_id = auth.uid() and shared_at >= day_start and shared_at < day_end
    ) then
      streak_count := streak_count + 1;
      current_day := current_day - 1;
    else
      return streak_count;
    end if;
  end loop;
end;
$function$;

create or replace function public.create_anonymous_poll(p_question text, p_options text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  clean_question text;
  clean_options text[];
  poll_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to create a poll' using errcode = '42501';
  end if;

  clean_question := pg_catalog.btrim(coalesce(p_question, ''));
  if pg_catalog.char_length(clean_question) not between 5 and 200 then
    raise exception 'Poll questions must be between 5 and 200 characters' using errcode = '22023';
  end if;

  if p_options is null or cardinality(p_options) not between 2 and 4 then
    raise exception 'Polls need between 2 and 4 options' using errcode = '22023';
  end if;

  select pg_catalog.array_agg(pg_catalog.btrim(option_text) order by option_order)
  into clean_options
  from pg_catalog.unnest(p_options) with ordinality as options(option_text, option_order);

  if array_position(clean_options, null) is not null or exists (
    select 1 from pg_catalog.unnest(clean_options) as options(option_text)
    where pg_catalog.char_length(option_text) not between 1 and 80
  ) then
    raise exception 'Poll options must be between 1 and 80 characters' using errcode = '22023';
  end if;

  if (
    select pg_catalog.count(distinct pg_catalog.lower(option_text))
    from pg_catalog.unnest(clean_options) as options(option_text)
  ) <> cardinality(clean_options) then
    raise exception 'Poll options must be unique' using errcode = '22023';
  end if;

  insert into public.anonymous_polls (creator_id, question, options)
  values (auth.uid(), clean_question, clean_options)
  returning id into poll_id;

  return poll_id;
end;
$function$;

create or replace function public.get_anonymous_polls()
returns table (
  id uuid,
  question text,
  options text[],
  created_at timestamptz,
  vote_counts jsonb,
  total_votes bigint,
  my_vote integer
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p.id,
    p.question,
    p.options,
    p.created_at,
    coalesce((
      select pg_catalog.jsonb_agg(option_counts.vote_count order by option_counts.option_index)
      from (
        select g.option_index, pg_catalog.count(v.voter_id) as vote_count
        from pg_catalog.generate_series(0, cardinality(p.options) - 1) as g(option_index)
        left join public.anonymous_poll_votes as v
          on v.poll_id = p.id and v.option_index = g.option_index
        group by g.option_index
      ) as option_counts
    ), '[]'::jsonb),
    (select pg_catalog.count(*) from public.anonymous_poll_votes as v where v.poll_id = p.id),
    (select v.option_index from public.anonymous_poll_votes as v
      where v.poll_id = p.id and v.voter_id = auth.uid())
  from public.anonymous_polls as p
  order by p.created_at desc
  limit 100;
$function$;

create or replace function public.cast_anonymous_poll_vote(p_poll_id uuid, p_option_index integer)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  option_count integer;
  inserted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to vote in a poll' using errcode = '42501';
  end if;

  select cardinality(options) into option_count
  from public.anonymous_polls
  where id = p_poll_id;

  if not found then
    raise exception 'Poll not found' using errcode = 'P0002';
  end if;

  if p_option_index is null or p_option_index < 0 or p_option_index >= option_count then
    raise exception 'Choose a valid poll option' using errcode = '22023';
  end if;

  insert into public.anonymous_poll_votes (poll_id, voter_id, option_index)
  values (p_poll_id, auth.uid(), p_option_index)
  on conflict (poll_id, voter_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    raise exception 'You have already voted in this poll' using errcode = '23505';
  end if;
end;
$function$;

revoke all on function public.get_confession_share_streak(text) from public, anon, authenticated;
grant execute on function public.get_confession_share_streak(text) to authenticated;
revoke all on function public.create_anonymous_poll(text, text[]) from public, anon, authenticated;
grant execute on function public.create_anonymous_poll(text, text[]) to authenticated;
revoke all on function public.get_anonymous_polls() from public, anon, authenticated;
grant execute on function public.get_anonymous_polls() to anon, authenticated;
revoke all on function public.cast_anonymous_poll_vote(uuid, integer) from public, anon, authenticated;
grant execute on function public.cast_anonymous_poll_vote(uuid, integer) to authenticated;
