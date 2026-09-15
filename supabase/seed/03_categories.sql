-- East-Market :: seed 03 :: Category tree + translations
--
-- Five top-level categories: Electronics, Houses, Cars, Lands, Livestock
-- (see migrations/0016_trim_categories.sql). Phone and computer
-- subcategories live under Electronics.
--
-- `field_schema` tells every client which optional listing fields to show for
-- a category. That is why "Year / Mileage / Transmission" appears on Cars and
-- "Breed / Age / Quantity" on Livestock without a single category name being
-- hard-coded in the Android, iOS or web apps.
--
-- Idempotent. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Top level
-- ---------------------------------------------------------------------------
insert into public.categories (slug, icon, accent_color, sort_order, field_schema)
values
  ('electronics',            'cpu',          '#1E6F5C', 1,
     '{"core":["brand","model","condition"],"extra":[{"key":"warranty_months","type":"number"}]}'::jsonb),
  ('houses',                 'home',         '#2F5D3A', 2,
     '{"core":[],"extra":[{"key":"listing_type","type":"enum","options":["sale","rent"]},{"key":"bedrooms","type":"number"},{"key":"bathrooms","type":"number"},{"key":"area_sqm","type":"number"},{"key":"furnished","type":"boolean"},{"key":"parking","type":"boolean"}]}'::jsonb),
  ('cars',                   'car',          '#B8531A', 3,
     '{"core":["brand","model","year","color","condition"],"extra":[{"key":"mileage_km","type":"number"},{"key":"fuel","type":"enum","options":["petrol","diesel","hybrid","electric","gas"]},{"key":"transmission","type":"enum","options":["manual","automatic"]},{"key":"body_type","type":"enum","options":["sedan","suv","hatchback","pickup","van","coupe","wagon"]},{"key":"drive","type":"enum","options":["2wd","4wd","awd"]},{"key":"steering","type":"enum","options":["left","right"]}]}'::jsonb),
  ('land',                   'map',          '#3F6B2E', 4,
     '{"core":[],"extra":[{"key":"plot_size","type":"number"},{"key":"size_unit","type":"enum","options":["sqm","hectare","acre"]},{"key":"title_deed","type":"boolean"},{"key":"land_use","type":"enum","options":["residential","commercial","agricultural","industrial"]}]}'::jsonb),
  ('livestock',              'cow',          '#7A5C2E', 5,
     '{"core":["quantity"],"extra":[{"key":"animal","type":"enum","options":["camel","cattle","goat","sheep","donkey","poultry","other"]},{"key":"breed","type":"text"},{"key":"age_months","type":"number"},{"key":"sex","type":"enum","options":["male","female","mixed"]}]}'::jsonb)
on conflict (slug) do update
  set icon = excluded.icon,
      accent_color = excluded.accent_color,
      sort_order = excluded.sort_order,
      field_schema = excluded.field_schema;

