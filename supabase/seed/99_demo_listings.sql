-- East-Market :: seed 99 :: DEMO LISTINGS (optional, removable)
--
-- Sample marketplace content so a fresh environment has something to look at:
-- two demo sellers and eight listings spread across Somaliland, Somalia, Ethiopia and Kenya.
--
-- Images are inline SVG data URIs rather than photographs. The point is to
-- exercise the card, gallery and detail layouts without committing binary
-- assets or depending on an external image host that may be unreachable.
--
-- NOT production data. The accounts have a known password. Remove with:
--   delete from auth.users where email like 'demo-%@eastmarket.test';

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000','d3300000-0000-4000-8000-000000000001',
   'authenticated','authenticated','demo-amina@eastmarket.test',
   extensions.crypt('DemoPassw0rd!', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Amina Yusuf","language_code":"so"}'::jsonb,
   '','','','','','','','',false,false),
  ('00000000-0000-0000-0000-000000000000','d3300000-0000-4000-8000-000000000002',
   'authenticated','authenticated','demo-james@eastmarket.test',
   extensions.crypt('DemoPassw0rd!', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"James Mwangi","language_code":"sw"}'::jsonb,
   '','','','','','','','',false,false)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id, u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
  from auth.users u where u.email like 'demo-%@eastmarket.test'
on conflict do nothing;

update public.user_contacts set phone = '+252634111111', whatsapp = '+252634111111'
 where user_id = 'd3300000-0000-4000-8000-000000000001';
update public.user_contacts set phone = '+254722333444', whatsapp = '+254722333444'
 where user_id = 'd3300000-0000-4000-8000-000000000002';

update public.profiles set role = 'seller',
       country_id = (select id from public.countries where code = 'XA'),
       city_id    = (select id from public.cities where name = 'Hargeisa')
 where id = 'd3300000-0000-4000-8000-000000000001';
update public.profiles set role = 'seller',
       country_id = (select id from public.countries where code = 'KE'),
       city_id    = (select id from public.cities where name = 'Nairobi')
 where id = 'd3300000-0000-4000-8000-000000000002';

insert into public.seller_profiles (user_id, display_name, about, verification_status, verified_at)
values
  ('d3300000-0000-4000-8000-000000000001','Amina Motors',
   'Used cars and electronics in Hargeisa since 2016.','verified', now()),
  ('d3300000-0000-4000-8000-000000000002','Mwangi Traders',
   'Vehicles and electronics, Nairobi.','unverified', null)
on conflict (user_id) do nothing;

