import { describe, expect, it } from 'vitest';

import { DEFAULT_TARGETS, formatBytes, targetsFromConfig } from '../src/lib/image.js';
import {
  ACCEPTED_VIDEO_TYPES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  formatDuration,
} from '../src/lib/video.js';
import { en } from '../src/i18n/locales/en.js';
import { so } from '../src/i18n/locales/so.js';
import { am } from '../src/i18n/locales/am.js';
import { sw } from '../src/i18n/locales/sw.js';

describe('image targets from remote config', () => {
  it('uses the database values when present', () => {
    // These come from app_settings.media, so the region can be re-tuned for a
    // slower network without shipping a new build.
    const targets = targetsFromConfig({
      image_max_width: 1200,
      image_quality: 65,
      thumbnail_width: 320,
      thumbnail_quality: 60,
      format: 'webp',
    });
    expect(targets).toEqual({
      maxWidth: 1200,
      quality: 65,
      thumbnailWidth: 320,
      thumbnailQuality: 60,
      format: 'webp',
    });
  });

  it('falls back to defaults when the config has not loaded', () => {
    expect(targetsFromConfig(undefined)).toEqual(DEFAULT_TARGETS);
  });

  it('fills the gaps when the config is partial', () => {
    const targets = targetsFromConfig({ image_max_width: 800 });
    expect(targets.maxWidth).toBe(800);
    expect(targets.quality).toBe(DEFAULT_TARGETS.quality);
    expect(targets.thumbnailWidth).toBe(DEFAULT_TARGETS.thumbnailWidth);
  });

  it('only accepts the two formats the encoder can produce', () => {
    expect(targetsFromConfig({ format: 'jpeg' }).format).toBe('jpeg');
    // Anything else would silently produce PNG, which for a photograph is
    // larger than the JPEG it started as.
    expect(targetsFromConfig({ format: 'avif' }).format).toBe('webp');
    expect(targetsFromConfig({ format: 'gif' }).format).toBe('webp');
  });
});

describe('byte formatting', () => {
  it('scales the unit to the size', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(7_552_162)).toBe('7.2 MB');
  });
});

describe('sell form translations', () => {
  const locales = { so, am, sw };
  const sellKeys = (Object.keys(en) as Array<keyof typeof en>).filter((key) =>
    key.startsWith('sell.'),
  );

  it('covers the whole flow in English', () => {
    // The sell form is the longest piece of copy in the product; a missing key
    // here shows an untranslated string mid-flow rather than failing loudly.
    expect(sellKeys.length).toBeGreaterThan(50);
  });

  it.each(Object.entries(locales))('%s translates every sell string', (_name, dictionary) => {
    const missing = sellKeys.filter((key) => !(key in dictionary));
    expect(missing).toEqual([]);
  });

  it.each(Object.entries(locales))('%s keeps the sell placeholders', (_name, dictionary) => {
    for (const key of sellKeys) {
      const translated = (dictionary as Record<string, string>)[key];
      if (!translated) continue;
      const expected = [...en[key].matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      const actual = [...translated.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      expect(actual, `placeholders in "${key}"`).toEqual(expected);
    }
  });
});

describe('listing video limits', () => {
  it('matches what the database and the buckets enforce', () => {
    // These three numbers are repeated in 0020_product_video.sql, in the
    // backend validator and in the two mobile apps. If one of them drifts a
    // seller is told a video is fine and then watches the upload fail.
    expect(MAX_VIDEO_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_VIDEO_SECONDS).toBe(60);
    expect(ACCEPTED_VIDEO_TYPES).toEqual(['video/mp4', 'video/quicktime', 'video/webm']);
  });

  it('formats a duration the way a video player does', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(7)).toBe('0:07');
    expect(formatDuration(42.4)).toBe('0:42');
    expect(formatDuration(60)).toBe('1:00');
  });
});
