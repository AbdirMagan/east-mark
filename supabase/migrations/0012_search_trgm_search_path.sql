-- East-Market :: 0012 :: Fix trigram operator resolution in search_products
--
-- Every text search failed with:
--   ERROR: operator does not exist: text % text
--
-- pg_trgm is installed into the `extensions` schema (Supabase convention), and
-- search_products was created in 0008 with `set search_path = public`, so the
-- `%` similarity operator could not be resolved at run time. The full-text and
-- filter paths worked; only the fuzzy branch blew up, which is why it survived
-- creation and only surfaced on the first real query.
--
-- Schema-qualifying the call (extensions.similarity(...)) would also compile,
-- but the OPERATOR is the form the idx_products_title_trgm GIN index can
-- answer, so the fix is to put `extensions` on the function's search_path
-- instead. 0013 then replaces the body to use word_similarity.

alter function public.search_products(
  text, integer, boolean, smallint, integer, integer, integer, uuid, uuid,
  public.product_condition[], numeric, numeric, text, public.seller_type,
  boolean, boolean, boolean, boolean, integer, double precision, double precision,
  double precision, text, integer, integer
) set search_path = public, extensions;
