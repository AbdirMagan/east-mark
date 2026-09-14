-- East-Market :: 0010 :: Supabase Storage
--
-- Buckets and their object-level policies.
--
-- Path conventions (the first path segment is always the owning id, which is
-- what every policy below keys off):
--   avatars              <user_id>/avatar.webp
--   product-images       <user_id>/<product_id>/<uuid>.webp
--   business-assets      <business_id>/logo.webp | cover.webp
--   ad-creatives         <ad_id>/<uuid>.webp
--   verification-docs    <user_id>/<uuid>.<ext>          (private)
--   message-attachments  <conversation_id>/<uuid>.<ext>  (private)
--
-- Size limits are deliberately tight. Listings are browsed on 2G/3G, and the
-- clients upload a compressed WebP plus a thumbnail rather than the original.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',             'avatars',             true,   2 * 1024 * 1024,
     array['image/jpeg', 'image/png', 'image/webp']),
  ('product-images',      'product-images',      true,   5 * 1024 * 1024,
     array['image/jpeg', 'image/png', 'image/webp']),
  ('business-assets',     'business-assets',     true,   5 * 1024 * 1024,
     array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('ad-creatives',        'ad-creatives',        true,   5 * 1024 * 1024,
     array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-docs',   'verification-docs',   false, 10 * 1024 * 1024,
     array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('message-attachments', 'message-attachments', false, 10 * 1024 * 1024,
     array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4',
           'audio/aac', 'audio/ogg', 'audio/webm'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A malformed path must deny access, not raise. Casting an arbitrary folder
-- name straight to uuid inside a policy would abort the whole query, so every
-- policy below goes through this.
create or replace function public.em_try_uuid(txt text)
returns uuid
language plpgsql
immutable
parallel safe
as $fn$
begin
  return txt::uuid;
exception when others then
  return null;
end;
$fn$;

grant execute on function public.em_try_uuid(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public buckets: anyone may read, only the owner may write.
-- ---------------------------------------------------------------------------
drop policy if exists em_public_buckets_read on storage.objects;
create policy em_public_buckets_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('avatars', 'product-images', 'business-assets', 'ad-creatives'));

-- avatars/<user_id>/...
drop policy if exists em_avatars_write_own on storage.objects;
create policy em_avatars_write_own on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- product-images/<user_id>/<product_id>/...
drop policy if exists em_product_images_write_own on storage.objects;
create policy em_product_images_write_own on storage.objects
  for all to authenticated
  using (
    bucket_id = 'product-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'product-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- business-assets/<business_id>/...
drop policy if exists em_business_assets_write_member on storage.objects;
create policy em_business_assets_write_member on storage.objects
  for all to authenticated
  using (
    bucket_id = 'business-assets'
    and (
      public.is_admin()
      or public.is_business_member(public.em_try_uuid((storage.foldername(name))[1]))
    )
  )
  with check (
    bucket_id = 'business-assets'
    and (
      public.is_admin()
      or public.is_business_member(public.em_try_uuid((storage.foldername(name))[1]))
    )
  );

drop policy if exists em_ad_creatives_write_admin on storage.objects;
create policy em_ad_creatives_write_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'ad-creatives' and public.is_admin())
  with check (bucket_id = 'ad-creatives' and public.is_admin());

-- ---------------------------------------------------------------------------
-- verification-docs :: private. Owner uploads, only moderators read.
-- ---------------------------------------------------------------------------
drop policy if exists em_verification_upload_own on storage.objects;
create policy em_verification_upload_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists em_verification_read on storage.objects;
create policy em_verification_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists em_verification_delete on storage.objects;
create policy em_verification_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- message-attachments :: private to the two people in the thread.
-- ---------------------------------------------------------------------------
drop policy if exists em_message_attachments_read on storage.objects;
create policy em_message_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and (
      public.is_admin()
      or public.is_conversation_member(public.em_try_uuid((storage.foldername(name))[1]))
    )
  );

drop policy if exists em_message_attachments_write on storage.objects;
create policy em_message_attachments_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and public.is_conversation_member(public.em_try_uuid((storage.foldername(name))[1]))
  );

drop policy if exists em_message_attachments_delete on storage.objects;
create policy em_message_attachments_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'message-attachments' and owner = auth.uid());
