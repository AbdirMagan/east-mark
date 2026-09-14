-- East-Market :: seed 04 :: Subscription plans and payment providers
--
-- Payment providers are registered as DATA, never as code branches. The
-- backend resolves an adapter by `code`; adding a new mobile-money provider
-- for a new country means inserting a row here and dropping in one adapter
-- file, not touching the checkout flow.
--
-- `config` holds NON-SECRET settings only. API keys, merchant PINs and
-- callback signing secrets live in backend environment variables named
-- EM_PAY_<CODE>_* and are never stored in the database or shipped to clients.
--
-- Every provider below starts inactive. Switch one on from the admin
-- dashboard once its credentials are configured and tested in sandbox.
--
-- Idempotent. Safe to re-run.

insert into public.subscription_plans
  (code, name, translations, description, tier, price, currency_code,
   interval_unit, interval_count, max_listings, max_images_per_listing,
   max_employees, featured_credits, features, sort_order)
values
  ('free', 'Free',
   '{"so":"Bilaash","am":"ነፃ","sw":"Bure"}'::jsonb,
   'Everything an individual seller needs to start trading.',
   0, 0, 'USD', 'month', 1,
   20, 8, 0, 0,
   '{"storefront": false, "analytics": "basic", "priority_support": false, "ads": false, "verified_badge": false, "bump_per_month": 0}'::jsonb,
   1),

  ('basic', 'Basic',
   '{"so":"Aasaasi","am":"መሰረታዊ","sw":"Msingi"}'::jsonb,
   'More listings and a monthly bump for active sellers.',
   1, 5, 'USD', 'month', 1,
   60, 10, 0, 1,
   '{"storefront": false, "analytics": "basic", "priority_support": false, "ads": false, "verified_badge": false, "bump_per_month": 4}'::jsonb,
   2),

  ('business', 'Business',
   '{"so":"Ganacsi","am":"ንግድ","sw":"Biashara"}'::jsonb,
   'A storefront, staff accounts and seller analytics.',
   2, 20, 'USD', 'month', 1,
   300, 15, 5, 4,
   '{"storefront": true, "analytics": "advanced", "priority_support": true, "ads": false, "verified_badge": true, "bump_per_month": 15}'::jsonb,
   3),

  ('premium', 'Premium',
   '{"so":"Heer Sare","am":"ፕሪሚየም","sw":"Premium"}'::jsonb,
   'Unlimited listings, advertising and full analytics.',
   3, 50, 'USD', 'month', 1,
   null, 20, 20, 12,
   '{"storefront": true, "analytics": "advanced", "priority_support": true, "ads": true, "verified_badge": true, "bump_per_month": 40, "api_access": true}'::jsonb,
   4)
on conflict (code) do update
  set name = excluded.name,
      translations = excluded.translations,
      description = excluded.description,
      tier = excluded.tier,
      price = excluded.price,
      max_listings = excluded.max_listings,
      max_images_per_listing = excluded.max_images_per_listing,
      max_employees = excluded.max_employees,
      featured_credits = excluded.featured_credits,
      features = excluded.features,
      sort_order = excluded.sort_order;

insert into public.payment_providers
  (code, name, country_codes, currency_codes, config, is_active, sort_order)
values
  ('zaad', 'ZAAD',
   array['XA'], array['USD', 'SLSH'],
   '{"kind": "mobile_money", "ussd": "*880#", "requires_msisdn": true, "confirmation": "push", "instructions_key": "pay.zaad.instructions"}'::jsonb,
   false, 1),

  ('edahab', 'eDahab',
   array['XA', 'SO'], array['USD', 'SLSH', 'SOS'],
   '{"kind": "mobile_money", "ussd": "*888#", "requires_msisdn": true, "confirmation": "push", "instructions_key": "pay.edahab.instructions"}'::jsonb,
   false, 2),

  ('evcplus', 'EVC Plus',
   array['SO'], array['USD', 'SOS'],
   '{"kind": "mobile_money", "ussd": "*712#", "requires_msisdn": true, "confirmation": "push", "instructions_key": "pay.evcplus.instructions"}'::jsonb,
   false, 3),

  ('sahal', 'Sahal',
   array['SO'], array['USD', 'SOS'],
   '{"kind": "mobile_money", "ussd": "*789#", "requires_msisdn": true, "confirmation": "push", "instructions_key": "pay.sahal.instructions"}'::jsonb,
   false, 4),

  ('telebirr', 'telebirr',
   array['ET'], array['ETB'],
   '{"kind": "mobile_money", "requires_msisdn": true, "confirmation": "redirect", "instructions_key": "pay.telebirr.instructions"}'::jsonb,
   false, 5),

  ('mpesa', 'M-Pesa',
   array['KE'], array['KES'],
   '{"kind": "mobile_money", "requires_msisdn": true, "confirmation": "stk_push", "instructions_key": "pay.mpesa.instructions"}'::jsonb,
   false, 6),

  ('bank_transfer', 'Bank Transfer',
   array['XA', 'SO', 'ET', 'KE'], array['USD', 'SLSH', 'SOS', 'ETB', 'KES'],
   '{"kind": "manual", "requires_proof": true, "confirmation": "manual_review", "instructions_key": "pay.bank.instructions"}'::jsonb,
   false, 7),

  ('cash', 'Cash / In Person',
   array['XA', 'SO', 'ET', 'KE'], array['USD', 'SLSH', 'SOS', 'ETB', 'KES'],
   '{"kind": "manual", "confirmation": "manual_review", "instructions_key": "pay.cash.instructions"}'::jsonb,
   false, 8)
on conflict (code) do update
  set name = excluded.name,
      country_codes = excluded.country_codes,
      currency_codes = excluded.currency_codes,
      config = excluded.config,
      sort_order = excluded.sort_order;
