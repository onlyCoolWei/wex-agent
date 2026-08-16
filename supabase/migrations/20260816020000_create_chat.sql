create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid null references auth.users(id) on delete cascade,
  title text not null default '新对话'
    check (char_length(title) between 1 and 100),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  last_message_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_project_last_message_idx
  on public.conversations (project_id, last_message_at desc nulls last);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  run_id uuid null,
  client_message_id uuid null,
  role text not null check (role in ('user', 'assistant')),
  status text not null check (status in ('streaming', 'completed', 'failed', 'cancelled')),
  content jsonb not null default '{"schemaVersion":1,"parts":[]}'::jsonb,
  position bigint generated always as identity,
  error jsonb null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  unique (conversation_id, position)
);

create unique index messages_client_message_id_idx
  on public.messages (conversation_id, client_message_id)
  where client_message_id is not null;

create unique index messages_run_id_idx
  on public.messages (run_id)
  where run_id is not null;

create index messages_conversation_position_idx
  on public.messages (conversation_id, position desc);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_message_id uuid not null unique references public.messages(id) on delete cascade,
  assistant_message_id uuid not null unique references public.messages(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'cancelling', 'completed', 'failed', 'cancelled')),
  agent_id text not null default 'main-chat',
  agent_version text not null,
  model_alias text not null,
  model_config_version text not null,
  attempt_id uuid null,
  input_tokens integer null,
  output_tokens integer null,
  error_code text null,
  error_message text null,
  lease_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null
);

alter table public.messages
  add constraint messages_run_id_fkey
  foreign key (run_id) references public.agent_runs(id) on delete set null
  deferrable initially deferred;

create unique index agent_runs_one_active_per_conversation_idx
  on public.agent_runs (conversation_id)
  where status in ('queued', 'running', 'cancelling');

create index agent_runs_status_created_at_idx
  on public.agent_runs (status, created_at);

create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, sequence)
);

create index agent_events_run_sequence_idx
  on public.agent_events (run_id, sequence);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_events enable row level security;

create or replace function public.create_chat_run(
  p_conversation_id uuid,
  p_client_message_id uuid,
  p_content jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_assistant_id uuid := gen_random_uuid();
  v_run_id uuid := gen_random_uuid();
  v_now timestamptz := now();
  v_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_conversation_id::text, 0));

  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id and status = 'active'
  ) then
    raise exception 'CONVERSATION_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'userMessageId', m.id,
    'assistantMessageId', r.assistant_message_id,
    'runId', r.id
  )
  into v_result
  from public.messages m
  join public.agent_runs r on r.user_message_id = m.id
  where m.conversation_id = p_conversation_id
    and m.client_message_id = p_client_message_id;

  if v_result is not null then
    return v_result;
  end if;

  if exists (
    select 1 from public.agent_runs
    where conversation_id = p_conversation_id
      and status in ('queued', 'running', 'cancelling')
  ) then
    raise exception 'CONVERSATION_BUSY';
  end if;

  if jsonb_typeof(p_content) <> 'object'
    or p_content->>'schemaVersion' <> '1'
    or jsonb_array_length(coalesce(p_content->'parts', '[]'::jsonb)) <> 1
    or p_content->'parts'->0->>'type' <> 'text'
    or char_length(btrim(coalesce(p_content->'parts'->0->>'text', ''))) not between 1 and 20000
  then
    raise exception 'INVALID_MESSAGE_CONTENT';
  end if;

  insert into public.messages (
    id, conversation_id, client_message_id, role, status, content, completed_at
  ) values (
    v_user_id, p_conversation_id, p_client_message_id, 'user', 'completed', p_content, v_now
  );

  insert into public.messages (
    id, conversation_id, run_id, role, status, content
  ) values (
    v_assistant_id,
    p_conversation_id,
    v_run_id,
    'assistant',
    'streaming',
    '{"schemaVersion":1,"parts":[{"type":"text","text":""}]}'::jsonb
  );

  insert into public.agent_runs (
    id,
    conversation_id,
    user_message_id,
    assistant_message_id,
    agent_id,
    agent_version,
    model_alias,
    model_config_version
  ) values (
    v_run_id,
    p_conversation_id,
    v_user_id,
    v_assistant_id,
    'main-chat',
    '2026-08-16.1',
    'gpt-5.6-luna',
    '2026-08-16.2'
  );

  update public.conversations
  set last_message_at = v_now, updated_at = v_now
  where id = p_conversation_id;

  return jsonb_build_object(
    'userMessageId', v_user_id,
    'assistantMessageId', v_assistant_id,
    'runId', v_run_id
  );
end;
$$;

create or replace function public.claim_next_chat_run()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.agent_runs;
  v_stalled public.agent_runs;
  v_sequence integer;
