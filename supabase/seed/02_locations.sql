-- East-Market :: seed 02 :: Location hierarchy
-- Countries > regions > cities > districts for the five launch markets.
--
-- This file is a starting point, not a fixed list. The whole hierarchy is
-- database driven: admins add countries, regions, cities, districts and
-- neighbourhoods from the dashboard and no application code changes.
--
-- Somaliland is given the user-assigned ISO code 'XA'. It shares the +252
-- dialling plan with Somalia and is listed separately because sellers and
-- buyers there consistently identify their location that way; nothing in the
-- schema depends on the code itself.
--
-- Idempotent. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Countries
-- ---------------------------------------------------------------------------
insert into public.countries
  (code, code3, name, translations, dial_code, flag_emoji,
   default_currency_code, default_language_code, phone_number_length, sort_order)
values
  -- No flag emoji. The only emoji available is Somalia's, and applying it
  -- to Somaliland is both factually wrong and politically loaded. Clients
  -- render the country name and dialling code instead.
  ('XA', 'XSL', 'Somaliland',
   '{"so":"Somaliland","am":"ሶማሊላንድ","sw":"Somaliland"}'::jsonb,
   '+252', null, 'SLSH', 'so', 9, 1),
  ('SO', 'SOM', 'Somalia',
   '{"so":"Soomaaliya","am":"ሶማሊያ","sw":"Somalia"}'::jsonb,
   '+252', '🇸🇴', 'SOS', 'so', 9, 2),
  ('ET', 'ETH', 'Ethiopia',
   '{"so":"Itoobiya","am":"ኢትዮጵያ","sw":"Ethiopia"}'::jsonb,
   '+251', '🇪🇹', 'ETB', 'am', 9, 3),
  ('KE', 'KEN', 'Kenya',
   '{"so":"Kiiniya","am":"ኬንያ","sw":"Kenya"}'::jsonb,
   '+254', '🇰🇪', 'KES', 'sw', 9, 4)
on conflict (code) do update
  set name = excluded.name,
      translations = excluded.translations,
      dial_code = excluded.dial_code,
      default_currency_code = excluded.default_currency_code,
      default_language_code = excluded.default_language_code,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Regions