-- ---------------------------------------------------------------------------
-- Subcategories. Inherit the parent's field_schema unless they set their own.
-- ---------------------------------------------------------------------------
insert into public.categories (parent_id, slug, icon, sort_order, field_schema)
select p.id, v.slug, v.icon, v.ord, coalesce(v.schema, p.field_schema)
from (values
  ('electronics', 'smartphones',       'smartphone', 1::smallint, '{"core":["brand","model","color","condition"],"extra":[{"key":"storage_gb","type":"enum","options":["16","32","64","128","256","512","1024"]},{"key":"ram_gb","type":"enum","options":["2","3","4","6","8","12","16"]},{"key":"battery_health","type":"number"},{"key":"dual_sim","type":"boolean"}]}'::jsonb),
  ('electronics', 'tablets',           'tablet',     2, '{"core":["brand","model","color","condition"],"extra":[{"key":"storage_gb","type":"enum","options":["16","32","64","128","256","512","1024"]},{"key":"ram_gb","type":"enum","options":["2","3","4","6","8","12","16"]},{"key":"battery_health","type":"number"},{"key":"dual_sim","type":"boolean"}]}'::jsonb),
  ('electronics', 'feature-phones',    'phone',      3, '{"core":["brand","model","color","condition"],"extra":[{"key":"storage_gb","type":"enum","options":["16","32","64","128","256","512","1024"]},{"key":"ram_gb","type":"enum","options":["2","3","4","6","8","12","16"]},{"key":"battery_health","type":"number"},{"key":"dual_sim","type":"boolean"}]}'::jsonb),
  ('electronics', 'phone-accessories', 'cable',      4, '{"core":["brand","model","color","condition"],"extra":[{"key":"storage_gb","type":"enum","options":["16","32","64","128","256","512","1024"]},{"key":"ram_gb","type":"enum","options":["2","3","4","6","8","12","16"]},{"key":"battery_health","type":"number"},{"key":"dual_sim","type":"boolean"}]}'::jsonb),
  ('electronics',    'tvs',               'tv',         1, null),
  ('electronics',    'audio',             'speaker',    2, null),
  ('electronics',    'cameras',           'camera',     3, null),
  ('electronics',    'gaming',            'gamepad',    4, null),
  ('electronics',    'solar-power',       'sun',        5, null),
  ('electronics',    'generators',        'zap',        6, null),
  ('electronics',      'laptops',           'laptop',     1, '{"core":["brand","model","condition"],"extra":[{"key":"cpu","type":"text"},{"key":"ram_gb","type":"enum","options":["4","8","16","32","64"]},{"key":"storage_gb","type":"number"},{"key":"screen_inches","type":"number"}]}'::jsonb),
  ('electronics',      'desktops',          'monitor',    2, '{"core":["brand","model","condition"],"extra":[{"key":"cpu","type":"text"},{"key":"ram_gb","type":"enum","options":["4","8","16","32","64"]},{"key":"storage_gb","type":"number"},{"key":"screen_inches","type":"number"}]}'::jsonb),
  ('electronics',      'printers',          'printer',    3, '{"core":["brand","model","condition"],"extra":[{"key":"cpu","type":"text"},{"key":"ram_gb","type":"enum","options":["4","8","16","32","64"]},{"key":"storage_gb","type":"number"},{"key":"screen_inches","type":"number"}]}'::jsonb),
  ('electronics',      'networking',        'wifi',       4, '{"core":["brand","model","condition"],"extra":[{"key":"cpu","type":"text"},{"key":"ram_gb","type":"enum","options":["4","8","16","32","64"]},{"key":"storage_gb","type":"number"},{"key":"screen_inches","type":"number"}]}'::jsonb),
  ('electronics',      'computer-parts',    'hard-drive', 5, '{"core":["brand","model","condition"],"extra":[{"key":"cpu","type":"text"},{"key":"ram_gb","type":"enum","options":["4","8","16","32","64"]},{"key":"storage_gb","type":"number"},{"key":"screen_inches","type":"number"}]}'::jsonb),
  ('cars',           'cars-sale',         'car',        1, null),
  ('cars',           'cars-rental',       'key',        2, null),
  ('cars',           'buses-vans',        'bus',        3, null),
  ('livestock',      'camels',            'cow',        1, null),
  ('livestock',      'cattle',            'cow',        2, null),
  ('livestock',      'goats-sheep',       'cow',        3, null),
  ('livestock',      'poultry',           'bird',       4, null),
  ('houses',         'houses-sale',       'home',       1, null),
  ('houses',         'houses-rent',       'key',        2, null),
  ('land',           'land-sale',         'map',        1, null),
  ('land',           'commercial-property','store',     2, null)
) as v(parent_slug, slug, icon, ord, schema)
join public.categories p on p.slug = v.parent_slug
on conflict (slug) do update
  set icon = excluded.icon,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Translations :: en / so / am / sw
