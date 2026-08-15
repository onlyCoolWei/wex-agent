create or replace function public.health_check()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'status', 'ok',
    'timestamp', pg_catalog.now()
  );
$$;

grant execute on function public.health_check() to anon, authenticated, service_role;