-- ---------------------------------------------------------------------------
insert into public.regions (country_id, name, translations, sort_order)
select c.id, v.name, v.tr, v.ord
from (values
  -- Somaliland
  ('XA', 'Maroodi Jeex',      '{"so":"Maroodi Jeex"}'::jsonb,        1::smallint),
  ('XA', 'Awdal',             '{"so":"Awdal"}'::jsonb,               2),
  ('XA', 'Togdheer',          '{"so":"Togdheer"}'::jsonb,            3),
  ('XA', 'Sahil',             '{"so":"Saaxil"}'::jsonb,              4),
  ('XA', 'Sanaag',            '{"so":"Sanaag"}'::jsonb,              5),
  ('XA', 'Sool',              '{"so":"Sool"}'::jsonb,                6),
  ('XA', 'Gabiley',           '{"so":"Gabiley"}'::jsonb,             7),
  ('XA', 'Sarar',             '{"so":"Saraar"}'::jsonb,              8),
  -- Somalia
  ('SO', 'Banaadir',          '{"so":"Banaadir"}'::jsonb,            1),
  ('SO', 'Bari',              '{"so":"Bari"}'::jsonb,                2),
  ('SO', 'Nugaal',            '{"so":"Nugaal"}'::jsonb,              3),
  ('SO', 'Mudug',             '{"so":"Mudug"}'::jsonb,               4),
  ('SO', 'Galguduud',         '{"so":"Galguduud"}'::jsonb,           5),
  ('SO', 'Hiiraan',           '{"so":"Hiiraan"}'::jsonb,             6),
  ('SO', 'Shabeellaha Hoose', '{"so":"Shabeellaha Hoose","en":"Lower Shabelle"}'::jsonb,  7),
  ('SO', 'Shabeellaha Dhexe', '{"so":"Shabeellaha Dhexe","en":"Middle Shabelle"}'::jsonb, 8),
  ('SO', 'Bay',               '{"so":"Baay"}'::jsonb,                9),
  ('SO', 'Bakool',            '{"so":"Bakool"}'::jsonb,              10),
  ('SO', 'Gedo',              '{"so":"Gedo"}'::jsonb,                11),
  ('SO', 'Jubbada Hoose',     '{"so":"Jubbada Hoose","en":"Lower Juba"}'::jsonb,  12),
  ('SO', 'Jubbada Dhexe',     '{"so":"Jubbada Dhexe","en":"Middle Juba"}'::jsonb, 13),
  -- Ethiopia
  ('ET', 'Addis Ababa',       '{"am":"አዲስ አበባ","so":"Addis Ababa"}'::jsonb,   1),
  ('ET', 'Dire Dawa',         '{"am":"ድሬዳዋ","so":"Dire Dhaba"}'::jsonb,       2),
  ('ET', 'Somali Region',     '{"am":"ሶማሌ ክልል","so":"Deegaanka Soomaalida"}'::jsonb, 3),
  ('ET', 'Harari',            '{"am":"ሐረሪ"}'::jsonb,                          4),
  ('ET', 'Oromia',            '{"am":"ኦሮሚያ"}'::jsonb,                         5),
  ('ET', 'Amhara',            '{"am":"አማራ"}'::jsonb,                          6),
  ('ET', 'Tigray',            '{"am":"ትግራይ"}'::jsonb,                         7),
  ('ET', 'Sidama',            '{"am":"ሲዳማ"}'::jsonb,                          8),
  ('ET', 'Afar',              '{"am":"አፋር"}'::jsonb,                          9),
  ('ET', 'South Ethiopia',    '{"am":"ደቡብ ኢትዮጵያ"}'::jsonb,                   10),
  -- Kenya
  ('KE', 'Nairobi',           '{"sw":"Nairobi"}'::jsonb,             1),
  ('KE', 'Mombasa',           '{"sw":"Mombasa"}'::jsonb,             2),
  ('KE', 'Kisumu',            '{"sw":"Kisumu"}'::jsonb,              3),
  ('KE', 'Nakuru',            '{"sw":"Nakuru"}'::jsonb,              4),
  ('KE', 'Uasin Gishu',       '{"sw":"Uasin Gishu"}'::jsonb,         5),
  ('KE', 'Garissa',           '{"sw":"Garissa","so":"Garisa"}'::jsonb, 6),
  ('KE', 'Wajir',             '{"sw":"Wajir","so":"Wajeer"}'::jsonb,   7),
  ('KE', 'Mandera',           '{"sw":"Mandera","so":"Mandheera"}'::jsonb, 8),
  ('KE', 'Kiambu',            '{"sw":"Kiambu"}'::jsonb,              9),
  ('KE', 'Machakos',          '{"sw":"Machakos"}'::jsonb,            10),
  ('KE', 'Kilifi',            '{"sw":"Kilifi"}'::jsonb,              11),
  ('KE', 'Isiolo',            '{"sw":"Isiolo"}'::jsonb,              12),
  ('KE', 'Nyeri',             '{"sw":"Nyeri"}'::jsonb,               13),
  ('KE', 'Kajiado',           '{"sw":"Kajiado"}'::jsonb,             14)
) as v(country_code, name, tr, ord)
join public.countries c on c.code = v.country_code
on conflict (country_id, name) do update
  set translations = excluded.translations,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Cities
