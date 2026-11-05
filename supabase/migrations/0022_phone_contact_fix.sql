-- Magan Market :: 0022 :: Put the plus back on a new user's phone number
--
-- Not required by phone sign-in, which stores the number itself through the
-- API and never touches auth.users.phone. This fixes a latent bug next door
-- to it, found while building that.
--
-- handle_new_user() copied auth.users.phone straight into user_contacts.phone.
-- GoTrue stores that column without a leading plus ("252634400000") and
-- user_contacts_phone_e164 requires one, so creating any account that carried
-- a phone number in that column failed outright -- the check constraint
-- aborted the trigger and GoTrue reported a 500. Nothing writes that column
-- today, which is why nobody had hit it; enabling Supabase's own phone auth
-- later would hit it on the first sign-up.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_raw text;
begin
  insert into public.profiles (id, full_name, avatar_url, language_code, currency_code)
  values (
    new.id,
    nullif(meta->>'full_name', ''),
    nullif(meta->>'avatar_url', ''),
    coalesce(nullif(meta->>'language_code', ''), 'en'),
    coalesce(nullif(meta->>'currency_code', ''), 'USD')
  )
  on conflict (id) do nothing;

  -- Sign-up metadata carries E.164 already; auth.users.phone does not.
  v_raw := coalesce(nullif(meta->>'phone', ''), new.phone);
  if v_raw is not null and left(v_raw, 1) <> '+' then
    v_raw := '+' || regexp_replace(v_raw, '[^0-9]', '', 'g');
  end if;
  -- A number we cannot store is not a reason to refuse the whole sign-up.
  if v_raw is not null and v_raw !~ '^\+[1-9][0-9]{6,14}$' then
    v_raw := null;
  end if;

  insert into public.user_contacts (user_id, phone, phone_verified)
  values (new.id, v_raw, new.phone_confirmed_at is not null)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$fn$;

-- Looking a seller up by the number they published, and the recovery path for
-- a phone account whose derived address has been lost.
create index if not exists idx_user_contacts_phone
  on public.user_contacts (phone) where phone is not null;
