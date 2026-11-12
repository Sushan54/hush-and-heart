create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 3 and 500),
  is_public boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_recipient_created_idx
  on public.messages (recipient_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.messages enable row level security;

grant select on public.profiles to anon, authenticated;
grant update (username) on public.profiles to authenticated;
grant select, delete on public.messages to authenticated;
grant update (is_public, read_at) on public.messages to authenticated;
grant select on public.messages to anon;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Owners can read their messages and public messages" on public.messages;
create policy "Owners can read their messages and public messages"
  on public.messages for select
  to anon, authenticated
  using (is_public or auth.uid() = recipient_id);

drop policy if exists "Owners can update their messages" on public.messages;
create policy "Owners can update their messages"
  on public.messages for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "Owners can delete their messages" on public.messages;
create policy "Owners can delete their messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = recipient_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_username text;
begin
  new_username := pg_catalog.lower(
    pg_catalog.regexp_replace(
      coalesce(
        new.raw_user_meta_data ->> 'username',
        pg_catalog.split_part(coalesce(new.email, ''), '@', 1)
      ),
      '[^a-z0-9_]',
      '',
      'g'
    )
  );
  new_username := pg_catalog.left(new_username, 20);

  if pg_catalog.char_length(new_username) < 3 then
    new_username := 'user_' || pg_catalog.substr(pg_catalog.replace(new.id::text, '-', ''), 1, 12);
  elsif exists (select 1 from public.profiles where username = new_username) then
    new_username := pg_catalog.left(new_username, 11) || '_' || pg_catalog.substr(pg_catalog.replace(new.id::text, '-', ''), 1, 8);
  end if;

  insert into public.profiles (id, username)
  values (new.id, new_username);

  return new;
end;
$function$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.submit_anonymous_message(p_username text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_profile_id uuid;
  clean_message text;
begin
  if p_username is null or p_username !~ '^[a-zA-Z0-9_]{3,20}$' then
    raise exception 'Invalid username' using errcode = '22023';
  end if;

  clean_message := pg_catalog.btrim(coalesce(p_message, ''));
  if pg_catalog.char_length(clean_message) not between 3 and 500 then
    raise exception 'Message must be between 3 and 500 characters' using errcode = '22023';
  end if;

  select id into target_profile_id
  from public.profiles
  where username = pg_catalog.lower(p_username);

  if target_profile_id is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  insert into public.messages (recipient_id, content)
  values (target_profile_id, clean_message);
end;
$function$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.submit_anonymous_message(text, text) from public;
grant execute on function public.submit_anonymous_message(text, text) to anon, authenticated;

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction text not null check (reaction in ('heart', 'laugh', 'fire')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction)
);

alter table public.message_reactions enable row level security;
revoke all on table public.message_reactions from public, anon, authenticated;

create or replace function public.get_public_confessions()
returns table (
  id uuid,
  content text,
  created_at timestamptz,
  reactions jsonb,
  my_reactions jsonb
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    m.id,
    m.content,
    m.created_at,
    pg_catalog.jsonb_build_object(
      'heart', pg_catalog.count(r.message_id) filter (where r.reaction = 'heart'),
      'laugh', pg_catalog.count(r.message_id) filter (where r.reaction = 'laugh'),
      'fire', pg_catalog.count(r.message_id) filter (where r.reaction = 'fire')
    ),
    pg_catalog.jsonb_build_object(
      'heart', coalesce(pg_catalog.bool_or(r.reaction = 'heart' and r.user_id = auth.uid()), false),
      'laugh', coalesce(pg_catalog.bool_or(r.reaction = 'laugh' and r.user_id = auth.uid()), false),
      'fire', coalesce(pg_catalog.bool_or(r.reaction = 'fire' and r.user_id = auth.uid()), false)
    )
  from public.messages as m
  left join public.message_reactions as r on r.message_id = m.id
  where m.is_public
  group by m.id
  order by m.created_at desc
  limit 100;
$function$;

create or replace function public.set_public_confession_reaction(
  p_message_id uuid,
  p_reaction text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Sign in to react to confessions' using errcode = '42501';
  end if;

  if p_reaction is null or p_reaction not in ('heart', 'laugh', 'fire') or p_active is null then
    raise exception 'Invalid reaction' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.messages where id = p_message_id and is_public
  ) then
    raise exception 'Public confession not found' using errcode = 'P0002';
  end if;

  if p_active then
    insert into public.message_reactions (message_id, user_id, reaction)
    values (p_message_id, auth.uid(), p_reaction)
    on conflict do nothing;
  else
    delete from public.message_reactions
    where message_id = p_message_id
      and user_id = auth.uid()
      and reaction = p_reaction;
  end if;
end;
$function$;

revoke all on function public.get_public_confessions() from public, anon, authenticated;
grant execute on function public.get_public_confessions() to anon, authenticated;
revoke all on function public.set_public_confession_reaction(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.set_public_confession_reaction(uuid, text, boolean) to authenticated;

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

revoke all on function public.record_confession_share_event() from public, anon, authenticated;
revoke all on function public.get_confession_share_streak(text) from public, anon, authenticated;
grant execute on function public.get_confession_share_streak(text) to authenticated;
revoke all on function public.create_anonymous_poll(text, text[]) from public, anon, authenticated;
grant execute on function public.create_anonymous_poll(text, text[]) to authenticated;
revoke all on function public.get_anonymous_polls() from public, anon, authenticated;
grant execute on function public.get_anonymous_polls() to anon, authenticated;
revoke all on function public.cast_anonymous_poll_vote(uuid, integer) from public, anon, authenticated;
grant execute on function public.cast_anonymous_poll_vote(uuid, integer) to authenticated;
