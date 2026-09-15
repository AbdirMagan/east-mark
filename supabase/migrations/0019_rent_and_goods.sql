-- East-Market :: 0019 :: Rent or buy, vehicles, and Home & Office Goods
--
-- Product decisions:
--  * Houses, Cars and Lands can be listed for sale OR for rent. Their field
--    schema gets a listing_type (sale | rent) choice, so the sell form on the
--    web and in the apps asks for it without any client change.
--  * Electronics and Livestock are sale only: no listing_type there.
--  * "Cars" covers cars, motorcycles and bicycles.
--  * Livestock means camels, sheep and goats, cows.
--  * A sixth top-level category: Home & Office Goods.
--
-- Idempotent: every insert is ON CONFLICT and every schema change checks first.

-- ---------------------------------------------------------------------------
-- Rent or buy: add listing_type to houses, cars, land and their subcategories
-- ---------------------------------------------------------------------------
update public.categories c
   set field_schema = jsonb_set(
         coalesce(c.field_schema, '{"core":[],"extra":[]}'::jsonb),
         '{extra}',
         '[{"key":"listing_type","type":"enum","options":["sale","rent"]}]'::jsonb
           || coalesce(c.field_schema -> 'extra', '[]'::jsonb)
       )
 where (
         c.slug in ('houses', 'cars', 'land')
         or c.parent_id in (select id from public.categories where slug in ('houses', 'cars', 'land'))
       )
   and not exists (
         select 1 from jsonb_array_elements(coalesce(c.field_schema -> 'extra', '[]'::jsonb)) e
         where e ->> 'key' = 'listing_type'
       );

-- Sale only: make sure electronics and livestock never offer "rent".
update public.categories c
   set field_schema = jsonb_set(
         c.field_schema,
         '{extra}',
         coalesce((
           select jsonb_agg(e)
             from jsonb_array_elements(c.field_schema -> 'extra') e
            where e ->> 'key' <> 'listing_type'
         ), '[]'::jsonb)
       )
 where (
         c.slug in ('electronics', 'livestock')
         or c.parent_id in (select id from public.categories where slug in ('electronics', 'livestock'))
       )
   and exists (
         select 1 from jsonb_array_elements(coalesce(c.field_schema -> 'extra', '[]'::jsonb)) e
         where e ->> 'key' = 'listing_type'
       );

-- ---------------------------------------------------------------------------
-- New top-level category: Home & Office Goods (sale only)
-- ---------------------------------------------------------------------------
insert into public.categories (slug, icon, accent_color, sort_order, field_schema, is_active)
values (
  'home-office-goods', 'goods', '#5B4A8A', 6,
  '{"core":["brand","color","condition"],"extra":[{"key":"material","type":"text"}]}'::jsonb,
  true
)
on conflict (slug) do update
  set icon = excluded.icon,
      accent_color = excluded.accent_color,
      sort_order = excluded.sort_order,
      is_active = true;

-- ---------------------------------------------------------------------------
-- Subcategories
-- ---------------------------------------------------------------------------
insert into public.categories (parent_id, slug, icon, sort_order, field_schema)
select p.id, v.slug, v.icon, v.ord, coalesce(v.schema::jsonb, p.field_schema)
from (values
  -- Vehicles: cars, motorcycles and bicycles, all rentable.
  ('cars', 'motorcycles', 'car', 3::smallint,
     '{"core":["brand","model","year","color","condition"],"extra":[{"key":"listing_type","type":"enum","options":["sale","rent"]},{"key":"engine_cc","type":"number"},{"key":"mileage_km","type":"number"}]}'),
  ('cars', 'bicycles', 'car', 4::smallint,
     '{"core":["brand","color","condition"],"extra":[{"key":"listing_type","type":"enum","options":["sale","rent"]},{"key":"bike_type","type":"enum","options":["city","mountain","road","kids","electric"]}]}'),
  ('land', 'land-rent', 'key', 2::smallint, null),
  ('home-office-goods', 'furniture',         'goods',   1::smallint, null),
  ('home-office-goods', 'home-appliances',   'zap',     2::smallint, null),
  ('home-office-goods', 'kitchenware',       'package', 3::smallint, null),
  ('home-office-goods', 'home-decor',        'house',   4::smallint, null),
  ('home-office-goods', 'office-furniture',  'goods',   5::smallint, null),
  ('home-office-goods', 'office-equipment',  'printer', 6::smallint, null)
) as v(parent_slug, slug, icon, ord, schema)
join public.categories p on p.slug = v.parent_slug
on conflict (slug) do update
  set parent_id = excluded.parent_id,
      icon = excluded.icon,
      sort_order = excluded.sort_order;

-- Keep the vehicle and land subcategories in a sensible order.
update public.categories c
   set sort_order = v.ord::smallint
  from (values
    ('cars-sale', 1), ('cars-rental', 2), ('motorcycles', 3), ('bicycles', 4), ('buses-vans', 5),
    ('land-sale', 1), ('land-rent', 2), ('commercial-property', 3)
  ) as v(slug, ord)
 where c.slug = v.slug;

-- ---------------------------------------------------------------------------
-- Translations :: en / so / am / sw
-- ---------------------------------------------------------------------------
insert into public.category_translations (category_id, language_code, name)
select c.id, t.lang, t.name
from (values
  ('home-office-goods', 'Home & Office Goods',  'Alaabta Guriga & Xafiiska', 'የቤት እና የቢሮ እቃዎች',  'Bidhaa za Nyumbani na Ofisini'),
  ('furniture',         'Furniture',            'Fadhiyada & Sariiraha',     'የቤት ዕቃዎች',          'Samani'),
  ('home-appliances',   'Home Appliances',      'Qalabka Korontada Guriga',  'የቤት መገልገያ ማሽኖች',    'Vifaa vya Nyumbani'),
  ('kitchenware',       'Kitchenware',          'Alaabta Jikada',            'የወጥ ቤት እቃዎች',       'Vyombo vya Jikoni'),
  ('home-decor',        'Home Decor',           'Qurxinta Guriga',           'የቤት ማስዋቢያ',         'Mapambo ya Nyumbani'),
  ('office-furniture',  'Office Furniture',     'Alaabta Xafiiska',          'የቢሮ ዕቃዎች',          'Samani za Ofisi'),
  ('office-equipment',  'Office Equipment',     'Qalabka Xafiiska',          'የቢሮ መሳሪያዎች',        'Vifaa vya Ofisi'),
  ('motorcycles',       'Motorcycles',          'Mootooyin',                 'ሞተር ሳይክሎች',         'Pikipiki'),
  ('bicycles',          'Bicycles',             'Baaskiilado',               'ብስክሌቶች',           'Baiskeli'),
  ('land-rent',         'Land for Rent',        'Dhul Kiro ah',              'የኪራይ መሬት',          'Ardhi ya Kukodi'),
  ('cattle',            'Cows & Cattle',        'Lo''',                      'ላሞች እና ከብቶች',       'Ng''ombe')
) as v(slug, en, so, am, sw)
join public.categories c on c.slug = v.slug
cross join lateral (values
  ('en', v.en), ('so', v.so), ('am', v.am), ('sw', v.sw)
) as t(lang, name)
on conflict (category_id, language_code) do update
  set name = excluded.name;
