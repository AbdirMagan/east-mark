/**
 * Client-side image processing.
 *
 * Photos are resized and re-encoded in the browser before upload, never on the
 * server. A phone camera produces 3-6 MB JPEGs; uploading one of those over a
 * 3G uplink takes the better part of a minute, and a seller adding five photos
 * will give up long before that. Resizing to 1600px WebP typically lands each
 * one between 80 and 250 KB — often a 20x reduction — and the upload is the
 * slow half of the journey, so this is the single biggest thing that makes
 * listing something feel possible on a bad connection.
 *
 * A separate 400px thumbnail is produced at the same time. That is what the
 * product grid renders, so browsing twenty listings costs a few hundred
 * kilobytes rather than several megabytes.
 *
 * Targets come from app_settings.media in the database, so they can be re-tuned
 * for the region without shipping a new build.
 */

export interface ImageTargets {
  maxWidth: number;
  quality: number;
  thumbnailWidth: number;
  thumbnailQuality: number;
  format: 'webp' | 'jpeg';
}

export const DEFAULT_TARGETS: ImageTargets = {
  maxWidth: 1600,
  quality: 78,
  thumbnailWidth: 400,
  thumbnailQuality: 70,
  format: 'webp',
};

export interface ProcessedImage {
  /** Full-size, resized and re-encoded. */
  full: Blob;
  /** Small version for grids and the gallery strip. */
  thumbnail: Blob;
  width: number;
  height: number;
  mimeType: string;
  /** Object URL for previewing before upload. Revoke it when done. */
  previewUrl: string;
  originalBytes: number;
}

export class ImageError extends Error {
  readonly code: 'unsupported' | 'too-large' | 'decode-failed' | 'encode-failed';
  constructor(code: ImageError['code'], message: string) {
    super(message);
    this.name = 'ImageError';
    this.code = code;
  }
}

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

/** 20 MB. Anything larger is almost certainly not a phone photo. */
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

let webpSupport: boolean | null = null;

/**
 * Canvas WebP encoding is unavailable on older Safari, which silently falls
 * back to PNG — and a PNG of a photograph is larger than the JPEG we started
 * with. Detect once and encode JPEG instead when that is the case.
 */
async function supportsWebpEncoding(): Promise<boolean> {
  if (webpSupport !== null) return webpSupport;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.8),
    );
    webpSupport = blob?.type === 'image/webp';
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

export async function processImage(
  file: File,
  targets: ImageTargets = DEFAULT_TARGETS,
): Promise<ProcessedImage> {
  if (!ACCEPTED.has(file.type) && !file.type.startsWith('image/')) {
    throw new ImageError('unsupported', 'That file is not an image');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError('too-large', 'That image is too large (20 MB maximum)');
  }

  const bitmap = await decode(file);

  try {
    const useWebp = targets.format === 'webp' && (await supportsWebpEncoding());
    const mimeType = useWebp ? 'image/webp' : 'image/jpeg';

    const full = await resizeTo(bitmap, targets.maxWidth, mimeType, targets.quality / 100);
    const thumbnail = await resizeTo(
      bitmap,
      targets.thumbnailWidth,
      mimeType,
      targets.thumbnailQuality / 100,
    );

    const scale = Math.min(1, targets.maxWidth / bitmap.width);

    return {
      full: full.blob,
      thumbnail: thumbnail.blob,
      width: Math.round(bitmap.width * scale),
      height: Math.round(bitmap.height * scale),
      mimeType,
      previewUrl: URL.createObjectURL(thumbnail.blob),
      originalBytes: file.size,
    };
  } finally {
    bitmap.close();
  }
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    // imageOrientation: 'from-image' applies the EXIF rotation tag. Without it
    // photos taken in portrait on many Android phones upload sideways, which
    // is one of those bugs that makes a marketplace look amateurish.
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Older Safari does not accept the options argument at all.
    try {
      return await createImageBitmap(file);
    } catch {
      throw new ImageError('decode-failed', 'That image could not be read');
    }
  }
}

async function resizeTo(
  bitmap: ImageBitmap,
  maxWidth: number,
  mimeType: string,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  // Never upscale: enlarging a small photo adds bytes and no detail.
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new ImageError('encode-failed', 'Your browser could not process that image');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, quality),
  );
  if (!blob) throw new ImageError('encode-failed', 'That image could not be converted');

  return { blob, width, height };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Reads the media targets out of the remote config, falling back to defaults. */
export function targetsFromConfig(settings: Record<string, unknown> | undefined): ImageTargets {
  const media = settings as
    | {
        image_max_width?: number;
        image_quality?: number;
        thumbnail_width?: number;
        thumbnail_quality?: number;
        format?: string;
      }
    | undefined;

  if (!media) return DEFAULT_TARGETS;

  return {
    maxWidth: media.image_max_width ?? DEFAULT_TARGETS.maxWidth,
    quality: media.image_quality ?? DEFAULT_TARGETS.quality,
    thumbnailWidth: media.thumbnail_width ?? DEFAULT_TARGETS.thumbnailWidth,
    thumbnailQuality: media.thumbnail_quality ?? DEFAULT_TARGETS.thumbnailQuality,
    format: media.format === 'jpeg' ? 'jpeg' : 'webp',
  };
}
