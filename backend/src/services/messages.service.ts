import type { AuthContext } from '../types/express.js';
import { BadRequestError, NotFoundError, fromPostgrest } from '../utils/errors.js';

/**
 * Buyer-seller messaging.
 *
 * Every query runs as the signed-in user (auth.db), so the database's row
 * level security is what keeps a conversation between its two participants:
 * a request for someone else's thread finds nothing and an insert into it is
 * refused, whatever this file does. Blocking is enforced there too --
 * messages_insert_sender rejects a message between a blocked pair.
 *
 * Delivery to an open screen does not go through this API. Clients subscribe
 * to Supabase Realtime, which applies the same policies to the change feed.
 * This service covers the rest: starting a thread, the inbox, history,
 * sending, and read receipts.
 */

export interface ConversationSummary {
  id: string;
  /** The caller's side of the conversation. */
  role: 'buyer' | 'seller';
  otherParty: { id: string; name: string; avatarUrl: string | null };
  product: {
    id: string;
    ref: number;
    title: string;
    price: number;
    currency: string;
    thumbnailUrl: string | null;
    status: string;
  } | null;
  /** The thread was about a listing the caller can no longer see. */
  productRemoved: boolean;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastSenderIsMe: boolean;
  unreadCount: number;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
  isMine: boolean;
}

const CONVERSATION_COLUMNS =
  'id, product_id, buyer_id, seller_id, last_message_at, last_message_preview, last_sender_id, buyer_unread_count, seller_unread_count, created_at';
const MESSAGE_COLUMNS = 'id, conversation_id, sender_id, type, body, created_at, read_at';

interface ConversationRow {
  id: string;
  product_id: string | null;
  buyer_id: string;
  seller_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_sender_id: string | null;
  buyer_unread_count: number;
  seller_unread_count: number;
  created_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

function toMessage(row: MessageRow, me: string): MessageDto {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    type: row.type,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    isMine: row.sender_id === me,
  };
}

/** Adds names, avatars and listing cards in four batched queries, not per row. */
async function summarise(auth: AuthContext, rows: ConversationRow[]): Promise<ConversationSummary[]> {
  if (rows.length === 0) return [];
  const me = auth.userId;

  const otherIds = [...new Set(rows.map((row) => (row.buyer_id === me ? row.seller_id : row.buyer_id)))];
  const productIds = [
    ...new Set(rows.map((row) => row.product_id).filter((id): id is string => Boolean(id))),
  ];

  type ProductLite = { id: string; ref: number; title: string; price: number; currency_code: string; status: string };
  type ImageLite = { product_id: string; url: string; thumbnail_url: string | null; is_primary: boolean; position: number };

  const [profiles, sellers, products, images] = await Promise.all([
    auth.db.from('profiles').select('id, full_name, username, avatar_url').in('id', otherIds),
    auth.db.from('seller_profiles').select('user_id, display_name').in('user_id', otherIds),
    productIds.length
      ? auth.db.from('products').select('id, ref, title, price, currency_code, status').in('id', productIds)
      : Promise.resolve({ data: [] as ProductLite[], error: null }),
    productIds.length
      ? auth.db
          .from('product_images')
          .select('product_id, url, thumbnail_url, is_primary, position')
          .in('product_id', productIds)
          .order('is_primary', { ascending: false })
          .order('position')
      : Promise.resolve({ data: [] as ImageLite[], error: null }),
  ]);

  const profileById = new Map((profiles.data ?? []).map((row) => [row.id, row]));
  const sellerByUser = new Map((sellers.data ?? []).map((row) => [row.user_id, row]));
  const productById = new Map(((products.data ?? []) as ProductLite[]).map((row) => [row.id, row]));
  const imageByProduct = new Map<string, string>();
  for (const image of (images.data ?? []) as ImageLite[]) {
    if (!imageByProduct.has(image.product_id)) {
      imageByProduct.set(image.product_id, image.thumbnail_url ?? image.url);
    }
  }

  return rows.map((row): ConversationSummary => {
    const isBuyer = row.buyer_id === me;
    const otherId = isBuyer ? row.seller_id : row.buyer_id;
    const profile = profileById.get(otherId);
    const product = row.product_id ? productById.get(row.product_id) : undefined;

    return {
      id: row.id,
      role: isBuyer ? 'buyer' : 'seller',
      otherParty: {
        id: otherId,
        name:
          sellerByUser.get(otherId)?.display_name ?? profile?.full_name ?? profile?.username ?? 'East-Market user',
        avatarUrl: profile?.avatar_url ?? null,
      },
      product: product
        ? {
            id: product.id,
            ref: product.ref,
            title: product.title,
            price: Number(product.price),
            currency: product.currency_code,
            thumbnailUrl: imageByProduct.get(product.id) ?? null,
            status: product.status,
          }
        : null,
      // Deleted, or suspended by moderation. The conversation stays readable.
      productRemoved: Boolean(row.product_id) && !product,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_preview,
      lastSenderIsMe: row.last_sender_id === me,
      unreadCount: isBuyer ? row.buyer_unread_count : row.seller_unread_count,
      createdAt: row.created_at,
    };
  });
}

