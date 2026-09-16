create unique index if not exists discovery_sessions_user_client_session_unique
  on public.discovery_sessions (user_id, client_session_id);
