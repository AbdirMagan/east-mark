-- East-Market :: 0017 :: Add Djibouti
--
-- The location system is database-driven, so a new country is rows, not code:
-- its currency, the country, its six regions, their main towns, and the
-- districts of the capital. Every client picks it up on the next reference
-- data refresh.
--
-- Somali is the default language: it is the most widely spoken of the four
-- languages the product supports (French and Arabic, the official languages,
-- are not among them). Idempotent. Safe to re-run.

insert into public.currencies (code, name, symbol, decimal_digits, sort_order)
values ('DJF', 'Djiboutian Franc', 'Fdj', 0, 6)
on conflict (code) do update
  set name = excluded.name, symbol = excluded.symbol,
      decimal_digits = excluded.decimal_digits, sort_order = excluded.sort_order;

-- Pegged to the US dollar at 177.721. Refreshed like every other rate.
insert into public.exchange_rates (base_code, quote_code, rate, source)
values ('USD', 'DJF', 177.721, 'seed')
on conflict (base_code, quote_code) do nothing;

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
