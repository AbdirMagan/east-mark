-- East-Market :: 0005 :: Messaging
-- Conversations, messages, blocking and notifications.
-- Realtime delivery rides on Supabase Realtime over the `messages` table.

-- ---------------------------------------------------------------------------
-- Blocking
-- ---------------------------------------------------------------------------
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_not_self check (blocker_id <> blocked_id)
);

create index if not exists idx_blocked_users_blocked on public.blocked_users (blocked_id);

-- True when either party has blocked the other. Gates messaging in RLS.
create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$fn$;

-- Releases a seller's contact details to a caller, honouring the seller's
-- visibility switches and any block between the two users.
create or replace function public.get_seller_contact(p_seller_id uuid)
returns table (phone text, whatsapp text)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    case when uc.show_phone    then uc.phone    end,
    case when uc.show_whatsapp then uc.whatsapp end
  from public.user_contacts uc
  where uc.user_id = p_seller_id
    and not public.is_blocked_pair(coalesce(auth.uid(), p_seller_id), p_seller_id);
$fn$;

-- ---------------------------------------------------------------------------
-- Conversations
-- A conversation is a (buyer, seller, product) triple. The same two people
-- talking about two different listings get two threads, which is what users
-- expect on a marketplace.
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id                  uuid primary key default extensions.gen_random_uuid(),
  product_id          uuid references public.products(id) on delete set null,
  buyer_id            uuid not null references public.profiles(id) on delete cascade,
  seller_id           uuid not null references public.profiles(id) on delete cascade,
  business_id         uuid references public.business_profiles(id) on delete set null,

  last_message_at     timestamptz,
  last_message_preview text,
  last_sender_id      uuid references public.profiles(id) on delete set null,

  buyer_unread_count  integer not null default 0,
  seller_unread_count integer not null default 0,
  buyer_archived      boolean not null default false,
  seller_archived     boolean not null default false,
  buyer_deleted_at    timestamptz,
  seller_deleted_at   timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint conversations_distinct_parties check (buyer_id <> seller_id)
);

-- One thread per (buyer, seller, product). Two partial unique indexes because
-- NULL product_id would otherwise never collide.
create unique index if not exists uq_conversation_with_product
  on public.conversations (buyer_id, seller_id, product_id) where product_id is not null;
create unique index if not exists uq_conversation_without_product
  on public.conversations (buyer_id, seller_id) where product_id is null;

create index if not exists idx_conversations_buyer
  on public.conversations (buyer_id, last_message_at desc) where not buyer_archived;
create index if not exists idx_conversations_seller
  on public.conversations (seller_id, last_message_at desc) where not seller_archived;
create index if not exists idx_conversations_business
  on public.conversations (business_id, last_message_at desc) where business_id is not null;

-- Participant check reused by messages policies.
create or replace function public.is_conversation_member(c_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.conversations c
    where c.id = c_id
      and (
        c.buyer_id = auth.uid()
        or c.seller_id = auth.uid()
        or (c.business_id is not null and public.is_business_member(c.business_id))
      )
  );
$fn$;

-- ---------------------------------------------------------------------------
-- Messages
-- `type` and `attachment_*` are in place from day one so image and voice
-- messages ship later without a migration on the hot table.
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,

  type            public.message_type not null default 'text',
  body            text,
  attachment_url  text,
  attachment_path text,
  attachment_mime text,
  attachment_bytes integer,
  duration_seconds integer,                       -- voice messages
  -- Product card attached to the message (type = 'product')
  product_id      uuid references public.products(id) on delete set null,
  metadata        jsonb not null default '{}'::jsonb,

  read_at         timestamptz,
  delivered_at    timestamptz,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),

  constraint messages_have_content check (
    (type = 'text'    and coalesce(btrim(body), '') <> '')
    or (type in ('image', 'voice') and attachment_url is not null)
    or (type = 'product' and product_id is not null)
    or (type = 'system')
  )
);

create index if not exists idx_messages_conversation
  on public.messages (conversation_id, created_at desc);
create index if not exists idx_messages_unread
  on public.messages (conversation_id, sender_id) where read_at is null and deleted_at is null;

