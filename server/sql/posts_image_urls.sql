alter table public.posts
add column if not exists image_urls text[] null;
