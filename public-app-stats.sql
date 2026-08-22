drop function if exists public.get_public_app_stats();

create or replace function public.get_public_app_stats()
returns table (
  totaal_gelogde_wedstrijden bigint,
  gemiddeld_winstpercentage numeric,
  actieve_spelers bigint
)
language sql
security definer
set search_path = public
as $$
  with per_speler as (
    select
      user_id,
      count(*)::numeric as aantal_wedstrijden,
      (count(*) filter (where gewonnen = true))::numeric / nullif(count(*), 0) * 100
        as winstpercentage
    from public.wedstrijden
    group by user_id
  )
  select
    coalesce(sum(aantal_wedstrijden), 0)::bigint,
    coalesce(avg(winstpercentage), 0),
    count(*)
  from per_speler;
$$;

revoke all on function public.get_public_app_stats() from public;
grant execute on function public.get_public_app_stats() to anon, authenticated;