-- Keep the conversation summary + unread counters in step with inserts.
create or replace function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  conv public.conversations%rowtype;
  preview text;
begin
  select * into conv from public.conversations where id = new.conversation_id for update;

  preview := case new.type
    when 'text'    then left(coalesce(new.body, ''), 120)
    when 'image'   then '[image]'
    when 'voice'   then '[voice]'
    when 'product' then '[listing]'
    else left(coalesce(new.body, ''), 120)
  end;

  update public.conversations
     set last_message_at      = new.created_at,
         last_message_preview = preview,
         last_sender_id       = new.sender_id,
         buyer_unread_count   = case when new.sender_id = conv.buyer_id
                                     then buyer_unread_count else buyer_unread_count + 1 end,
         seller_unread_count  = case when new.sender_id = conv.seller_id
                                     then seller_unread_count else seller_unread_count + 1 end,
         -- A new message un-archives the thread for the recipient.
         buyer_archived       = case when new.sender_id = conv.buyer_id then buyer_archived else false end,
         seller_archived      = case when new.sender_id = conv.seller_id then seller_archived else false end
   where id = new.conversation_id;

  if conv.product_id is not null and new.sender_id = conv.buyer_id then
    update public.products set message_count = message_count + 1 where id = conv.product_id;
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_messages_after_insert on public.messages;
create trigger trg_messages_after_insert
  after insert on public.messages
  for each row execute function public.messages_after_insert();

-- Marks every unread message from the other party as read and zeroes the
-- caller's unread counter. Called by clients when a thread is opened.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  conv public.conversations%rowtype;
begin
  select * into conv from public.conversations where id = p_conversation_id;
  if conv.id is null then
    raise exception 'Conversation not found' using errcode = 'P0002';
  end if;
  if auth.uid() not in (conv.buyer_id, conv.seller_id) then
    raise exception 'Not a participant' using errcode = '42501';
  end if;

  update public.messages
     set read_at = now()
   where conversation_id = p_conversation_id
     and sender_id <> auth.uid()
     and read_at is null;

  if auth.uid() = conv.buyer_id then
    update public.conversations set buyer_unread_count = 0 where id = p_conversation_id;
  else
    update public.conversations set seller_unread_count = 0 where id = p_conversation_id;
  end if;
end;
$fn$;

-- Finds or creates the thread between the caller and a listing's seller.
create or replace function public.start_conversation(p_product_id uuid, p_seller_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_seller uuid;
  v_business uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_product_id is not null then
    select seller_id, business_id into v_seller, v_business
      from public.products where id = p_product_id and status in ('active', 'sold');
    if v_seller is null then
      raise exception 'Listing not available' using errcode = 'P0002';
    end if;
  else
    v_seller := p_seller_id;
  end if;

  if v_seller is null then
    raise exception 'Seller required' using errcode = '22023';
  end if;
  if v_seller = auth.uid() then
    raise exception 'Cannot message yourself' using errcode = '22023';
  end if;
  if public.is_blocked_pair(auth.uid(), v_seller) then
    raise exception 'Conversation unavailable' using errcode = '42501';
  end if;

  select id into v_id from public.conversations
   where buyer_id = auth.uid() and seller_id = v_seller
     and product_id is not distinct from p_product_id;

  if v_id is null then
    insert into public.conversations (product_id, buyer_id, seller_id, business_id)
    values (p_product_id, auth.uid(), v_seller, v_business)
    returning id into v_id;
  end if;

  return v_id;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        public.notification_type not null,
  title       text not null,
  body        text,
  image_url   text,
  -- Deep-link payload: {"route":"product","product_id":"...","ref":100042}
  data        jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  pushed_at   timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread
  on public.notifications (user_id) where read_at is null;

do $mig$
declare t text;
begin
  foreach t in array array['conversations'] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $mig$;

-- Realtime: clients subscribe to messages + conversations + notifications.
do $mig$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.messages;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.conversations;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null; end;
  end if;
end $mig$;

-- Realtime needs the old row to evaluate RLS on UPDATE/DELETE events.
alter table public.messages      replica identity full;
alter table public.conversations replica identity full;
