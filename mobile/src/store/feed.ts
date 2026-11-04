import { create } from 'zustand';

import type { Media } from '../components/MediaTabs';

/**
 * What the feed screen should show.
 *
 * Carried in a store rather than in the URL. `/feed` lives inside the tab
 * navigator -- that is what keeps the bottom bar under it -- so it is never
 * unmounted, and navigating to it again is a tab switch rather than a fresh
 * screen: new query params do not reliably arrive, and even when they do a
 * `useState` seeded from them has long since stopped listening.
 *
 * A store has none of that ambiguity. Setting it is a plain state update that
 * every subscriber sees, whether the screen is mounted or not.
 */
interface FeedContext {
  /** The listing to open on, or null to start at the top. */
  start: string | null;
  media: Media;
  search: string;
  categoryId: number | null;

  /** Opening a listing from a grid: follow that listing, in its own feed. */
  openListing: (options: {
    start: string;
    media: Media;
    search: string;
    categoryId: number | null;
  }) => void;

  /** Switching tab inside the feed: a different list, so start at its top. */
  setMedia: (media: Media) => void;

  /** Back to the whole catalogue: what tapping the Home tab should mean. */
  reset: () => void;
}

export const useFeedContext = create<FeedContext>((set) => ({
  start: null,
  media: 'photo',
  search: '',
  categoryId: null,

  openListing: ({ start, media, search, categoryId }) =>
    set({ start, media, search, categoryId }),

  // The tapped listing is not in the other list -- photo and video are
  // disjoint -- so keeping it would land on something unrelated.
  setMedia: (media) => set({ media, start: null }),

  reset: () => set({ start: null, search: '', categoryId: null }),
}));
