import { useRef, useState } from 'react';

import { useT } from '../../i18n/index.js';
import { formatBytes } from '../../lib/image.js';
import {
  ACCEPTED_VIDEO_TYPES,
  VideoError,
  formatDuration,
  processVideo,
  type SelectedVideo,
} from '../../lib/video.js';
import { Button, Spinner } from '../ui/index.js';
import { Icon } from '../ui/Icon.js';

interface VideoUploaderProps {
  video: SelectedVideo | null;
  onChange: (video: SelectedVideo | null) => void;
}

/**
 * One optional video per listing. Deliberately a single slot rather than a
 * list: the database allows exactly one, and a picker that lets someone choose
 * three and then rejects two of them wastes their data allowance.
 */
export function VideoUploader({ video, onChange }: VideoUploaderProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const next = await processVideo(file);
      if (video) URL.revokeObjectURL(video.previewUrl);
      onChange(next);
    } catch (caught) {
      // The messages are per-code so they can be translated; the thrown
      // English text is a fallback for anything unforeseen.
      if (caught instanceof VideoError) {
        setError(
          t(
            caught.code === 'too-large'
              ? 'sell.videoTooLarge'
              : caught.code === 'too-long'
                ? 'sell.videoTooLong'
                : caught.code === 'unsupported'
                  ? 'sell.videoUnsupported'
                  : 'sell.videoFailed',
          ),
        );
      } else {
        setError(t('sell.videoFailed'));
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (video) URL.revokeObjectURL(video.previewUrl);
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES.join(',')}
        className="sr-only"
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {video ? (
        <div className="flex items-center gap-3 rounded-(--radius-field) border border-border-subtle bg-surface-sunken p-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-(--radius-field) bg-ink-900">
            {video.poster ? (
              <img src={video.previewUrl} alt="" className="size-full object-cover" />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center text-white">
              <Icon name="play" size={22} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">{video.file.name}</p>
            <p className="mt-0.5 text-xs text-text-muted">
              {t('sell.videoMeta', {
                duration: formatDuration(video.durationSeconds),
                size: formatBytes(video.bytes),
              })}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                {t('sell.replaceVideo')}
              </Button>
              <Button type="button" variant="ghost" size="sm" icon="close" onClick={remove}>
                {t('sell.removeVideo')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center gap-3 rounded-(--radius-card) border-2 border-dashed border-border-strong bg-surface-sunken p-5 text-left transition-colors hover:border-brand disabled:opacity-60"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand">
            {busy ? <Spinner size={20} /> : <Icon name="play" size={20} />}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-text-primary">
              {busy ? t('sell.videoReading') : t('sell.addVideo')}
            </span>
            <span className="mt-0.5 block text-sm text-text-secondary">{t('sell.videoHint')}</span>
          </span>
        </button>
      )}

      {error ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-(--color-danger)">
          <Icon name="alert" size={15} className="mt-0.5" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
