-- East-Market :: 0020 :: A video on a listing
--
-- A seller may add one short video alongside the photos: a walk around a car,
-- a goat moving, a room. Photos stay the backbone -- the card thumbnail is
-- always an image, because a grid of videos would cost a browsing buyer
-- megabytes before they tapped anything.
--
-- Limits are enforced here as well as in the apps: one video per listing, at
-- most 60 seconds, at most 20MB. Buyers on 2G/3G pay for every one of those
-- megabytes.

alter table public.product_images
  add column if not exists media_type      text not null default 'image',
  add column if not exists duration_seconds smallint;

do $$ begin
  alter table public.product_images
    add constraint product_media_type_valid
      check (media_type in ('image', 'video')),
    -- A duration belongs to a video and nothing else.
    add constraint product_media_duration_only_video
      check (media_type = 'video' or duration_seconds is null),
    add constraint product_media_duration_length
      check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 60)),
    -- The card thumbnail is always a photo.
    add constraint product_media_primary_is_image
      check (not (is_primary and media_type = 'video'));
exception when duplicate_object then null; end $$;

-- One video per listing. A second insert fails loudly rather than quietly
-- leaving two videos in a gallery that only renders one.
create unique index if not exists uq_product_single_video
  on public.product_images (product_id)
  where media_type = 'video';

-- ---------------------------------------------------------------------------
-- Storage: videos get their own bucket, so the tight 5MB photo cap stays tight
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-videos', 'product-videos', true, 20 * 1024 * 1024,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The public read policy has to name the new bucket, or the videos are
-- uploadable but not watchable.
drop policy if exists em_public_buckets_read on storage.objects;
create policy em_public_buckets_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id in ('avatars', 'product-images', 'business-assets', 'ad-creatives', 'product-videos')
  );

-- product-videos/<user_id>/<product_id>/... -- the same rule as the photos:
-- a signed URL cannot be used to write into someone else's folder.
drop policy if exists em_product_videos_write_own on storage.objects;
create policy em_product_videos_write_own on storage.objects
  for all to authenticated
  using (
    bucket_id = 'product-videos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'product-videos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
