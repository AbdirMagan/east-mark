import { fireAndForget, request } from './client';
import type {
  Category,
  ChatMessage,
  ConversationSummary,
  Country,
  CreatedListing,
  HomeAd,
  MessagePage,
  Place,
  ProductCard,
  ProductDetail,
  ProductImage,
  Profile,
  UnreadCount,
  UploadSlots,
} from './types';

/**
 * Every call the app makes, in one list.
 *
 * Mirrors ios/EastMarket/Networking/Endpoints.swift. Keeping the set visible
 * in a single file is what makes it obvious when a screen starts reaching for
 * something the backend does not offer.
 */
export const api = {
  // Reference data ----------------------------------------------------------

  categories: (lang: string) => request<Category[]>('categories', { query: { lang } }),

  countries: (lang: string) => request<Country[]>('locations/countries', { query: { lang } }),

  cities: (countryId: number, lang: string) =>
    request<Place[]>('locations/cities', { query: { countryId, lang } }),

  homeAds: (lang: string, countryId?: number | null) =>
    request<HomeAd[]>('ads/home', { query: { lang, countryId } }),

  recordAdClick: (id: string) => fireAndForget(`ads/${id}/click`, { method: 'POST' }),

  // Listings ----------------------------------------------------------------

  /** `media` is "photo" (listings with no video) or "video" (only those). */
  products: (options: {
    search?: string;
    categoryId?: number | null;
    countryId?: number | null;
    featuredOnly?: boolean;
    media?: 'photo' | 'video';
    sort?: string;
    limit?: number;
  } = {}) =>
    request<ProductCard[]>('products', {
      authorized: true,
      query: {
        q: options.search,
        categoryId: options.categoryId,
        countryId: options.countryId,
        featuredOnly: options.featuredOnly ? 'true' : undefined,
        media: options.media,
        sort: options.sort ?? 'newest',
        limit: options.limit ?? 30,
      },
    }),

  product: (ref: number) => request<ProductDetail>(`products/ref/${ref}`, { authorized: true }),

  similar: (productId: string) => request<ProductCard[]>(`products/${productId}/similar`),

  recordView: (productId: string) =>
    fireAndForget(`products/${productId}/view`, {
      method: 'POST',
      body: { source: 'app' },
      authorized: true,
    }),

  // Account -----------------------------------------------------------------

  me: () => request<Profile>('users/me', { authorized: true }),

  favorites: () => request<ProductCard[]>('users/me/favorites', { authorized: true }),

  addFavorite: (productId: string) =>
    request<unknown>(`users/me/favorites/${productId}`, { method: 'PUT', authorized: true }),

  removeFavorite: (productId: string) =>
    request<unknown>(`users/me/favorites/${productId}`, { method: 'DELETE', authorized: true }),

  // Messaging ---------------------------------------------------------------

  conversations: () =>
    request<ConversationSummary[]>('messages/conversations', { authorized: true }),

  startConversation: (productId: string) =>
    request<{ id: string }>('messages/conversations', {
      method: 'POST',
      body: { productId },
      authorized: true,
    }),

  messages: (conversationId: string) =>
    request<MessagePage>(`messages/conversations/${conversationId}/messages`, {
      authorized: true,
    }),

  sendMessage: (conversationId: string, body: string) =>
    request<ChatMessage>(`messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { body },
      authorized: true,
    }),

  markRead: (conversationId: string) =>
    fireAndForget(`messages/conversations/${conversationId}/read`, {
      method: 'POST',
      authorized: true,
    }),

  unread: () => request<UnreadCount>('messages/unread-count', { authorized: true }),

  // Selling -----------------------------------------------------------------

  createListing: (fields: Record<string, unknown>) =>
    request<CreatedListing>('products', { method: 'POST', body: fields, authorized: true }),

  uploadSlots: (productId: string, contentType: string) =>
    request<UploadSlots>(`products/${productId}/images/upload-url`, {
      method: 'POST',
      body: { contentType },
      authorized: true,
    }),

  registerImage: (productId: string, path: string, thumbnailPath: string) =>
    request<ProductImage>(`products/${productId}/images`, {
      method: 'POST',
      body: { path, thumbnailPath },
      authorized: true,
    }),

  submitForReview: (productId: string) =>
    request<unknown>(`products/${productId}/submit`, { method: 'POST', authorized: true }),
};
