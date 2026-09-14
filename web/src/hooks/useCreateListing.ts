import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  ApiError,
  endpoints,
  uploadToSignedUrl,
  type CreateListingInput,
  type CreatedListing,
} from '../lib/api.js';
import type { ProcessedImage } from '../lib/image.js';

export type PublishStage = 'idle' | 'creating' | 'uploading' | 'publishing' | 'done' | 'error';

export interface PublishProgress {
  stage: PublishStage;
  /** 0-1 across the whole publish, for the progress bar. */
  fraction: number;
  uploadedImages: number;
  totalImages: number;
  error: string | null;
  /** Images that failed after retries. The listing still publishes without them. */
  failedImages: number;
}

const INITIAL: PublishProgress = {
  stage: 'idle',
  fraction: 0,
  uploadedImages: 0,
  totalImages: 0,
  error: null,
  failedImages: 0,
};

/**
 * Publishing a listing is three server-side steps, not one.
 *
 *   1. Create the listing as a DRAFT.
 *   2. Upload each photo and register it.
 *   3. Flip the status so it enters moderation.
 *
 * It has to be this order because the storage path contains the product id,
 * so the row must exist before a single byte can be uploaded. Creating it as a
 * draft rather than submitting immediately means a listing interrupted
 * half-way through its uploads sits in the seller's drafts with whatever
 * photos made it, instead of reaching a moderator as a half-built listing with
 * two of five photos.
 *
 * Because this can take a while on a slow uplink, every stage reports progress.
 */
export function useCreateListing() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<PublishProgress>(INITIAL);

  const reset = useCallback(() => setProgress(INITIAL), []);

  const publish = useCallback(
    async (
      input: CreateListingInput,
      images: ProcessedImage[],
      options: { asDraft?: boolean } = {},
    ): Promise<CreatedListing | null> => {
      const total = images.length;
      setProgress({ ...INITIAL, stage: 'creating', totalImages: total });

      let listing: CreatedListing;
      try {
        listing = await endpoints.createListing({ ...input, draft: true });
      } catch (error) {
        setProgress({
          ...INITIAL,
          stage: 'error',
          error: describe(error),
          totalImages: total,
        });
        return null;
      }

      // Uploads are the slow part, so they carry most of the progress bar.
      let uploaded = 0;
      let failed = 0;

      for (const [index, image] of images.entries()) {
        setProgress((previous) => ({
          ...previous,
          stage: 'uploading',
          uploadedImages: uploaded,
          totalImages: total,
          fraction: total === 0 ? 0.85 : 0.1 + (uploaded / total) * 0.75,
        }));

        try {
          await uploadOne(listing.id, image, index === 0);
          uploaded += 1;
        } catch {
          // One bad photo must not cost the seller the whole listing. They can
          // add it again from the edit screen.
          failed += 1;
        }
      }

      setProgress((previous) => ({
        ...previous,
        stage: 'publishing',
        uploadedImages: uploaded,
        failedImages: failed,
        fraction: 0.9,
      }));

      try {
        if (!options.asDraft) {
          await endpoints.setListingStatus(listing.id, 'pending_approval');
        }
      } catch (error) {
        // The listing exists with its photos; only the submit failed. Say so
        // precisely rather than implying the work was lost.
        setProgress({
          stage: 'error',
          fraction: 0.9,
          uploadedImages: uploaded,
          totalImages: total,
          failedImages: failed,
          error: describe(error),
        });
        return listing;
      }

      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });

      setProgress({
        stage: 'done',
        fraction: 1,
        uploadedImages: uploaded,
        totalImages: total,
        failedImages: failed,
        error: null,
      });

      return listing;
    },
    [queryClient],
  );

  return { publish, progress, reset };
}

async function uploadOne(
  productId: string,
  image: ProcessedImage,
  isPrimary: boolean,
): Promise<void> {
  const slots = await endpoints.imageUploadSlots(productId, image.mimeType);

  // Full and thumbnail go up together. They are independent objects and the
  // uplink is the bottleneck, not the browser.
  await Promise.all([
    uploadToSignedUrl(slots.full, image.full),
    uploadToSignedUrl(slots.thumbnail, image.thumbnail),
  ]);

  await endpoints.registerImage(productId, {
    path: slots.full.path,
    thumbnailPath: slots.thumbnail.path,
    width: image.width,
    height: image.height,
    bytes: image.full.size,
    isPrimary,
  });
}

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.fieldErrors) {
      const first = Object.values(error.fieldErrors)[0]?.[0];
      if (first) return first;
    }
    if (error.status === 0) return 'offline';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
