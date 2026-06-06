# Supabase Setup

This project is prepared for Supabase, but both the site form and admin panel are in disabled/mock mode until a real project is created.

## 1. Create Tables

Open Supabase Dashboard -> SQL Editor -> New query, then run:

```sql
create extension if not exists "pgcrypto";

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  message text not null,
  is_read boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_created_at_idx
  on public.messages (created_at desc);

create index if not exists messages_active_idx
  on public.messages (archived_at, is_read);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text,
  alt_text text,
  placement text not null check (placement in ('9:16', '16:9')),
  image_url text not null,
  storage_bucket text,
  storage_path text,
  file_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gallery_items_placement_sort_idx
  on public.gallery_items (placement, sort_order, created_at desc);

create table if not exists public.portfolio_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  vimeo_url text not null,
  featured boolean not null default false,
  thumbnail_gif_url text,
  thumbnail_gif_storage_path text,
  thumbnail_gif_file_name text,
  poster_url text,
  poster_storage_path text,
  poster_file_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_videos_featured_sort_idx
  on public.portfolio_videos (featured desc, sort_order, created_at desc);

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on public.messages
to anon, authenticated;

grant select, insert, update, delete
on public.gallery_items
to anon, authenticated;

grant select, insert, update, delete
on public.portfolio_videos
to anon, authenticated;
```

Gallery is one table because both image formats are the same content type. The `placement` field stores the real image format: `9:16` or `16:9`.

If the project was created with the first `wide` / `strip` schema, run this migration once:

```sql
alter table public.gallery_items
drop constraint if exists gallery_items_placement_check;

update public.gallery_items
set placement = case
  when placement = 'wide' then '16:9'
  when placement = 'strip' then '9:16'
  else placement
end;

alter table public.gallery_items
add constraint gallery_items_placement_check
check (placement in ('9:16', '16:9'));
```

## 2. Create Storage Buckets

Create two public buckets in Supabase Dashboard -> Storage:

```text
cinemorph-gallery
cinemorph-video-media
```

The admin code will upload gallery files into:

```text
cinemorph-gallery/16-9
cinemorph-gallery/9-16
```

Video media will upload into:

```text
cinemorph-video-media/gifs
cinemorph-video-media/posters
```

## 3. Basic Public Policies

For first setup, use simple public read policies and anon insert/update/delete policies. This is fine while the admin page is local, but before a public launch we should add real auth.

If the tables already exist and Supabase returns `permission denied for table messages`, run this first:

```sql
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on public.messages
to anon, authenticated;

grant select, insert, update, delete
on public.gallery_items
to anon, authenticated;

grant select, insert, update, delete
on public.portfolio_videos
to anon, authenticated;
```

```sql
alter table public.messages enable row level security;
alter table public.gallery_items enable row level security;
alter table public.portfolio_videos enable row level security;

create policy "Anyone can create messages"
on public.messages
for insert
to anon
with check (true);

create policy "Anon admin can read messages"
on public.messages
for select
to anon
using (true);

create policy "Anon admin can update messages"
on public.messages
for update
to anon
using (true)
with check (true);

create policy "Anon admin can delete messages"
on public.messages
for delete
to anon
using (true);

create policy "Anyone can read gallery"
on public.gallery_items
for select
to anon
using (true);

create policy "Anon admin can manage gallery"
on public.gallery_items
for all
to anon
using (true)
with check (true);

create policy "Anyone can read videos"
on public.portfolio_videos
for select
to anon
using (true);

create policy "Anon admin can manage videos"
on public.portfolio_videos
for all
to anon
using (true)
with check (true);
```

Storage policies:

```sql
create policy "Public gallery files are readable"
on storage.objects
for select
to anon
using (bucket_id = 'cinemorph-gallery');

create policy "Anon admin can upload gallery files"
on storage.objects
for insert
to anon
with check (bucket_id = 'cinemorph-gallery');

create policy "Public video media is readable"
on storage.objects
for select
to anon
using (bucket_id = 'cinemorph-video-media');

create policy "Anon admin can upload video media"
on storage.objects
for insert
to anon
with check (bucket_id = 'cinemorph-video-media');
```

## 4. Connect The Site Form

Edit `src/js/supabase-config.js`:

```js
window.CINEMORPH_SUPABASE_CONFIG = {
  enabled: true,
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_ANON_KEY",
  tables: {
    messages: "messages",
    gallery: "gallery_items",
    videos: "portfolio_videos"
  },
  storage: {
    galleryBucket: "cinemorph-gallery",
    videoBucket: "cinemorph-video-media"
  }
};
```

The contact form sends:

```text
name
contact
message
```

## 5. Connect The Admin Panel

Edit `admin/js/admin-config.js`:

```js
window.CINEMORPH_ADMIN_CONFIG = {
  useMock: false,
  authEnabled: false,
  supabase: {
    url: "https://YOUR_PROJECT_ID.supabase.co",
    anonKey: "YOUR_ANON_KEY",
    tables: {
      messages: "messages",
      gallery: "gallery_items",
      videos: "portfolio_videos"
    },
    storage: {
      galleryBucket: "cinemorph-gallery",
      videoBucket: "cinemorph-video-media"
    }
  }
};
```

When `useMock` is `true`, the admin panel stores test data in browser `localStorage`. When it is `false`, it uses Supabase.

## 6. Video Image Rules

The video structure supports:

```text
thumbnail_gif_url
poster_url
featured
```

Display logic for the future portfolio connection:

```text
GIF + poster: use GIF as animated thumbnail and poster as fallback.
GIF only: use GIF; the first frame can be generated client-side when needed.
Poster only: show poster.
Neither: show "No image", but keep the Vimeo link active.
```

## 7. Auth Later

The admin config already has `authEnabled: false`. Later we can switch it to `true`, add Supabase Auth email/password, and replace the broad anon admin policies with authenticated-only policies.
