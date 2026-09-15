import { useCallback, useEffect, useRef, useState } from 'react';

import { useT } from '../../i18n/index.js';
import {
  ImageError,
  formatBytes,
  processImage,
  type ImageTargets,
  type ProcessedImage,
} from '../../lib/image.js';
import { Button, Spinner } from '../ui/index.js';
import { Icon } from '../ui/Icon.js';

interface ImageUploaderProps {
  images: ProcessedImage[];
  onChange: (images: ProcessedImage[]) => void;
  targets: ImageTargets;
  maxImages?: number;
}

export function ImageUploader({ images, onChange, targets, maxImages = 10 }: ImageUploaderProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Object URLs are a real leak if left behind: a seller who adds and removes
  // a dozen photos would hold every one of them in memory until a reload.
  useEffect(() => {
    return () => {
      for (const image of images) URL.revokeObjectURL(image.previewUrl);
    };
    // Intentionally on unmount only; removals revoke individually below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const room = maxImages - images.length;
      const list = Array.from(files).slice(0, Math.max(0, room));

      if (list.length === 0) {
        if (files.length > 0) setError(t('sell.imagesFull', { max: maxImages }));
        return;
      }

      setBusy(list.length);
      const processed: ProcessedImage[] = [];

      for (const file of list) {
        try {
          processed.push(await processImage(file, targets));
        } catch (caught) {
          setError(
            caught instanceof ImageError ? caught.message : t('sell.imageFailed', { name: file.name }),
          );
        } finally {
          setBusy((previous) => previous - 1);
        }
      }

      if (processed.length > 0) onChange([...images, ...processed]);
    },
    [images, maxImages, onChange, t, targets],
  );

  const remove = (index: number) => {
    const image = images[index];
    if (image) URL.revokeObjectURL(image.previewUrl);
    onChange(images.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  };

  const savedBytes = images.reduce(
    (total, image) => total + Math.max(0, image.originalBytes - image.full.size),
    0,
  );

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) void addFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files);
          }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-(--radius-card) border-2 border-dashed p-10 text-center transition-colors ${
            dragOver
              ? 'border-brand bg-brand-subtle'
              : 'border-border-strong bg-surface-sunken hover:border-brand'
          }`}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-subtle text-brand">
            <Icon name="image" size={22} />
          </span>
          <span className="font-semibold text-text-primary">{t('sell.addPhotos')}</span>
          <span className="max-w-xs text-sm text-text-secondary">{t('sell.photosHint')}</span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {images.map((image, index) => (
            <figure
              key={image.previewUrl}
              className="group relative aspect-square overflow-hidden rounded-(--radius-field) border border-border-subtle bg-surface-sunken"
            >
              <img
                src={image.previewUrl}
                alt=""
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />

              {index === 0 ? (
                <figcaption className="absolute inset-x-0 top-0 bg-brand/90 px-1.5 py-0.5 text-center text-[0.625rem] font-semibold text-white">
                  {t('sell.coverPhoto')}
                </figcaption>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-0.5 bg-ink-900/70 p-1 opacity-0 backdrop-blur-sm transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={t('sell.moveEarlier')}
                  className="flex size-6 items-center justify-center rounded text-white disabled:opacity-30"
                >
                  <Icon name="chevron-left" size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={t('sell.removePhoto')}
                  className="flex size-6 items-center justify-center rounded text-white hover:text-(--color-danger)"
                >
                  <Icon name="close" size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === images.length - 1}
                  aria-label={t('sell.moveLater')}
                  className="flex size-6 items-center justify-center rounded text-white disabled:opacity-30"
                >
                  <Icon name="chevron-right" size={14} />
                </button>
              </div>
            </figure>
          ))}

          {busy > 0
            ? Array.from({ length: busy }, (_, index) => (
                <div
                  key={`busy-${index}`}
                  className="flex aspect-square items-center justify-center rounded-(--radius-field) border border-border-subtle bg-surface-sunken text-text-muted"
                >
                  <Spinner size={20} />
                </div>
              ))
            : null}

          {images.length + busy < maxImages ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-(--radius-field) border-2 border-dashed border-border-strong text-text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <Icon name="plus" size={20} />
              <span className="text-[0.625rem] font-medium">{t('sell.addMore')}</span>
            </button>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <span>
          {t('sell.photoCount', { count: images.length, max: maxImages })}
          {images.length > 0 ? ` · ${t('sell.firstIsCover')}` : ''}
        </span>
        {savedBytes > 0 ? (
          // Worth surfacing: it explains why uploading felt fast, and it is the
          // seller's data allowance being saved.
          <span className="inline-flex items-center gap-1 text-(--color-success)">
            <Icon name="check" size={13} />
            {t('sell.compressed', { saved: formatBytes(savedBytes) })}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-(--color-danger)">
          <Icon name="alert" size={15} className="mt-0.5" />
          {error}
        </p>
      ) : null}

      {images.length === 0 ? null : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon="plus"
          onClick={() => inputRef.current?.click()}
          disabled={images.length >= maxImages}
          className="sm:hidden"
        >
          {t('sell.addPhotos')}
        </Button>
      )}
    </div>
  );
}