begin
  for v_stalled in
    select *
    from public.agent_runs
    where status = 'running' and lease_expires_at < now()
    for update skip locked
  loop
    update public.messages
    set
      status = 'failed',
      error = jsonb_build_object(
        'code', 'RUN_STALLED',
        'message', '对话生成超时，请重新发送'
      ),
      completed_at = now()
    where id = v_stalled.assistant_message_id;

    update public.agent_runs
    set
      status = 'failed',
      error_code = 'RUN_STALLED',
      error_message = '对话生成超时，请重新发送',
      lease_expires_at = null,
      completed_at = now()
    where id = v_stalled.id;

    select coalesce(max(sequence), 0) + 1 into v_sequence
    from public.agent_events
    where run_id = v_stalled.id;

    insert into public.agent_events (run_id, sequence, type, payload)
    values (
      v_stalled.id,
      v_sequence,
      'run.failed',
      jsonb_build_object(
        'code', 'RUN_STALLED',
        'retryable', true,
        'message', '对话生成超时，请重新发送'
      )
    );
  end loop;

  with candidate as (
    select id
    from public.agent_runs
    where status = 'queued'
    order by created_at
    for update skip locked
    limit 1
  )
  update public.agent_runs r
  set
    status = 'running',
    attempt_id = gen_random_uuid(),
    started_at = now(),
    lease_expires_at = now() + interval '3 minutes'
  from candidate
  where r.id = candidate.id
  returning r.* into v_run;

  if v_run.id is null then
    return null;
  end if;

  return to_jsonb(v_run);
end;
$$;

create or replace function public.append_chat_event(
  p_run_id uuid,
  p_sequence integer,
  p_type text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agent_events (run_id, sequence, type, payload)
  values (p_run_id, p_sequence, p_type, p_payload);
end;
$$;

create or replace function public.append_chat_delta(
  p_run_id uuid,
  p_sequence integer,
  p_delta text,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
begin
  select assistant_message_id into v_message_id
  from public.agent_runs
  where id = p_run_id and status = 'running';

  if v_message_id is null then
    raise exception 'RUN_NOT_ACTIVE';
  end if;

  update public.messages
  set content = jsonb_build_object(
    'schemaVersion', 1,
    'parts', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_content))
  )
  where id = v_message_id;

  insert into public.agent_events (run_id, sequence, type, payload)
  values (
    p_run_id,
    p_sequence,
    'message.delta',
    jsonb_build_object('messageId', v_message_id, 'delta', p_delta)
  );
end;
$$;

create or replace function public.finish_chat_run(
  p_run_id uuid,
  p_sequence integer,
  p_status text,
  p_content text,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_error_code text default null,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
  v_message_status text;
  v_terminal_type text;
begin
  if p_status not in ('completed', 'failed', 'cancelled') then
    raise exception 'INVALID_RUN_STATUS';
  end if;

  select assistant_message_id into v_message_id
  from public.agent_runs
  where id = p_run_id and status in ('running', 'cancelling');

  if v_message_id is null then
    raise exception 'RUN_NOT_ACTIVE';
  end if;

  v_message_status := p_status;
  v_terminal_type := 'run.' || p_status;

  update public.messages
  set
    status = v_message_status,
    content = jsonb_build_object(
      'schemaVersion', 1,
      'parts', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_content))
    ),
    error = case
      when p_error_code is null then null
      else jsonb_build_object('code', p_error_code, 'message', p_error_message)
    end,
    completed_at = now()
  where id = v_message_id;

  update public.agent_runs
  set
    status = p_status,
    input_tokens = p_input_tokens,
    output_tokens = p_output_tokens,
    error_code = p_error_code,
    error_message = p_error_message,
    lease_expires_at = null,
    completed_at = now()
  where id = p_run_id;

  if p_status = 'completed' then
    insert into public.agent_events (run_id, sequence, type, payload)
    values (
      p_run_id,
      p_sequence,
      'message.completed',
      jsonb_build_object('messageId', v_message_id, 'content', p_content)
    );

    insert into public.agent_events (run_id, sequence, type, payload)
    values (p_run_id, p_sequence + 1, v_terminal_type, '{}'::jsonb);
  else
    insert into public.agent_events (run_id, sequence, type, payload)
    values (
      p_run_id,
      p_sequence,
      v_terminal_type,
      case
        when p_status = 'failed' then jsonb_build_object(
          'code', coalesce(p_error_code, 'INTERNAL_ERROR'),
          'retryable', true,
          'message', coalesce(p_error_message, '对话生成失败')
        )
        else '{}'::jsonb
      end
    );
  end if;
end;
$$;

comment on table public.conversations is 'User-visible chat conversations within a project';
comment on table public.messages is 'Canonical versioned user and assistant chat messages';
comment on table public.agent_runs is 'Durable execution queue and lifecycle for chat model runs';
comment on table public.agent_events is 'Replayable Wex event stream for an agent run';

revoke execute on function public.create_chat_run(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.claim_next_chat_run() from public, anon, authenticated;
revoke execute on function public.append_chat_event(uuid, integer, text, jsonb) from public, anon, authenticated;
revoke execute on function public.append_chat_delta(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.finish_chat_run(uuid, integer, text, text, integer, integer, text, text) from public, anon, authenticated;

grant execute on function public.create_chat_run(uuid, uuid, jsonb) to service_role;
grant execute on function public.claim_next_chat_run() to service_role;
grant execute on function public.append_chat_event(uuid, integer, text, jsonb) to service_role;
grant execute on function public.append_chat_delta(uuid, integer, text, text) to service_role;
grant execute on function public.finish_chat_run(uuid, integer, text, text, integer, integer, text, text) to service_role;
