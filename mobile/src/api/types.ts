/**
 * The shapes the backend returns.
 *
 * These mirror ios/EastMarket/Networking/Models.swift and the web client's
 * types: one API, three clients, and a field that drifts in one of them shows
 * up as a blank space on a screen rather than as an error anyone sees.
 */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/** Every response is wrapped in this, success or failure. */
export interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: PageMeta;
}

export interface Country {
  id: number;
  code: string;
  name: string;
  dialCode?: string | null;
  defaultCurrency?: string | null;
}

export interface Place {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon?: string | null;
  accentColor?: string | null;
  parentId?: number | null;
  children?: Category[];
}

export interface SellerRef {
  id: string;
  name: string;
  avatarUrl?: string | null;
  verified: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  /** For a video this is the poster frame, which is all a gallery loads. */
  thumbnailUrl?: string | null;
  isPrimary: boolean;
  mediaType?: string | null;
  durationSeconds?: number | null;
}

export interface ProductCard {
  id: string;
  ref: number;
  title: string;
  price: number;
  currency: string;
  negotiable: boolean;
  condition: string;
  city?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  /** The card shows a badge; the video itself is only fetched on the listing. */
  hasVideo?: boolean | null;
  /** Present on search results, so the feed plays without a second call. */
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
  videoDurationSeconds?: number | null;
  featured: boolean;
  publishedAt?: string | null;
  seller: SellerRef;
  isFavorited?: boolean | null;
}

export interface ProductDetail {
  id: string;
  ref: number;
  title: string;
  price: number;
  currency: string;
  negotiable: boolean;
  condition: string;
  city?: string | null;
  description?: string | null;
  categoryId: number;
  status?: string | null;
  images?: ProductImage[];
  seller: SellerRef;
  contact?: { phone?: string | null; whatsapp?: string | null } | null;
  shareUrl?: string | null;
}

export interface HomeAd {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  ctaLabel?: string | null;
  theme?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  targetType?: string | null;
  targetValue?: string | null;
  link?: string | null;
  categoryId?: number | null;
}

export interface ConversationSummary {
  id: string;
  role: string;
  otherParty: { id: string; name: string; avatarUrl?: string | null };
  product?: {
    id: string;
    ref: number;
    title: string;
    price: number;
    currency: string;
    thumbnailUrl?: string | null;
  } | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastSenderIsMe: boolean;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body?: string | null;
  createdAt: string;
  readAt?: string | null;
  isMine: boolean;
}

export interface MessagePage {
  items: ChatMessage[];
  hasMore: boolean;
}

/**
 * One notification, as the API files it. `data` is the deep link; its keys
 * depend on the type, so it stays loose here and is narrowed where it is read.
 */
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  data: { route?: string; conversationId?: string; productId?: string };
  read: boolean;
  createdAt: string;
}

export interface UnreadCount {
  total: number;
  conversations: number;
}

export interface Profile {
  id: string;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

export interface CreatedListing {
  id: string;
  ref: number;
  status: string;
}

export interface UploadSlot {
  uploadUrl: string;
  token: string;
  path: string;
}

export interface UploadSlots {
  full: UploadSlot;
  thumbnail: UploadSlot;
}

/** The name to greet someone by, never a raw id. */
export function displayName(profile: Profile | null | undefined): string {
  if (profile?.fullName?.trim()) return profile.fullName.trim();
  if (profile?.username) return profile.username;
  return 'Magan Market';
}

/** Cards carry a thumbnail or a full image; either will do. */
export function cardImage(product: ProductCard): string | null {
  return product.thumbnailUrl ?? product.imageUrl ?? null;
}

export function isVideo(image: ProductImage): boolean {
  return image.mediaType === 'video';
}
