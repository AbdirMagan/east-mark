import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useI18n } from '../i18n/index.js';
import { ApiError, endpoints, type ProductCard, type ProductSearchParams } from '../lib/api.js';
import { useAuth } from '../store/auth.js';

/**
 * Reference data barely changes and is needed on nearly every screen, so it is
 * held for an hour and never refetched on focus. The backend caches it too;
 * this layer stops the request being made at all during a session.
 */
const REFERENCE = {
  staleTime: 60 * 60_000,
  gcTime: 24 * 60 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
} as const;

export function useConfig() {
  return useQuery({ queryKey: ['config'], queryFn: endpoints.config, ...REFERENCE });
}

export function useCategories() {
  const { language } = useI18n();
  return useQuery({
    queryKey: ['categories', language],
    queryFn: () => endpoints.categories(language),
    ...REFERENCE,
  });
}

export function useCategory(slug: string | undefined) {
  const { language } = useI18n();
  return useQuery({
    queryKey: ['category', slug, language],
    queryFn: () => endpoints.category(slug!, language),
    enabled: Boolean(slug),
    ...REFERENCE,
  });
}

export function useCountries() {
  const { language } = useI18n();
  return useQuery({
    queryKey: ['countries', language],
    queryFn: () => endpoints.countries(language),
    ...REFERENCE,
  });
}

export function useCities(countryId: number | null) {
  const { language } = useI18n();
  return useQuery({
    queryKey: ['cities', countryId, language],
    queryFn: () => endpoints.cities({ countryId: countryId!, lang: language }),
    enabled: countryId != null,
    ...REFERENCE,
  });
}

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

export function useProductSearch(params: ProductSearchParams, enabled = true) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: ({ signal }) => endpoints.searchProducts(params, signal),
    enabled,
    // A feed one minute stale is fine; refetching on every tab focus burns
    // data the visitor is paying for by the megabyte.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });
}

export function useProduct(ref: number | undefined) {
  return useQuery({
    queryKey: ['product', ref],
    queryFn: () => endpoints.productByRef(ref!),
    enabled: Number.isFinite(ref),
    staleTime: 60_000,
    retry: (failureCount, error) =>
      // Retrying a 404 just delays the "not found" page.
      error instanceof ApiError && !error.isTransient ? false : failureCount < 2,
  });
}

export function useSimilarProducts(id: string | undefined) {
  return useQuery({
    queryKey: ['similar', id],
    queryFn: () => endpoints.similarProducts(id!),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}

export function useMe() {
  const session = useAuth((state) => state.session);
  return useQuery({
    queryKey: ['me', session?.user.id],
    queryFn: endpoints.me,
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
  });
}

/**
 * Saving a listing, applied optimistically.
 *
 * The heart must fill the instant it is tapped. Waiting for a round trip on a
 * 2G connection makes the control feel broken and invites a second tap, which
 * would toggle it back off. On failure the previous state is restored.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const session = useAuth((state) => state.session);

  return useMutation({
    mutationFn: async (product: ProductCard) => {
      if (!session) throw new ApiError(401, { success: false, message: 'auth', code: 'unauthorized' });
      if (product.isFavorited) {
        await endpoints.removeFavorite(product.id);
      } else {
        await endpoints.addFavorite(product.id);
      }
      return !product.isFavorited;
    },

    onMutate: async (product) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const snapshot = queryClient.getQueriesData({ queryKey: ['products'] });

      const flip = (card: ProductCard): ProductCard =>
        card.id === product.id
          ? {
              ...card,
              isFavorited: !card.isFavorited,
              favoriteCount: Math.max(0, card.favoriteCount + (card.isFavorited ? -1 : 1)),
            }
          : card;

      queryClient.setQueriesData<{ data: ProductCard[] }>({ queryKey: ['products'] }, (old) =>
        old ? { ...old, data: old.data.map(flip) } : old,
      );
      queryClient.setQueriesData<ProductCard[]>({ queryKey: ['similar'] }, (old) =>
        old ? old.map(flip) : old,
      );

      return { snapshot };
    },

    onError: (_error, _product, context) => {
      for (const [key, value] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, value);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