-- Listings -------------------------------------------------------------------
with demo(title, description, slug, price, ccy, cond, country_code, city_name,
          brand, model, yr, attrs, image, negotiable, delivery) as (
  values
  ('Toyota Corolla 2018', 'Gaari wanaagsan oo la ilaaliyay. Clean Toyota Corolla, one owner, full service history.', 'cars-sale', 9500, 'USD', 'used', 'XA', 'Hargeisa', 'Toyota', 'Corolla', 2018, '{"mileage_km":86000,"fuel":"petrol","transmission":"automatic","body_type":"sedan","steering":"left"}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23B8531A%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22163%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20fill%3D%22%23faf7f2%22%20text-anchor%3D%22middle%22%3EToyota%20Corolla%202018%3C%2Ftext%3E%3C%2Fsvg%3E', true, true),
  ('iPhone 13 Pro 256GB', 'Battery health 91 percent. Original box and charger included. Taleefan aad u fiican.', 'smartphones', 620, 'USD', 'like_new', 'XA', 'Hargeisa', 'Apple', 'iPhone 13 Pro', null, '{"storage_gb":"256","battery_health":91,"dual_sim":true}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23146356%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22163%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20fill%3D%22%23faf7f2%22%20text-anchor%3D%22middle%22%3EiPhone%2013%20Pro%20256GB%3C%2Ftext%3E%3C%2Fsvg%3E', true, false),
  ('3 Bedroom House in Hargeisa', 'Guri weyn oo saddex qol jiif leh. Three bedrooms, two bathrooms, walled compound with parking.', 'houses-sale', 78000, 'USD', 'used', 'XA', 'Hargeisa', null, null, null, '{"listing_type":"sale","bedrooms":3,"bathrooms":2,"area_sqm":240,"parking":true,"furnished":false}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%232F5D3A%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22163%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20fill%3D%22%23faf7f2%22%20text-anchor%3D%22middle%22%3E3%20Bedroom%20House%20in%20Harge%3C%2Ftext%3E%3C%2Fsvg%3E', true, false),
  ('10 Somali Camels', 'Geel caafimaad qaba. Ten healthy camels, vaccinated, suitable for breeding or milk.', 'camels', 21000, 'USD', 'new', 'XA', 'Burco', null, null, null, '{"animal":"camel","breed":"Somali","age_months":48,"sex":"mixed"}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%237A5C2E%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22163%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20fill%3D%22%23faf7f2%22%20text-anchor%3D%22middle%22%3E10%20Somali%20Camels%3C%2Ftext%3E%3C%2Fsvg%3E', true, false),
  ('Toyota Hilux 2016 Double Cab', 'Well maintained double cab pickup, 4WD, diesel. Ideal for upcountry work.', 'cars-sale', 17500, 'USD', 'used', 'KE', 'Nairobi', 'Toyota', 'Hilux', 2016, '{"mileage_km":142000,"fuel":"diesel","transmission":"manual","body_type":"pickup","drive":"4wd"}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%238F4214%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22163%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20fill%3D%22%23faf7f2%22%20text-anchor%3D%22middle%22%3EToyota%20Hilux%202016%20Double%3C%2Ftext%3E%3C%2Fsvg%3E', true, true),
  ('Samsung 55 inch Smart TV', 'Barely used 4K smart TV with wall bracket. Collection from Westlands.', 'tvs', 42000, 'KES', 'like_new', 'KE', 'Nairobi', 'Samsung', 'UE55', null, '{"warranty_months":6}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%231B5E7A%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22163%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20fill%3D%22%23faf7f2%22%20text-anchor%3D%22middle%22%3ESamsung%2055%20inch%20Smart%20TV%3C%2Ftext%3E%3C%2Fsvg%3E', false, true),
  ('Solar Home System 300W', 'Complete kit: panel, inverter, battery and cabling. Installation available.', 'solar-power', 340, 'USD', 'new', 'SO', 'Mogadishu', null, null, null, '{"power_watts":300,"warranty_months":24}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23D4913F%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22163%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20fill%3D%22%23faf7f2%22%20text-anchor%3D%22middle%22%3ESolar%20Home%20System%20300W%3C%2Ftext%3E%3C%2Fsvg%3E', false, true),
  ('HP EliteBook 840 G8', 'Business laptop, 16GB RAM, 512GB SSD. Excellent condition, charger included.', 'laptops', 46000, 'ETB', 'refurbished', 'ET', 'Addis Ababa', 'HP', 'EliteBook 840 G8', 2021, '{"cpu":"Intel i7-1165G7","ram_gb":"16","storage_gb":512,"screen_inches":14}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%230F5257%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22163%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20fill%3D%22%23faf7f2%22%20text-anchor%3D%22middle%22%3EHP%20EliteBook%20840%20G8%3C%2Ftext%3E%3C%2Fsvg%3E', true, false)
),
inserted as (
  insert into public.products (
    seller_id, category_id, title, description, price, currency_code, condition, status,
    country_id, region_id, city_id, latitude, longitude,
    brand, model, year, attributes, is_negotiable, delivery_available, published_at, expires_at
  )
  select
    case when d.country_code = 'KE' then 'd3300000-0000-4000-8000-000000000002'::uuid
         else 'd3300000-0000-4000-8000-000000000001'::uuid end,
    cat.id, d.title, d.description, d.price, d.ccy, d.cond::public.product_condition, 'active',
    ci.country_id, ci.region_id, ci.id, ci.latitude, ci.longitude,
    d.brand, d.model, d.yr::smallint, d.attrs, d.negotiable, d.delivery,
    now() - (random() * interval '10 days'),
    now() + interval '60 days'
  from demo d
  join public.categories cat on cat.slug = d.slug
  join public.countries co on co.code = d.country_code
  join public.cities ci on ci.country_id = co.id and ci.name = d.city_name
  returning id, title
)
insert into public.product_images (product_id, storage_path, url, thumbnail_url, width, height, position, is_primary)
select i.id, 'demo/' || i.id || '.svg', d.image, d.image, 400, 300, 0, true
  from inserted i join demo d on d.title = i.title;

-- Feature the two newest listings so the home page Featured rail has content.
update public.products set is_featured = true, featured_until = now() + interval '14 days'
 where id in (select id from public.products where status = 'active' order by published_at desc limit 2);
