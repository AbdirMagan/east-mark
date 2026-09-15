-- East-Market :: 0016 :: Narrow the catalogue to five categories
--
-- Product decision: the marketplace carries Electronics, Houses, Cars, Lands
-- and Livestock only. Categories are data, so this is a data migration and no
-- client needed a code change to follow it.
--
-- Phone and computer subcategories are electronics, so they move under
-- Electronics instead of being deleted -- which also keeps the live listings
-- filed under Smartphones in a category. Every other top-level category is
-- removed; its subcategories and translations cascade.
--
-- products.category_id is ON DELETE RESTRICT, so if a listing ever sits in a
-- category this removes, the migration fails loudly instead of orphaning it.

update public.categories
   set parent_id = (select id from public.categories where slug = 'electronics')
 where parent_id in (
   select id from public.categories where slug in ('phones-tablets', 'computers')
 );

delete from public.categories
 where parent_id is null
   and slug not in ('electronics', 'houses', 'cars', 'land', 'livestock');

-- "Lands", as the brief names it. The slug stays `land` so existing links such
-- as /browse?category=land keep working.
update public.category_translations t
   set name = v.name
  from (values ('en', 'Lands'), ('so', 'Dhulal'), ('am', 'መሬቶች'), ('sw', 'Ardhi')) as v(lang, name)
 where t.category_id = (select id from public.categories where slug = 'land')
   and t.language_code = v.lang;

update public.categories c
   set sort_order = v.ord::smallint
  from (values ('electronics', 1), ('houses', 2), ('cars', 3), ('land', 4), ('livestock', 5)) as v(slug, ord)
 where c.slug = v.slug;
