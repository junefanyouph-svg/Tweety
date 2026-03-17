create table if not exists public.media_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  object_path text not null,
  media_url text not null,
  source_type text not null,
  source_id text not null,
  delete_after timestamptz not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null,
  last_error text null
);

create unique index if not exists media_cleanup_queue_bucket_object_path_idx
  on public.media_cleanup_queue (bucket, object_path);

create index if not exists media_cleanup_queue_pending_idx
  on public.media_cleanup_queue (delete_after)
  where deleted_at is null;
