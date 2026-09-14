-- East-Market :: seed 03 :: Category tree + translations
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
  ('phones-tablets',         'smartphone',   '#146356', 2,
     '{"core":["brand","model","color","condition"],"extra":[{"key":"storage_gb","type":"enum","options":["16","32","64","128","256","512","1024"]},{"key":"ram_gb","type":"enum","options":["2","3","4","6","8","12","16"]},{"key":"battery_health","type":"number"},{"key":"dual_sim","type":"boolean"}]}'::jsonb),
  ('computers',              'laptop',       '#0F5257', 3,
     '{"core":["brand","model","condition"],"extra":[{"key":"cpu","type":"text"},{"key":"ram_gb","type":"enum","options":["4","8","16","32","64"]},{"key":"storage_gb","type":"number"},{"key":"screen_inches","type":"number"}]}'::jsonb),
  ('cars',                   'car',          '#B8531A', 4,
     '{"core":["brand","model","year","color","condition"],"extra":[{"key":"mileage_km","type":"number"},{"key":"fuel","type":"enum","options":["petrol","diesel","hybrid","electric","gas"]},{"key":"transmission","type":"enum","options":["manual","automatic"]},{"key":"body_type","type":"enum","options":["sedan","suv","hatchback","pickup","van","coupe","wagon"]},{"key":"drive","type":"enum","options":["2wd","4wd","awd"]},{"key":"steering","type":"enum","options":["left","right"]}]}'::jsonb),
  ('motorcycles',            'bike',         '#C2641F', 5,
     '{"core":["brand","model","year","color","condition"],"extra":[{"key":"engine_cc","type":"number"},{"key":"mileage_km","type":"number"}]}'::jsonb),
  ('trucks',                 'truck',        '#8F4214', 6,
     '{"core":["brand","model","year","condition"],"extra":[{"key":"mileage_km","type":"number"},{"key":"payload_tons","type":"number"},{"key":"axles","type":"number"}]}'::jsonb),
  ('furniture',              'armchair',     '#8A6220', 7,
     '{"core":["condition","color","size"],"extra":[{"key":"material","type":"enum","options":["wood","metal","plastic","fabric","leather","glass"]}]}'::jsonb),
  ('clothing',               'shirt',        '#9A3E5A', 8,
     '{"core":["brand","size","color","condition"],"extra":[{"key":"gender","type":"enum","options":["men","women","unisex","kids"]}]}'::jsonb),
  ('shoes',                  'footprints',   '#8D3550', 9,
     '{"core":["brand","size","color","condition"],"extra":[{"key":"gender","type":"enum","options":["men","women","unisex","kids"]}]}'::jsonb),
  ('home-appliances',        'washing-machine','#1B5E7A', 10,
     '{"core":["brand","model","condition"],"extra":[{"key":"power_watts","type":"number"},{"key":"warranty_months","type":"number"}]}'::jsonb),
  ('construction-materials', 'hard-hat',     '#6B5B3E', 11,
     '{"core":["brand","quantity"],"extra":[{"key":"unit","type":"enum","options":["piece","bag","ton","meter","sqm","truckload"]}]}'::jsonb),
  ('livestock',              'cow',          '#7A5C2E', 12,
     '{"core":["quantity"],"extra":[{"key":"animal","type":"enum","options":["camel","cattle","goat","sheep","donkey","poultry","other"]},{"key":"breed","type":"text"},{"key":"age_months","type":"number"},{"key":"sex","type":"enum","options":["male","female","mixed"]}]}'::jsonb),
  ('land',                   'map',          '#3F6B2E', 13,
     '{"core":[],"extra":[{"key":"plot_size","type":"number"},{"key":"size_unit","type":"enum","options":["sqm","hectare","acre"]},{"key":"title_deed","type":"boolean"},{"key":"land_use","type":"enum","options":["residential","commercial","agricultural","industrial"]}]}'::jsonb),
  ('houses',                 'home',         '#2F5D3A', 14,
     '{"core":[],"extra":[{"key":"listing_type","type":"enum","options":["sale","rent"]},{"key":"bedrooms","type":"number"},{"key":"bathrooms","type":"number"},{"key":"area_sqm","type":"number"},{"key":"furnished","type":"boolean"},{"key":"parking","type":"boolean"}]}'::jsonb),
  ('apartments',             'building',     '#27543A', 15,
     '{"core":[],"extra":[{"key":"listing_type","type":"enum","options":["sale","rent"]},{"key":"bedrooms","type":"number"},{"key":"bathrooms","type":"number"},{"key":"area_sqm","type":"number"},{"key":"floor","type":"number"},{"key":"furnished","type":"boolean"}]}'::jsonb),
  ('jobs',                   'briefcase',    '#2B4C7E', 16,
     '{"core":[],"extra":[{"key":"job_type","type":"enum","options":["full_time","part_time","contract","internship","remote"]},{"key":"experience_years","type":"number"},{"key":"salary_period","type":"enum","options":["hour","day","month","year"]},{"key":"company","type":"text"}]}'::jsonb),
  ('services',               'wrench',       '#3A5C8C', 17,
     '{"core":[],"extra":[{"key":"service_type","type":"text"},{"key":"pricing","type":"enum","options":["fixed","hourly","per_job","negotiable"]},{"key":"on_site","type":"boolean"}]}'::jsonb),
  ('agriculture',            'sprout',       '#4A7C32', 18,
     '{"core":["quantity","brand"],"extra":[{"key":"unit","type":"enum","options":["kg","ton","bag","piece","litre"]},{"key":"organic","type":"boolean"}]}'::jsonb),
  ('beauty-health',          'sparkles',     '#A34D77', 19,
     '{"core":["brand","condition"],"extra":[{"key":"expiry_date","type":"date"}]}'::jsonb),
  ('baby-kids',              'baby',         '#C06A8E', 20,
     '{"core":["brand","condition","size"],"extra":[{"key":"age_range","type":"enum","options":["0-6m","6-12m","1-3y","3-6y","6-12y"]}]}'::jsonb),
  ('fashion',                'gem',          '#7E3A63', 21,
     '{"core":["brand","condition","color"],"extra":[{"key":"gender","type":"enum","options":["men","women","unisex"]},{"key":"material","type":"text"}]}'::jsonb),
  ('food',                   'utensils',     '#B4762A', 22,
     '{"core":["quantity"],"extra":[{"key":"unit","type":"enum","options":["kg","gram","litre","piece","pack"]},{"key":"halal","type":"boolean"},{"key":"expiry_date","type":"date"}]}'::jsonb),
  ('spare-parts',            'settings',     '#5E5A55', 23,
     '{"core":["brand","model","condition"],"extra":[{"key":"fits_make","type":"text"},{"key":"fits_model","type":"text"},{"key":"part_number","type":"text"}]}'::jsonb),
  ('industrial-equipment',   'factory',      '#4F5B66', 24,
     '{"core":["brand","model","year","condition"],"extra":[{"key":"power_kw","type":"number"},{"key":"hours_used","type":"number"}]}'::jsonb),
  ('other',                  'more-horizontal','#6E6A66', 25,
     '{"core":["condition"],"extra":[]}'::jsonb)
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
  ('phones-tablets', 'smartphones',       'smartphone', 1::smallint, null::jsonb),
  ('phones-tablets', 'tablets',           'tablet',     2, null),
  ('phones-tablets', 'feature-phones',    'phone',      3, null),
  ('phones-tablets', 'phone-accessories', 'cable',      4, null),

  ('electronics',    'tvs',               'tv',         1, null),
  ('electronics',    'audio',             'speaker',    2, null),
  ('electronics',    'cameras',           'camera',     3, null),
  ('electronics',    'gaming',            'gamepad',    4, null),
  ('electronics',    'solar-power',       'sun',        5, null),
  ('electronics',    'generators',        'zap',        6, null),

  ('computers',      'laptops',           'laptop',     1, null),
  ('computers',      'desktops',          'monitor',    2, null),
  ('computers',      'printers',          'printer',    3, null),
  ('computers',      'networking',        'wifi',       4, null),
  ('computers',      'computer-parts',    'hard-drive', 5, null),

  ('cars',           'cars-sale',         'car',        1, null),
  ('cars',           'cars-rental',       'key',        2, null),
  ('cars',           'buses-vans',        'bus',        3, null),

  ('livestock',      'camels',            'cow',        1, null),
  ('livestock',      'cattle',            'cow',        2, null),
  ('livestock',      'goats-sheep',       'cow',        3, null),
  ('livestock',      'poultry',           'bird',       4, null),

  ('houses',         'houses-sale',       'home',       1, null),
  ('houses',         'houses-rent',       'key',        2, null),
  ('apartments',     'apartments-sale',   'building',   1, null),
  ('apartments',     'apartments-rent',   'key',        2, null),
  ('land',           'land-sale',         'map',        1, null),
  ('land',           'commercial-property','store',     2, null),

  ('jobs',           'jobs-it',           'code',       1, null),
  ('jobs',           'jobs-sales',        'trending-up',2, null),
  ('jobs',           'jobs-drivers',      'steering-wheel', 3, null),
  ('jobs',           'jobs-healthcare',   'heart-pulse',4, null),
  ('jobs',           'jobs-education',    'graduation-cap', 5, null),
  ('jobs',           'jobs-construction', 'hard-hat',   6, null),

  ('services',       'services-transport','truck',      1, null),
  ('services',       'services-repair',   'wrench',     2, null),
  ('services',       'services-cleaning', 'spray-can',  3, null),
  ('services',       'services-events',   'party-popper', 4, null),
  ('services',       'services-tutoring', 'book-open',  5, null),
  ('services',       'services-money-transfer', 'banknote', 6, null),

  ('spare-parts',    'car-parts',         'settings',   1, null),
  ('spare-parts',    'motorcycle-parts',  'settings',   2, null),
  ('spare-parts',    'truck-parts',       'settings',   3, null),

  ('home-appliances','refrigerators',     'refrigerator', 1, null),
  ('home-appliances','cookers',           'flame',      2, null),
  ('home-appliances','air-conditioning',  'wind',       3, null),
  ('home-appliances','washing-machines',  'washing-machine', 4, null),

  ('agriculture',    'farm-produce',      'wheat',      1, null),
  ('agriculture',    'seeds-fertilizer',  'sprout',     2, null),
  ('agriculture',    'farm-machinery',    'tractor',    3, null),

  ('food',           'groceries',         'shopping-basket', 1, null),
  ('food',           'restaurants',       'utensils',   2, null),
  ('food',           'water-beverages',   'cup-soda',   3, null)
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
  -- slug,                    English,                 Somali,                        Amharic,                        Swahili
  ('electronics',            'Electronics',            'Elektaroonig',                'ኤሌክትሮኒክስ',                    'Elektroniki'),
  ('phones-tablets',         'Phones & Tablets',       'Taleefanno & Tabletyo',       'ስልኮች እና ታብሌቶች',              'Simu na Tableti'),
  ('computers',              'Computers & Accessories','Kombuyuutar & Qalab',         'ኮምፒውተሮች እና መለዋወጫዎች',        'Kompyuta na Vifaa'),
  ('cars',                   'Cars',                   'Baabuur',                     'መኪኖች',                        'Magari'),
  ('motorcycles',            'Motorcycles',            'Mootooyin',                   'ሞተር ሳይክሎች',                   'Pikipiki'),
  ('trucks',                 'Trucks',                 'Gaadhiyada Xamuulka',         'የጭነት መኪኖች',                   'Malori'),
  ('furniture',              'Furniture',              'Alaabta Guriga',              'የቤት ዕቃዎች',                    'Samani'),
  ('clothing',               'Clothing',               'Dharka',                      'ልብሶች',                        'Nguo'),
  ('shoes',                  'Shoes',                  'Kabaha',                      'ጫማዎች',                        'Viatu'),
  ('home-appliances',        'Home Appliances',        'Qalabka Guriga',              'የቤት ውስጥ መገልገያዎች',            'Vifaa vya Nyumbani'),
  ('construction-materials', 'Construction Materials', 'Alaabta Dhismaha',            'የግንባታ እቃዎች',                  'Vifaa vya Ujenzi'),
  ('livestock',              'Livestock',              'Xoolaha',                     'የቤት እንስሳት',                   'Mifugo'),
  ('land',                   'Land',                   'Dhul',                        'መሬት',                         'Ardhi'),
  ('houses',                 'Houses',                 'Guryo',                       'ቤቶች',                         'Nyumba'),
  ('apartments',             'Apartments',             'Aqallo',                      'አፓርታማዎች',                     'Fleti'),
  ('jobs',                   'Jobs',                   'Shaqooyin',                   'ሥራዎች',                        'Ajira'),
  ('services',               'Services',               'Adeegyo',                     'አገልግሎቶች',                     'Huduma'),
  ('agriculture',            'Agriculture',            'Beeraha',                     'ግብርና',                        'Kilimo'),
  ('beauty-health',          'Beauty & Health',        'Quruxda & Caafimaadka',       'ውበት እና ጤና',                   'Urembo na Afya'),
  ('baby-kids',              'Baby & Kids',            'Dhallaanka & Carruurta',      'ሕፃናት እና ልጆች',                 'Watoto'),
  ('fashion',                'Fashion',                'Moodada',                     'ፋሽን',                         'Mitindo'),
  ('food',                   'Food',                   'Cunto',                       'ምግብ',                         'Chakula'),
  ('spare-parts',            'Spare Parts',            'Qalab Beddel',                'መለዋወጫ እቃዎች',                  'Vipuri'),
  ('industrial-equipment',   'Industrial Equipment',   'Qalabka Warshadaha',          'የኢንዱስትሪ መሣሪያዎች',             'Vifaa vya Viwanda'),
  ('other',                  'Other',                  'Kale',                        'ሌላ',                          'Nyingine'),

  -- Subcategories
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
  ('apartments-sale',    'Apartments for Sale',    'Aqallo Iib ah',          'ለሽያጭ አፓርታማዎች',     'Fleti za Kuuza'),
  ('apartments-rent',    'Apartments for Rent',    'Aqallo Kiro ah',         'የኪራይ አፓርታማዎች',     'Fleti za Kupanga'),
  ('land-sale',          'Land for Sale',          'Dhul Iib ah',            'ለሽያጭ መሬት',         'Ardhi ya Kuuza'),
  ('commercial-property','Commercial Property',    'Hanti Ganacsi',          'የንግድ ንብረት',        'Mali ya Biashara'),
  ('jobs-it',            'IT & Technology',        'IT & Tignoolajiyada',    'አይቲ እና ቴክኖሎጂ',     'TEHAMA'),
  ('jobs-sales',         'Sales & Marketing',      'Iibka & Suuqgeynta',     'ሽያጭ እና ግብይት',      'Mauzo na Masoko'),
  ('jobs-drivers',       'Drivers',                'Darawallo',              'ሾፌሮች',             'Madereva'),
  ('jobs-healthcare',    'Healthcare',             'Caafimaadka',            'ጤና',               'Afya'),
  ('jobs-education',     'Education',              'Waxbarashada',           'ትምህርት',            'Elimu'),
  ('jobs-construction',  'Construction',           'Dhismaha',               'ግንባታ',             'Ujenzi'),
  ('services-transport', 'Transport & Moving',     'Gaadiid & Raro',         'ትራንስፖርት',          'Usafiri'),
  ('services-repair',    'Repair & Maintenance',   'Dayactir',               'ጥገና',              'Ukarabati'),
  ('services-cleaning',  'Cleaning',               'Nadaafad',               'ጽዳት',              'Usafi'),
  ('services-events',    'Events & Catering',      'Munaasabado',            'ዝግጅቶች',            'Matukio'),
  ('services-tutoring',  'Tutoring',               'Macallimiin',            'የግል ትምህርት',        'Masomo ya Ziada'),
  ('services-money-transfer','Money Transfer',     'Xawaalad',               'የገንዘብ ዝውውር',       'Uhamishaji wa Fedha'),
  ('car-parts',          'Car Parts',              'Qaybaha Baabuurta',      'የመኪና መለዋወጫ',       'Vipuri vya Magari'),
  ('motorcycle-parts',   'Motorcycle Parts',       'Qaybaha Mootooyinka',    'የሞተር ሳይክል መለዋወጫ',  'Vipuri vya Pikipiki'),
  ('truck-parts',        'Truck Parts',            'Qaybaha Gaadhiyada',     'የጭነት መኪና መለዋወጫ',   'Vipuri vya Malori'),
  ('refrigerators',      'Refrigerators & Freezers','Qaboojiyayaal',         'ማቀዝቀዣዎች',          'Friji'),
  ('cookers',            'Cookers & Ovens',        'Shooladaha',             'ምድጃዎች',            'Majiko'),
  ('air-conditioning',   'Air Conditioning & Fans','Qaboojiye Hawo',         'የአየር ማቀዝቀዣ',       'Viyoyozi na Feni'),
  ('washing-machines',   'Washing Machines',       'Mishiinada Dharka',      'የልብስ ማጠቢያ',        'Mashine za Kufua'),
  ('farm-produce',       'Farm Produce',           'Waxsoosaarka Beeraha',   'የእርሻ ምርት',         'Mazao ya Shamba'),
  ('seeds-fertilizer',   'Seeds & Fertilizer',     'Abuur & Bacrimin',       'ዘር እና ማዳበሪያ',      'Mbegu na Mbolea'),
  ('farm-machinery',     'Farm Machinery',         'Mishiinada Beeraha',     'የእርሻ ማሽነሪ',        'Mashine za Kilimo'),
  ('groceries',          'Groceries',              'Raashin',                'ሸቀጣሸቀጥ',           'Mboga na Vyakula'),
  ('restaurants',        'Restaurants & Takeaway', 'Maqaayado',              'ምግብ ቤቶች',          'Migahawa'),
  ('water-beverages',    'Water & Beverages',      'Biyo & Cabitaano',       'ውሃ እና መጠጦች',       'Maji na Vinywaji')
) as v(slug, en, so, am, sw)
join public.categories c on c.slug = v.slug
cross join lateral (values
  ('en', v.en), ('so', v.so), ('am', v.am), ('sw', v.sw)
) as t(lang, name)
on conflict (category_id, language_code) do update
  set name = excluded.name;