-- `is_major` drives the quick-pick list shown before the full picker.
-- ---------------------------------------------------------------------------
insert into public.cities (region_id, country_id, name, translations, latitude, longitude, is_major, sort_order)
select r.id, r.country_id, v.name, v.tr, v.lat, v.lon, v.major, v.ord
from (values
  -- Somaliland ------------------------------------------------------------
  ('XA', 'Maroodi Jeex', 'Hargeisa',  '{"so":"Hargeysa","am":"ሀርጌሳ"}'::jsonb,  9.5600::double precision,  44.0650::double precision, true,  1::smallint),
  ('XA', 'Maroodi Jeex', 'Salahley',  '{"so":"Salaxley"}'::jsonb,              9.1167,  44.6500, false, 2),
  ('XA', 'Maroodi Jeex', 'Faraweyne', '{"so":"Faraweyne"}'::jsonb,             9.5167,  43.6500, false, 3),
  ('XA', 'Gabiley',      'Gabiley',   '{"so":"Gabiley"}'::jsonb,               9.7000,  43.3333, true,  4),
  ('XA', 'Gabiley',      'Arabsiyo',  '{"so":"Carabsiyo"}'::jsonb,             9.6667,  43.6000, false, 5),
  ('XA', 'Awdal',        'Borama',    '{"so":"Boorama"}'::jsonb,               9.9361,  43.1806, true,  6),
  ('XA', 'Awdal',        'Zeila',     '{"so":"Saylac"}'::jsonb,               11.3550,  43.4700, false, 7),
  ('XA', 'Awdal',        'Baki',      '{"so":"Baki"}'::jsonb,                 10.1833,  43.3167, false, 8),
  ('XA', 'Awdal',        'Lughaya',   '{"so":"Lughaya"}'::jsonb,              10.6167,  43.4000, false, 9),
  ('XA', 'Sahil',        'Berbera',   '{"so":"Berbera","am":"በርበራ"}'::jsonb,  10.4350,  45.0140, true,  10),
  ('XA', 'Sahil',        'Sheikh',    '{"so":"Sheekh"}'::jsonb,                9.9333,  45.1833, true,  11),
  ('XA', 'Togdheer',     'Burco',     '{"so":"Burco","en":"Burao"}'::jsonb,    9.5221,  45.5336, true,  12),
  ('XA', 'Togdheer',     'Odweyne',   '{"so":"Oodweyne"}'::jsonb,              9.4083,  45.0625, false, 13),
  ('XA', 'Togdheer',     'Buhoodle',  '{"so":"Buuhoodle"}'::jsonb,             8.2333,  46.3333, false, 14),
  ('XA', 'Sarar',        'Aynabo',    '{"so":"Caynabo"}'::jsonb,               8.9167,  46.3667, false, 15),
  ('XA', 'Sanaag',       'Erigavo',   '{"so":"Ceerigaabo"}'::jsonb,           10.6167,  47.3667, true,  16),
  ('XA', 'Sanaag',       'Las Qorey', '{"so":"Laasqoray"}'::jsonb,            11.1667,  48.2000, false, 17),
  ('XA', 'Sool',         'Las Anod',  '{"so":"Laascaanood"}'::jsonb,           8.4774,  47.3597, true,  18),
  ('XA', 'Sool',         'Taleex',    '{"so":"Taleex"}'::jsonb,                9.1500,  48.4000, false, 19),
  ('XA', 'Sool',         'Xudun',     '{"so":"Xudun"}'::jsonb,                 9.3833,  47.5833, false, 20),

  -- Somalia ---------------------------------------------------------------
  ('SO', 'Banaadir',          'Mogadishu',   '{"so":"Muqdisho","am":"ሞቃዲሾ","sw":"Mogadishu"}'::jsonb, 2.0469, 45.3182, true,  1),
  ('SO', 'Bari',              'Bosaso',      '{"so":"Boosaaso"}'::jsonb,        11.2842, 49.1816, true,  2),
  ('SO', 'Bari',              'Qardho',      '{"so":"Qardho"}'::jsonb,           9.5000, 49.0833, false, 3),
  ('SO', 'Nugaal',            'Garowe',      '{"so":"Garoowe"}'::jsonb,          8.4054, 48.4845, true,  4),
  ('SO', 'Mudug',            'Galkayo',     '{"so":"Gaalkacyo"}'::jsonb,         6.7697, 47.4308, true,  5),
  ('SO', 'Mudug',            'Hobyo',       '{"so":"Hobyo"}'::jsonb,             5.3505, 48.5268, false, 6),
  ('SO', 'Galguduud',        'Dhusamareb',  '{"so":"Dhuusamareeb"}'::jsonb,      5.5361, 46.3861, false, 7),
  ('SO', 'Hiiraan',          'Beledweyne',  '{"so":"Beledweyne"}'::jsonb,        4.7358, 45.2036, true,  8),
  ('SO', 'Shabeellaha Hoose','Marka',       '{"so":"Marka"}'::jsonb,             1.7156, 44.7728, false, 9),
  ('SO', 'Shabeellaha Dhexe','Jowhar',      '{"so":"Jowhar"}'::jsonb,            2.7809, 45.5005, false, 10),
  ('SO', 'Bay',              'Baidoa',      '{"so":"Baydhabo"}'::jsonb,          3.1139, 43.6494, true,  11),
  ('SO', 'Bakool',           'Xudur',       '{"so":"Xuddur"}'::jsonb,            4.1231, 43.8894, false, 12),
  ('SO', 'Gedo',             'Garbahaarrey','{"so":"Garbahaarrey"}'::jsonb,      3.3289, 42.2204, false, 13),
  ('SO', 'Gedo',             'Dolow',       '{"so":"Doolow"}'::jsonb,            4.1667, 42.0667, false, 14),
  ('SO', 'Jubbada Hoose',    'Kismayo',     '{"so":"Kismaayo"}'::jsonb,         -0.3582, 42.5454, true,  15),
  ('SO', 'Jubbada Dhexe',    'Bu''aale',    '{"so":"Bu''aale"}'::jsonb,          1.0833, 42.5833, false, 16),

  -- Ethiopia --------------------------------------------------------------
  ('ET', 'Addis Ababa',   'Addis Ababa', '{"am":"አዲስ አበባ","so":"Addis Ababa"}'::jsonb, 9.0300, 38.7400, true,  1),
  ('ET', 'Dire Dawa',     'Dire Dawa',   '{"am":"ድሬዳዋ","so":"Dire Dhaba"}'::jsonb,     9.5931, 41.8661, true,  2),
  ('ET', 'Somali Region', 'Jijiga',      '{"am":"ጅጅጋ","so":"Jigjiga"}'::jsonb,         9.3500, 42.8000, true,  3),
  ('ET', 'Somali Region', 'Degehabur',   '{"so":"Dhagaxbuur","am":"ደገሀቡር"}'::jsonb,    8.2167, 43.5667, false, 4),
  ('ET', 'Somali Region', 'Gode',        '{"so":"Godey","am":"ጎዴ"}'::jsonb,            5.9527, 43.5516, false, 5),
  ('ET', 'Somali Region', 'Kebri Dahar', '{"so":"Qabridahare"}'::jsonb,                6.7333, 44.2667, false, 6),
  ('ET', 'Somali Region', 'Shilavo',     '{"so":"Shilaabo"}'::jsonb,                   6.0833, 44.7667, false, 7),
  ('ET', 'Harari',        'Harar',       '{"am":"ሐረር","so":"Harar"}'::jsonb,           9.3111, 42.1250, true,  8),
  ('ET', 'Oromia',        'Adama',       '{"am":"አዳማ"}'::jsonb,                        8.5400, 39.2700, true,  9),
  ('ET', 'Oromia',        'Bishoftu',    '{"am":"ቢሾፍቱ"}'::jsonb,                       8.7500, 38.9833, false, 10),
  ('ET', 'Oromia',        'Jimma',       '{"am":"ጅማ"}'::jsonb,                         7.6733, 36.8344, false, 11),
  ('ET', 'Amhara',        'Bahir Dar',   '{"am":"ባህር ዳር"}'::jsonb,                     11.5936, 37.3908, true,  12),
  ('ET', 'Amhara',        'Gondar',      '{"am":"ጎንደር"}'::jsonb,                       12.6000, 37.4667, false, 13),
  ('ET', 'Amhara',        'Dessie',      '{"am":"ደሴ"}'::jsonb,                         11.1333, 39.6333, false, 14),
  ('ET', 'Tigray',        'Mekelle',     '{"am":"መቀሌ"}'::jsonb,                        13.4967, 39.4753, true,  15),
  ('ET', 'Sidama',        'Hawassa',     '{"am":"ሀዋሳ"}'::jsonb,                         7.0622, 38.4764, true,  16),
  ('ET', 'Afar',          'Semera',      '{"am":"ሰመራ"}'::jsonb,                        11.7833, 41.0000, false, 17),
  ('ET', 'South Ethiopia','Arba Minch',  '{"am":"አርባ ምንጭ"}'::jsonb,                     6.0333, 37.5500, false, 18),

  -- Kenya -----------------------------------------------------------------
  ('KE', 'Nairobi',     'Nairobi',   '{"sw":"Nairobi","so":"Nayroobi"}'::jsonb,  -1.2864, 36.8172, true,  1),
  ('KE', 'Mombasa',     'Mombasa',   '{"sw":"Mombasa","so":"Mombasa"}'::jsonb,   -4.0435, 39.6682, true,  2),
  ('KE', 'Kisumu',      'Kisumu',    '{"sw":"Kisumu"}'::jsonb,                   -0.0917, 34.7680, true,  3),
  ('KE', 'Nakuru',      'Nakuru',    '{"sw":"Nakuru"}'::jsonb,                   -0.3031, 36.0800, true,  4),
  ('KE', 'Uasin Gishu', 'Eldoret',   '{"sw":"Eldoret"}'::jsonb,                   0.5143, 35.2698, true,  5),
  ('KE', 'Garissa',     'Garissa',   '{"sw":"Garissa","so":"Garisa"}'::jsonb,    -0.4569, 39.6583, true,  6),
  ('KE', 'Garissa',     'Dadaab',    '{"so":"Dhadhaab"}'::jsonb,                  0.0500, 40.3167, false, 7),
  ('KE', 'Wajir',       'Wajir',     '{"sw":"Wajir","so":"Wajeer"}'::jsonb,       1.7471, 40.0573, true,  8),
  ('KE', 'Mandera',     'Mandera',   '{"sw":"Mandera","so":"Mandheera"}'::jsonb,  3.9366, 41.8670, true,  9),
  ('KE', 'Kiambu',      'Thika',     '{"sw":"Thika"}'::jsonb,                    -1.0333, 37.0693, false, 10),
  ('KE', 'Kiambu',      'Ruiru',     '{"sw":"Ruiru"}'::jsonb,                    -1.1500, 36.9667, false, 11),
  ('KE', 'Machakos',    'Machakos',  '{"sw":"Machakos"}'::jsonb,                 -1.5177, 37.2634, false, 12),
  ('KE', 'Machakos',    'Athi River','{"sw":"Athi River"}'::jsonb,                -1.4564, 36.9785, false, 13),
  ('KE', 'Kilifi',      'Malindi',   '{"sw":"Malindi"}'::jsonb,                  -3.2175, 40.1191, false, 14),
  ('KE', 'Isiolo',      'Isiolo',    '{"sw":"Isiolo"}'::jsonb,                    0.3546, 37.5822, false, 15),
  ('KE', 'Nyeri',       'Nyeri',     '{"sw":"Nyeri"}'::jsonb,                    -0.4169, 36.9510, false, 16),
  ('KE', 'Kajiado',     'Kitengela', '{"sw":"Kitengela"}'::jsonb,                -1.4667, 36.9500, false, 17)
) as v(country_code, region_name, name, tr, lat, lon, major, ord)
join public.countries c on c.code = v.country_code
join public.regions   r on r.country_id = c.id and r.name = v.region_name
on conflict (region_id, name) do update
  set translations = excluded.translations,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      is_major = excluded.is_major,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Districts for the largest cities. Everything else is added from the admin
