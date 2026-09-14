-- East-Market :: seed 01 :: Languages, currencies, exchange rates, settings
-- Idempotent. Safe to re-run.

insert into public.languages (code, name, native_name, is_rtl, sort_order) values
  ('en', 'English',  'English',   false, 1),
  ('so', 'Somali',   'Soomaali',  false, 2),
  ('am', 'Amharic',  'አማርኛ',      false, 3),
  ('sw', 'Swahili',  'Kiswahili', false, 4)
on conflict (code) do update
  set name = excluded.name,
      native_name = excluded.native_name,
      sort_order = excluded.sort_order;

insert into public.currencies (code, name, symbol, decimal_digits, sort_order) values
  ('USD',  'US Dollar',           '$',    2, 1),
  ('SLSH', 'Somaliland Shilling', 'SL',   0, 2),
  ('SOS',  'Somali Shilling',     'Sh.So.', 0, 3),
  ('ETB',  'Ethiopian Birr',      'Br',   2, 4),
  ('KES',  'Kenyan Shilling',     'KSh',  2, 5)
on conflict (code) do update
  set name = excluded.name,
      symbol = excluded.symbol,
      decimal_digits = excluded.decimal_digits,
      sort_order = excluded.sort_order;

-- Indicative starting rates against USD. These are placeholders: the
-- CurrencyService in the backend refreshes them from a provider, and every
-- product keeps its own price + currency regardless.
insert into public.exchange_rates (base_code, quote_code, rate, source) values
  ('USD', 'USD',  1.0,        'seed'),
  ('USD', 'SLSH', 8500.0,     'seed'),
  ('USD', 'SOS',  57000.0,    'seed'),
  ('USD', 'ETB',  135.0,      'seed'),
  ('USD', 'KES',  129.0,      'seed')
on conflict (base_code, quote_code) do nothing;

-- ---------------------------------------------------------------------------
-- Application settings. `is_public` rows are readable by unauthenticated
-- clients; everything else is admin/backend only.
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, description, is_public) values
  ('moderation',
   '{"require_approval": true, "auto_approve_verified_sellers": true, "auto_approve_after_listings": 5}'::jsonb,
   'Listing moderation behaviour. require_approval=false puts new listings live immediately.',
   false),

  ('listings',
   '{"listing_days": 60, "max_images": 10, "max_active_free": 20, "min_price": 0, "renew_window_days": 7}'::jsonb,
   'Listing lifecycle limits.',
   true),

  ('media',
   '{"image_max_width": 1600, "image_quality": 78, "thumbnail_width": 400, "thumbnail_quality": 70, "format": "webp"}'::jsonb,
   'Image pipeline targets. Tuned for 2G/3G: large edge 1600px, thumbnails 400px WebP.',
   true),

  ('search',
   '{"default_radius_km": 50, "max_radius_km": 500, "page_size": 20, "max_page_size": 100}'::jsonb,
   'Search and pagination defaults.',
   true),

  ('featured_pricing',
   '{"currency": "USD", "plans": [{"days": 3, "price": 1.5}, {"days": 7, "price": 3}, {"days": 14, "price": 5}, {"days": 30, "price": 9}]}'::jsonb,
   'Featured listing price card.',
   true),

  ('contact',
   '{"support_email": "support@eastmarket.app", "support_phone": "+252634000000", "whatsapp": "+252634000000"}'::jsonb,
   'Support contact details shown in the apps.',
   true),

  ('links',
   '{"web": "https://eastmarket.app", "terms": "https://eastmarket.app/legal/terms", "privacy": "https://eastmarket.app/legal/privacy", "guidelines": "https://eastmarket.app/legal/community-guidelines"}'::jsonb,
   'Canonical public URLs used for deep links and legal screens.',
   true),

  ('features',
   '{"messaging": true, "voice_messages": false, "image_messages": true, "business_accounts": true, "payments": false, "reviews": true}'::jsonb,
   'Remote feature flags. Lets a capability be disabled per environment without shipping an app update.',
   true)
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      is_public = excluded.is_public;
