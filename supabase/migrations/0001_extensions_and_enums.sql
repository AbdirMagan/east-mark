-- East-Market :: 0001 :: Extensions, enums and shared helper functions
-- Everything downstream depends on this file. Apply first.

create extension if not exists "pgcrypto"   with schema extensions;
create extension if not exists "uuid-ossp"  with schema extensions;
create extension if not exists "pg_trgm"    with schema extensions;  -- fuzzy / multilingual search
create extension if not exists "unaccent"   with schema extensions;  -- accent-insensitive search
create extension if not exists "citext"     with schema extensions;  -- case-insensitive usernames/emails

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('buyer', 'seller', 'business', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_condition as enum ('new', 'like_new', 'used', 'refurbished');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_status as enum (
    'draft', 'pending_approval', 'active', 'rejected',
    'sold', 'expired', 'suspended', 'deleted'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.seller_type as enum ('individual', 'business');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_type as enum ('text', 'image', 'voice', 'system', 'product');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_target as enum ('product', 'seller', 'business', 'message', 'review');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_reason as enum (
    'scam', 'fake_product', 'wrong_information', 'offensive',
    'illegal', 'duplicate', 'spam', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('open', 'under_review', 'actioned', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum (
    'new_message', 'listing_approved', 'listing_rejected', 'listing_expiring',
    'product_sold', 'price_changed', 'saved_search_match', 'new_follower',
    'advertisement', 'subscription_expiring', 'verification_result', 'review_received', 'system'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_purpose as enum ('featured_listing', 'subscription', 'advertisement', 'verification', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('active', 'past_due', 'cancelled', 'expired', 'trialing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ad_placement as enum (
    'home_hero', 'home_banner', 'search_inline', 'category_banner',
    'product_detail', 'sponsored_product'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ad_status as enum ('draft', 'scheduled', 'running', 'paused', 'ended', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_kind as enum ('identity', 'business', 'phone', 'address');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared helper functions
-- ---------------------------------------------------------------------------

-- Keeps updated_at honest on every table that carries it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normalises free text for search: lowercase + accent-stripped.
create or replace function public.em_normalize(txt text)
returns text
language sql
immutable
as $$
  select lower(extensions.unaccent('extensions.unaccent', coalesce(txt, '')));
$$;

comment on function public.em_normalize is
  'Lowercase + accent-stripped text used to build multilingual search vectors.';