-- dashboard as the marketplace grows into each city.
-- ---------------------------------------------------------------------------
insert into public.districts (city_id, name, translations, sort_order)
select ci.id, v.name, v.tr, v.ord
from (values
  -- Hargeisa
  ('XA', 'Hargeisa', 'Ahmed Dhagah',    '{"so":"Axmed Dhagax"}'::jsonb,     1::smallint),
  ('XA', 'Hargeisa', 'Ibrahim Koodbuur','{"so":"Ibraahim Koodbuur"}'::jsonb, 2),
  ('XA', 'Hargeisa', '26 June',         '{"so":"26 Juun"}'::jsonb,          3),
  ('XA', 'Hargeisa', 'Mohamoud Haybe',  '{"so":"Maxamuud Haybe"}'::jsonb,   4),
  ('XA', 'Hargeisa', 'Ga''an Libaah',   '{"so":"Gacan Libaax"}'::jsonb,     5),
  ('XA', 'Hargeisa', 'Mohamed Mooge',   '{"so":"Maxamed Mooge"}'::jsonb,    6),
  -- Berbera / Burco
  ('XA', 'Berbera',  'Berbera Port',    '{"so":"Dekedda Berbera"}'::jsonb,  1),
  ('XA', 'Berbera',  'Darole',          '{"so":"Darole"}'::jsonb,           2),
  ('XA', 'Burco',    'Koosaar',         '{"so":"Koosaar"}'::jsonb,          1),
  ('XA', 'Burco',    'Sheikh Bashir',   '{"so":"Sheekh Bashiir"}'::jsonb,   2),
  -- Mogadishu
  ('SO', 'Mogadishu', 'Hodan',       '{"so":"Hodan"}'::jsonb,        1),
  ('SO', 'Mogadishu', 'Hamar Weyne', '{"so":"Xamar Weyne"}'::jsonb,  2),
  ('SO', 'Mogadishu', 'Wadajir',     '{"so":"Wadajir"}'::jsonb,      3),
  ('SO', 'Mogadishu', 'Karaan',      '{"so":"Karaan"}'::jsonb,       4),
  ('SO', 'Mogadishu', 'Dharkenley',  '{"so":"Dharkenley"}'::jsonb,   5),
  ('SO', 'Mogadishu', 'Waberi',      '{"so":"Waaberi"}'::jsonb,      6),
  ('SO', 'Mogadishu', 'Shibis',      '{"so":"Shibis"}'::jsonb,       7),
  -- Addis Ababa
  ('ET', 'Addis Ababa', 'Bole',           '{"am":"ቦሌ"}'::jsonb,          1),
  ('ET', 'Addis Ababa', 'Kirkos',         '{"am":"ቂርቆስ"}'::jsonb,        2),
  ('ET', 'Addis Ababa', 'Yeka',           '{"am":"የካ"}'::jsonb,          3),
  ('ET', 'Addis Ababa', 'Arada',          '{"am":"አራዳ"}'::jsonb,         4),
  ('ET', 'Addis Ababa', 'Lideta',         '{"am":"ልደታ"}'::jsonb,         5),
  ('ET', 'Addis Ababa', 'Nifas Silk-Lafto','{"am":"ንፋስ ስልክ ላፍቶ"}'::jsonb, 6),
  ('ET', 'Addis Ababa', 'Gullele',        '{"am":"ጉለሌ"}'::jsonb,         7),
  ('ET', 'Addis Ababa', 'Kolfe Keranio',  '{"am":"ኮልፌ ቀራንዮ"}'::jsonb,    8),
  ('ET', 'Addis Ababa', 'Addis Ketema',   '{"am":"አዲስ ከተማ"}'::jsonb,     9),
  ('ET', 'Addis Ababa', 'Akaki Kality',   '{"am":"አቃቂ ቃሊቲ"}'::jsonb,     10),
  ('ET', 'Addis Ababa', 'Lemi Kura',      '{"am":"ለሚ ኩራ"}'::jsonb,       11),
  -- Jijiga
  ('ET', 'Jijiga', 'Ayardaga',  '{"so":"Cayrdaga"}'::jsonb, 1),
  ('ET', 'Jijiga', 'Karamarda', '{"so":"Karamarda"}'::jsonb, 2),
  -- Nairobi
  ('KE', 'Nairobi', 'Westlands',  '{"sw":"Westlands"}'::jsonb,  1),
  ('KE', 'Nairobi', 'Starehe',    '{"sw":"Starehe"}'::jsonb,    2),
  ('KE', 'Nairobi', 'Kasarani',   '{"sw":"Kasarani"}'::jsonb,   3),
  ('KE', 'Nairobi', 'Embakasi',   '{"sw":"Embakasi"}'::jsonb,   4),
  ('KE', 'Nairobi', 'Langata',    '{"sw":"Lang''ata"}'::jsonb,  5),
  ('KE', 'Nairobi', 'Dagoretti',  '{"sw":"Dagoretti"}'::jsonb,  6),
  ('KE', 'Nairobi', 'Kamukunji',  '{"sw":"Kamukunji"}'::jsonb,  7),
  ('KE', 'Nairobi', 'Makadara',   '{"sw":"Makadara"}'::jsonb,   8),
  ('KE', 'Nairobi', 'Roysambu',   '{"sw":"Roysambu"}'::jsonb,   9),
  ('KE', 'Nairobi', 'Ruaraka',    '{"sw":"Ruaraka"}'::jsonb,    10),
  ('KE', 'Nairobi', 'Kibra',      '{"sw":"Kibra"}'::jsonb,      11),
  ('KE', 'Nairobi', 'Mathare',    '{"sw":"Mathare"}'::jsonb,    12),
  -- Mombasa
  ('KE', 'Mombasa', 'Mvita',     '{"sw":"Mvita"}'::jsonb,     1),
  ('KE', 'Mombasa', 'Nyali',     '{"sw":"Nyali"}'::jsonb,     2),
  ('KE', 'Mombasa', 'Kisauni',   '{"sw":"Kisauni"}'::jsonb,   3),
  ('KE', 'Mombasa', 'Likoni',    '{"sw":"Likoni"}'::jsonb,    4),
  ('KE', 'Mombasa', 'Changamwe', '{"sw":"Changamwe"}'::jsonb, 5),
  ('KE', 'Mombasa', 'Jomvu',     '{"sw":"Jomvu"}'::jsonb,     6),
  -- Garissa
  ('KE', 'Garissa', 'Garissa Township', '{"so":"Magaalada Garisa"}'::jsonb, 1),
  ('KE', 'Garissa', 'Bulla Iftin',      '{"so":"Bulo Iftin"}'::jsonb,       2)
) as v(country_code, city_name, name, tr, ord)
join public.countries c on c.code = v.country_code
join public.cities   ci on ci.country_id = c.id and ci.name = v.city_name
on conflict (city_id, name) do update
  set translations = excluded.translations,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Djibouti (see migrations/0017_djibouti.sql)
