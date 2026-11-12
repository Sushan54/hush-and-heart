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