export async function listConversations(auth: AuthContext): Promise<ConversationSummary[]> {
  const me = auth.userId;
  const { data, error } = await auth.db
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    // A buyer sees every thread they opened. A seller only sees a thread once
    // it has a message: tapping "Message" and walking away should not leave an
    // empty conversation sitting in the seller's inbox.
    .or(`buyer_id.eq.${me},and(seller_id.eq.${me},last_message_at.not.is.null)`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw fromPostgrest(error, 'Conversations');
  return summarise(auth, (data ?? []) as ConversationRow[]);
}

export async function getConversation(auth: AuthContext, id: string): Promise<ConversationSummary> {
  const { data, error } = await auth.db
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Conversation');
  // RLS returns nothing for a thread the caller is not part of, so "not found"
  // and "not yours" look the same from outside -- deliberately.
  if (!data) throw new NotFoundError('Conversation');

  const [summary] = await summarise(auth, [data as ConversationRow]);
  return summary!;
}

/**
 * Finds or creates the thread between the caller and a listing's seller.
 * start_conversation() is idempotent, so a double tap opens the same thread.
 */
export async function startConversation(auth: AuthContext, productId: string): Promise<{ id: string }> {
  const { data, error } = await auth.db.rpc('start_conversation', { p_product_id: productId });

  if (error) {
    if (error.code === '22023' && /yourself/i.test(error.message)) {
      throw new BadRequestError('You cannot message yourself about your own listing');
    }
    throw fromPostgrest(error, 'Listing');
  }
  return { id: data as string };
}

export async function listMessages(
  auth: AuthContext,
  id: string,
  options: { before?: string; limit: number },
): Promise<{ items: MessageDto[]; hasMore: boolean }> {
  // A cheap membership check first, so a stranger gets 404 rather than an
  // empty list that would imply the thread exists.
  const conversation = await auth.db.from('conversations').select('id').eq('id', id).maybeSingle();
  if (conversation.error) throw fromPostgrest(conversation.error, 'Conversation');
  if (!conversation.data) throw new NotFoundError('Conversation');

  let query = auth.db
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(options.limit + 1);

  if (options.before) query = query.lt('created_at', options.before);

  const { data, error } = await query;
  if (error) throw fromPostgrest(error, 'Messages');

  const rows = (data ?? []) as MessageRow[];
  return {
    // Fetched newest-first for the limit, returned oldest-first for display.
    items: rows.slice(0, options.limit).reverse().map((row) => toMessage(row, auth.userId)),
    hasMore: rows.length > options.limit,
  };
}

export async function sendMessage(auth: AuthContext, id: string, body: string): Promise<MessageDto> {
  const text = body.trim();
  if (!text) throw new BadRequestError('Write a message first');

  const { data, error } = await auth.db
    .from('messages')
    .insert({ conversation_id: id, sender_id: auth.userId, type: 'text', body: text })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) {
    // 23503: no such conversation. 42501 (mapped to 403): RLS refused it --
    // the caller is not a participant, or a block is in place.
    if (error.code === '23503') throw new NotFoundError('Conversation');
    throw fromPostgrest(error, 'Conversation');
  }
  return toMessage(data as MessageRow, auth.userId);
}

/** Marks the other party's messages read and zeroes the caller's unread count. */
export async function markRead(auth: AuthContext, id: string): Promise<void> {
  const { error } = await auth.db.rpc('mark_conversation_read', { p_conversation_id: id });
  if (error) throw fromPostgrest(error, 'Conversation');
}

export async function unreadCount(auth: AuthContext): Promise<{ total: number; conversations: number }> {
  const [asBuyer, asSeller] = await Promise.all([
    auth.db
      .from('conversations')
      .select('buyer_unread_count')
      .eq('buyer_id', auth.userId)
      .gt('buyer_unread_count', 0),
    auth.db
      .from('conversations')
      .select('seller_unread_count')
      .eq('seller_id', auth.userId)
      .gt('seller_unread_count', 0),
  ]);

  if (asBuyer.error) throw fromPostgrest(asBuyer.error, 'Conversations');
  if (asSeller.error) throw fromPostgrest(asSeller.error, 'Conversations');

  const counts = [
    ...(asBuyer.data ?? []).map((row) => row.buyer_unread_count),
    ...(asSeller.data ?? []).map((row) => row.seller_unread_count),
  ];
  return { total: counts.reduce((sum, n) => sum + n, 0), conversations: counts.length };
}
