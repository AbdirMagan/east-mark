/**
 * Client-side video checks and poster extraction.
 *
 * A video is the one thing on a listing that a buyer pays real money to watch:
 * twenty seconds of a car walk-around is several megabytes, and on a metered
 * 3G bundle that is a visible cost. So the rules are strict and enforced here,
 * before a byte leaves the phone, rather than only in the database:
 *
 *   - one video per listing (the database has a partial unique index)
 *   - 60 seconds at most
 *   - 20 MB at most
 *
 * The browser cannot re-encode video the way it re-encodes photos — there is no
 * equivalent of canvas.toBlob for a whole file, and pushing a phone through a
 * WebCodecs transcode would flatten the battery. So the file is uploaded as
 * recorded and the limits are hard refusals with an explanation, not silent
 * compression.
 *
 * A poster frame IS extracted here: one frame, drawn to a canvas and encoded as
 * a small WebP. That is what the gallery shows until the buyer presses play, so
 * browsing a listing with a video costs kilobytes instead of megabytes.
 */

export interface SelectedVideo {
  file: File;
  /** One frame, for the gallery. Null when the browser refused to decode it. */
  poster: Blob | null;
  durationSeconds: number;
  width: number;
  height: number;
  /** Object URL of the poster (or the video itself), for the preview tile. */
  previewUrl: string;
  bytes: number;
}

export class VideoError extends Error {
  readonly code: 'unsupported' | 'too-large' | 'too-long' | 'decode-failed';
  constructor(code: VideoError['code'], message: string) {
    super(message);
    this.name = 'VideoError';
    this.code = code;
  }
}

/** What the backend's storage bucket accepts: Android, iPhone, desktop. */
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;

export async function processVideo(file: File): Promise<SelectedVideo> {
  if (!file.type.startsWith('video/')) {
    throw new VideoError('unsupported', 'That file is not a video');
  }
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    throw new VideoError('unsupported', 'A video must be MP4, MOV or WebM');
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new VideoError('too-large', 'That video is too large (20 MB maximum)');
  }

  const probe = await probeVideo(file);

  if (probe.duration > MAX_VIDEO_SECONDS + 0.5) {
    URL.revokeObjectURL(probe.objectUrl);
    throw new VideoError('too-long', 'A video can be at most 60 seconds long');
  }

  const poster = await grabPoster(probe.element, probe.width, probe.height).catch(() => null);
  probe.element.src = '';
  URL.revokeObjectURL(probe.objectUrl);

  return {
    file,
    poster,
    durationSeconds: Math.max(1, Math.round(probe.duration)),
    width: probe.width,
    height: probe.height,
    previewUrl: URL.createObjectURL(poster ?? file),
    bytes: file.size,
  };
}

interface Probe {
  element: HTMLVideoElement;
  objectUrl: string;
  duration: number;
  width: number;
  height: number;
}

/** Loads just enough of the file to learn its duration and dimensions. */
function probeVideo(file: File): Promise<Probe> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const element = document.createElement('video');
    element.preload = 'metadata';
    element.muted = true;
    // Required on iOS Safari, which otherwise takes the video fullscreen and
    // refuses to decode a frame off-screen.
    element.playsInline = true;

    const fail = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new VideoError('decode-failed', 'That video could not be read by this browser'));
    };

    element.onerror = fail;
    element.onloadedmetadata = () => {
      const duration = Number.isFinite(element.duration) ? element.duration : 0;
      if (duration <= 0) {
        fail();
        return;
      }
      resolve({
        element,
        objectUrl,
        duration,
        width: element.videoWidth || 0,
        height: element.videoHeight || 0,
      });
    };

    element.src = objectUrl;
  });
}

/**
 * Seeks a little way in and captures one frame. The very first frame of a phone
 * recording is often the lens still focusing, so a fraction of a second in
 * makes a better thumbnail.
 */
function grabPoster(element: HTMLVideoElement, width: number, height: number): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    if (!width || !height) {
      resolve(null);
      return;
    }

    const scale = Math.min(1, 640 / width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const timer = window.setTimeout(() => resolve(null), 4000);

    const draw = () => {
      window.clearTimeout(timer);
      try {
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.72);
      } catch {
        // A cross-origin or DRM-protected source taints the canvas. The listing
        // still works; it simply shows a play tile instead of a frame.
        resolve(null);
      }
    };

    element.onseeked = draw;
    element.onerror = () => {
      window.clearTimeout(timer);
      reject(new VideoError('decode-failed', 'That video could not be read by this browser'));
    };

    try {
      element.currentTime = Math.min(0.5, element.duration / 2);
    } catch {
      window.clearTimeout(timer);
      resolve(null);
    }
  });
}

/** "0:42" — the badge on the gallery tile. */
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}