-- ---------------------------------------------------------------------------
insert into public.countries
  (code, code3, name, translations, dial_code, flag_emoji,
   default_currency_code, default_language_code, phone_number_length, sort_order)
values
  ('DJ', 'DJI', 'Djibouti',
   '{"so":"Jabuuti","am":"ጅቡቲ","sw":"Jibuti"}'::jsonb,
   '+253', '🇩🇯', 'DJF', 'so', 8, 5)
on conflict (code) do update
  set name = excluded.name, translations = excluded.translations,
      dial_code = excluded.dial_code, default_currency_code = excluded.default_currency_code,
      default_language_code = excluded.default_language_code,
      phone_number_length = excluded.phone_number_length, sort_order = excluded.sort_order;

insert into public.regions (country_id, name, translations, sort_order)
select c.id, v.name, v.tr, v.ord
from (values
  ('Djibouti',   '{"so":"Jabuuti","am":"ጅቡቲ"}'::jsonb, 1::smallint),
  ('Ali Sabieh', '{"so":"Cali Sabiix"}'::jsonb,        2),
  ('Arta',       '{"so":"Carta"}'::jsonb,              3),
  ('Dikhil',     '{"so":"Dikhil"}'::jsonb,             4),
  ('Obock',      '{"so":"Obock"}'::jsonb,              5),
  ('Tadjourah',  '{"so":"Tajuura"}'::jsonb,            6)
) as v(name, tr, ord)
join public.countries c on c.code = 'DJ'
on conflict (country_id, name) do update
  set translations = excluded.translations, sort_order = excluded.sort_order;