-- ---------------------------------------------------------------------------
insert into public.category_translations (category_id, language_code, name)
select c.id, t.lang, t.name
from (values
  -- slug, English, Somali, Amharic, Swahili
  ('electronics',            'Electronics',            'Elektaroonig',                'ኤሌክትሮኒክስ',                    'Elektroniki'),
  ('cars',                   'Cars',                   'Baabuur',                     'መኪኖች',                        'Magari'),
  ('livestock',              'Livestock',              'Xoolaha',                     'የቤት እንስሳት',                   'Mifugo'),
  ('land', 'Lands', 'Dhulal', 'መሬቶች', 'Ardhi'),
  ('houses',                 'Houses',                 'Guryo',                       'ቤቶች',                         'Nyumba'),
  ('smartphones',        'Smartphones',            'Taleefan Casri ah',      'ስማርት ስልኮች',        'Simu Janja'),
  ('tablets',            'Tablets',                'Tabletyo',               'ታብሌቶች',            'Tableti'),
  ('feature-phones',     'Feature Phones',         'Taleefan Caadi ah',      'ተራ ስልኮች',          'Simu za Kawaida'),
  ('phone-accessories',  'Phone Accessories',      'Qalabka Taleefanka',     'የስልክ መለዋወጫዎች',     'Vifaa vya Simu'),
  ('tvs',                'TVs',                    'TV-yada',                'ቴሌቪዥኖች',           'Televisheni'),
  ('audio',              'Audio & Speakers',       'Codka & Sameecadaha',    'ድምጽ እና ስፒከሮች',     'Sauti na Spika'),
  ('cameras',            'Cameras',                'Kamaradaha',             'ካሜራዎች',            'Kamera'),
  ('gaming',             'Gaming',                 'Ciyaaraha',              'ጨዋታዎች',            'Michezo ya Video'),
  ('solar-power',        'Solar Power',            'Korontada Qorraxda',     'የፀሐይ ኃይል',          'Nishati ya Jua'),
  ('generators',         'Generators',             'Matoorada Korontada',    'ጀነሬተሮች',           'Jenereta'),
  ('laptops',            'Laptops',                'Laptopyo',               'ላፕቶፖች',            'Laptop'),
  ('desktops',           'Desktops',               'Kombuyuutar Miis',       'ዴስክቶፖች',           'Kompyuta za Mezani'),
  ('printers',           'Printers & Scanners',    'Daabacayaal',            'አታሚዎች',            'Printa'),
  ('networking',         'Networking',             'Shabakadaha',            'ኔትወርክ',            'Mtandao'),
  ('computer-parts',     'Computer Parts',         'Qaybaha Kombuyuutarka',  'የኮምፒውተር እቃዎች',     'Vipuri vya Kompyuta'),
  ('cars-sale',          'Cars for Sale',          'Baabuur Iib ah',         'ለሽያጭ የቀረቡ መኪኖች',   'Magari ya Kuuza'),
  ('cars-rental',        'Car Rental',             'Baabuur Kiro ah',        'የኪራይ መኪኖች',        'Magari ya Kukodi'),
  ('buses-vans',         'Buses & Vans',           'Basas & Vaanno',         'አውቶቡሶች እና ቫኖች',    'Mabasi na Vani'),
  ('camels',             'Camels',                 'Geel',                   'ግመሎች',             'Ngamia'),
  ('cattle',             'Cattle',                 'Lo''',                   'ከብቶች',             'Ng''ombe'),
  ('goats-sheep',        'Goats & Sheep',          'Ari',                    'ፍየሎች እና በጎች',      'Mbuzi na Kondoo'),
  ('poultry',            'Poultry',                'Digaag',                 'የዶሮ እርባታ',         'Kuku'),
  ('houses-sale',        'Houses for Sale',        'Guryo Iib ah',           'ለሽያጭ ቤቶች',         'Nyumba za Kuuza'),
  ('houses-rent',        'Houses for Rent',        'Guryo Kiro ah',          'የኪራይ ቤቶች',         'Nyumba za Kupanga'),
  ('land-sale',          'Land for Sale',          'Dhul Iib ah',            'ለሽያጭ መሬት',         'Ardhi ya Kuuza'),
  ('commercial-property','Commercial Property',    'Hanti Ganacsi',          'የንግድ ንብረት',        'Mali ya Biashara')
) as v(slug, en, so, am, sw)
join public.categories c on c.slug = v.slug
cross join lateral (values
  ('en', v.en), ('so', v.so), ('am', v.am), ('sw', v.sw)
) as t(lang, name)
on conflict (category_id, language_code) do update
  set name = excluded.name;
