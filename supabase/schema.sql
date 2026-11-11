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