insert into public.cities (region_id, country_id, name, translations, latitude, longitude, is_major, sort_order)
select r.id, r.country_id, v.name, v.tr, v.lat, v.lon, v.major, v.ord
from (values
  ('Djibouti',   'Djibouti',   '{"so":"Jabuuti","am":"ጅቡቲ","sw":"Jibuti"}'::jsonb, 11.5886::double precision, 43.1450::double precision, true,  1::smallint),
  ('Ali Sabieh', 'Ali Sabieh', '{"so":"Cali Sabiix"}'::jsonb, 11.1558, 42.7125, true,  2),
  ('Arta',       'Arta',       '{"so":"Carta"}'::jsonb,       11.5264, 42.8519, false, 3),
  ('Dikhil',     'Dikhil',     '{"so":"Dikhil"}'::jsonb,      11.1054, 42.3697, true,  4),
  ('Obock',      'Obock',      '{"so":"Obock"}'::jsonb,       11.9669, 43.2881, false, 5),
  ('Tadjourah',  'Tadjourah',  '{"so":"Tajuura"}'::jsonb,     11.7856, 42.8844, true,  6)
) as v(region_name, name, tr, lat, lon, major, ord)
join public.countries c on c.code = 'DJ'
join public.regions r on r.country_id = c.id and r.name = v.region_name
on conflict (region_id, name) do update
  set translations = excluded.translations, latitude = excluded.latitude,
      longitude = excluded.longitude, is_major = excluded.is_major, sort_order = excluded.sort_order;

insert into public.districts (city_id, name, translations, sort_order)
select ci.id, v.name, v.tr, v.ord
from (values
  ('Ras Dika', '{"so":"Raas Dika"}'::jsonb, 1::smallint),
  ('Boulaos',  '{"so":"Boulaos"}'::jsonb,   2),
  ('Balbala',  '{"so":"Balbala"}'::jsonb,   3)
) as v(name, tr, ord)
join public.countries c on c.code = 'DJ'
join public.cities ci on ci.country_id = c.id and ci.name = 'Djibouti'
on conflict (city_id, name) do update
  set translations = excluded.translations, sort_order = excluded.sort_order;
