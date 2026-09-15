import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/realtime-js';

import { Button, EmptyState, ErrorState, Skeleton, Spinner } from '../components/ui/index.js';
import { Icon } from '../components/ui/Icon.js';
import { useSeo } from '../hooks/useSeo.js';
import { useI18n, useT } from '../i18n/index.js';
import { ApiError, endpoints, type ChatMessage, type ConversationSummary } from '../lib/api.js';
import { formatPrice, formatRelativeTime } from '../lib/format.js';
import { getRealtime } from '../lib/realtime.js';
import { useAuth } from '../store/auth.js';

/* -------------------------------------------------------------------------- */
/* Message timeline helpers                                                   */
/* -------------------------------------------------------------------------- */

/** A messages row as it arrives over Realtime, in database column names. */
interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

function fromRow(row: MessageRow, myId: string): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    type: row.type,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    isMine: row.sender_id === myId,
  };
}

/**
 * Combines messages by id, newer copy winning.
 *
 * The same message can arrive twice -- once in the response to sending it and
 * once over the socket -- in either order. Keying by id is what keeps exactly
 * one copy on screen regardless of which lands first.
 */
function mergeById(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()];
}

/** Confirmed messages in server-time order; anything still sending stays last. */
function inOrder(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    if (Boolean(a.status) !== Boolean(b.status)) return a.status ? 1 : -1;
    return (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0);
  });
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export function MessagesPage() {
  const t = useT();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const session = useAuth((state) => state.session);
  const initialising = useAuth((state) => state.initialising);

  useSeo({ title: t('messages.title'), noIndex: true, path: '/messages' });

  if (initialising) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-text-muted">
        <Spinner size={26} />
      </div>
    );
  }
  if (!session) return <Navigate to="/signin?next=/messages" replace />;
  if (conversationId === 'new') return <StartConversation />;

  const myId = session.user.id;

  return (
    <div className="mx-auto max-w-[80rem] md:px-6 md:py-6">
      <div className="overflow-hidden bg-surface-raised md:grid md:h-[calc(100dvh-7rem)] md:grid-cols-[22rem_1fr] md:grid-rows-1 md:rounded-[--radius-card] md:border md:border-border-subtle">
        {/* On a phone the list and a thread are separate screens; side by side from md up. */}
        <aside
          className={`${conversationId ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-border-subtle md:border-r`}
        >
          <ConversationList activeId={conversationId} myId={myId} />
        </aside>

        <section
          className={`${conversationId ? 'flex' : 'hidden md:flex'} h-[calc(100dvh-11.25rem)] min-h-0 flex-col md:h-auto`}
        >
          {conversationId ? <Thread key={conversationId} id={conversationId} myId={myId} /> : <NoSelection />}
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* /messages/new?product=… — open the thread, then replace the URL            */
/* -------------------------------------------------------------------------- */

function StartConversation() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const productId = params.get('product');
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const start = useCallback(() => {
    if (!productId) return;
    setError(null);
    endpoints
      .startConversation(productId)
      .then(({ id }) => {
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
        // Replace, so Back from the thread returns to the listing, not to this redirect.
        navigate(`/messages/${id}`, { replace: true });
      })
      .catch((caught: unknown) =>
        setError(caught instanceof ApiError ? caught.message : t('messages.startError')),
      );
  }, [productId, navigate, queryClient, t]);

  useEffect(() => {
    // React's StrictMode runs effects twice in development; a ref survives that.
    if (started.current) return;
    started.current = true;
    start();
  }, [start]);

  if (!productId) return <Navigate to="/messages" replace />;

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <ErrorState title={t('messages.startError')} body={error} onRetry={start} retryLabel={t('common.retry')} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-text-muted">
      <Spinner size={26} />
      <p className="text-sm">{t('messages.starting')}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inbox                                                                      */
/* -------------------------------------------------------------------------- */

/** Refreshes the inbox and the unread badges whenever one of my threads changes. */
function useConversationFeed(myId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void getRealtime().then((client) => {
      if (cancelled) return;
      // No filter needed: RLS only delivers changes to conversations I am in.
      channel = client
        .channel(`inbox:${myId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
          void queryClient.invalidateQueries({ queryKey: ['conversations'] });
          void queryClient.invalidateQueries({ queryKey: ['messages-unread'] });
        })
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void channel.unsubscribe();
    };
  }, [myId, queryClient]);
}

function ConversationList({ activeId, myId }: { activeId?: string; myId: string }) {
  const t = useT();
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: endpoints.conversations,
    staleTime: 10_000,
  });
  useConversationFeed(myId);

  return (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-border-subtle px-4">
        <h1 className="text-base font-bold text-text-primary">{t('messages.title')}</h1>
      </div>

      {conversations.isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : conversations.isError ? (
        <div className="p-4">
          <ErrorState
            title={t('messages.loadError')}
            onRetry={() => void conversations.refetch()}
            retryLabel={t('common.retry')}
          />
        </div>
      ) : (conversations.data?.length ?? 0) === 0 ? (
        <div className="p-4">
          <EmptyState
            icon="message"
            title={t('messages.empty')}
            body={t('messages.emptyBody')}
            action={
              <Link
                to="/browse"
                className="inline-flex h-11 items-center rounded-[--radius-field] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover dark:text-ink-950"
              >
                {t('empty.browse')}
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border-subtle overflow-y-auto">
          {conversations.data!.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === activeId}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function ConversationRow({ conversation: c, active }: { conversation: ConversationSummary; active: boolean }) {
  const t = useT();
  const { language } = useI18n();
  const when = c.lastMessageAt ?? c.createdAt;
  const preview = c.lastMessagePreview
    ? `${c.lastSenderIsMe ? `${t('messages.you')}: ` : ''}${c.lastMessagePreview}`
    : t('messages.newConversation');

  return (
    <li>
      <Link
        to={`/messages/${c.id}`}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken ${
          active ? 'bg-brand-subtle' : ''
        }`}
      >
        {c.product?.thumbnailUrl ? (
          <img
            src={c.product.thumbnailUrl}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            className="size-11 shrink-0 rounded-[--radius-field] object-cover"
          />
        ) : (
          <Avatar name={c.otherParty.name} imageUrl={c.otherParty.avatarUrl} size={44} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-sm text-text-primary ${c.unreadCount ? 'font-bold' : 'font-semibold'}`}>
              {c.otherParty.name}
            </span>
            <time dateTime={when} className="shrink-0 text-[0.6875rem] text-text-muted">
              {formatRelativeTime(when, language)}
            </time>
          </div>
          <p className="truncate text-xs text-text-muted">
            {c.product?.title ?? (c.productRemoved ? t('messages.listingRemoved') : '')}
          </p>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className={`truncate text-sm ${c.unreadCount ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
              {preview}
            </p>
            {c.unreadCount ? (
              <span className="shrink-0 rounded-full bg-accent px-1.5 text-[0.6875rem] font-bold leading-5 text-white dark:text-ink-950">
                {c.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}

function Avatar({ name, imageUrl, size }: { name: string; imageUrl: string | null; size: number }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-subtle font-semibold text-brand"
      style={{ width: size, height: size }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function NoSelection() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-subtle text-brand">
        <Icon name="message" size={22} />
      </span>
      <p className="font-semibold text-text-primary">{t('messages.select')}</p>
      <p className="max-w-xs text-sm text-text-secondary">{t('messages.selectBody')}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Thread                                                                     */
/* -------------------------------------------------------------------------- */

function Thread({ id, myId }: { id: string; myId: string }) {
  const t = useT();
  const { language } = useI18n();
  const queryClient = useQueryClient();

  const summary = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => endpoints.conversation(id),
    staleTime: 30_000,
  });
  const firstPage = useQuery({
    queryKey: ['messages', id],
    queryFn: () => endpoints.messages(id),
    // The socket keeps an open thread current. A background refetch would
    // replace the timeline and drop messages that are still being sent.
    staleTime: Infinity,
    gcTime: 0,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  const seeded = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    if (!firstPage.data || seeded.current) return;
    seeded.current = true;
    setMessages((current) => mergeById(current, firstPage.data.items));
    setHasMore(firstPage.data.hasMore);
  }, [firstPage.data]);

  const refreshInbox = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    void queryClient.invalidateQueries({ queryKey: ['messages-unread'] });
  }, [queryClient]);

  const markRead = useCallback(() => {
    void endpoints.markConversationRead(id).then(refreshInbox).catch(() => undefined);
  }, [id, refreshInbox]);

  useEffect(() => {
    markRead();
  }, [markRead]);

  // Live delivery, read receipts and the typing indicator.
  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let typingTimer: ReturnType<typeof setTimeout> | undefined;

    void getRealtime().then((client) => {
      if (cancelled) return;

      channel = client
        .channel(`conversation:${id}`, { config: { broadcast: { self: false } } })
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
          (payload) => {
            const incoming = fromRow(payload.new as MessageRow, myId);
            setMessages((current) => mergeById(current, [incoming]));
            if (!incoming.isMine) {
              setTyping(false);
              // The thread is open, so the message has been seen.
              markRead();
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
          (payload) => {
            // read_at being set is what turns "sent" into "Seen".
            setMessages((current) => mergeById(current, [fromRow(payload.new as MessageRow, myId)]));
          },
        )
        .on('broadcast', { event: 'typing' }, (message) => {
          if ((message.payload as { userId?: string } | undefined)?.userId === myId) return;
          setTyping(true);
          clearTimeout(typingTimer);
          typingTimer = setTimeout(() => setTyping(false), 4000);
        })
        .subscribe((status) => {
          if (String(status) !== 'SUBSCRIBED') return;
          // A message sent between the first page loading and this socket
          // subscribing would otherwise never appear. One catch-up fetch closes that gap.
          void endpoints
            .messages(id)
            .then((page) => setMessages((current) => mergeById(current, page.items)))
            .catch(() => undefined);
        });

      channelRef.current = channel;
    });

    return () => {
      cancelled = true;
      clearTimeout(typingTimer);
      channelRef.current = null;
      if (channel) void channel.unsubscribe();
    };
  }, [id, myId, markRead]);

  const timeline = useMemo(() => inOrder(messages), [messages]);
  const lastMine = useMemo(
    () => [...timeline].reverse().find((message) => message.isMine && !message.status),
    [timeline],
  );

  // Follow the conversation, unless the reader has scrolled up to look back.
  useEffect(() => {
    const element = scrollRef.current;
    if (element && stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [timeline, typing]);

  const onScroll = () => {
    const element = scrollRef.current;
    if (element) stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  };

  const loadOlder = async () => {
    const oldest = timeline.find((message) => !message.status);
    const element = scrollRef.current;
    if (!oldest || !element) return;

    const previousHeight = element.scrollHeight;
    setLoadingOlder(true);
    try {
      const page = await endpoints.messages(id, oldest.createdAt);
      stickToBottom.current = false;
      setMessages((current) => mergeById(current, page.items));
      setHasMore(page.hasMore);
      // Keep the reader's place rather than jumping to the top of the older page.
      requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight - previousHeight;
      });
    } catch {
      // The button stays, so they can try again.
    } finally {
      setLoadingOlder(false);
    }
  };

  /**
   * Shows the message immediately, then confirms it. On a slow connection the
   * round trip can take seconds; waiting for it before showing anything makes
   * people tap Send again and post twice.
   */
  const send = async (text: string, retryId?: string) => {
    const body = text.trim();
    if (!body) return;

    const tempId = retryId ?? `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const pending: ChatMessage = {
      id: tempId,
      conversationId: id,
      senderId: myId,
      type: 'text',
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
      isMine: true,
      status: 'sending',
    };

    stickToBottom.current = true;
    setMessages((current) => [...current.filter((message) => message.id !== tempId), pending]);

    try {
      const saved = await endpoints.sendMessage(id, body);
      setMessages((current) => mergeById(current.filter((message) => message.id !== tempId), [saved]));
      refreshInbox();
    } catch {
      setMessages((current) =>
        current.map((message) => (message.id === tempId ? { ...message, status: 'failed' as const } : message)),
      );
    }
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    const now = Date.now();
    // Throttled: one "typing" signal every two seconds, not one per keystroke.
    if (value && channelRef.current && now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      void channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } });
    }
  };

  if (summary.isError) {
    return (
      <div className="p-6">
        <ErrorState
          title={t('messages.loadError')}
          body={summary.error instanceof ApiError ? summary.error.message : undefined}
          onRetry={() => void summary.refetch()}
          retryLabel={t('common.retry')}
        />
      </div>
    );
  }

  const conversation = summary.data;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle px-3">
        <Link
          to="/messages"
          aria-label={t('messages.back')}
          className="inline-flex size-9 items-center justify-center rounded-[--radius-field] text-text-secondary hover:bg-surface-sunken md:hidden"
        >
          <Icon name="chevron-left" size={20} />
        </Link>
        {conversation ? (
          <>
            <Avatar name={conversation.otherParty.name} imageUrl={conversation.otherParty.avatarUrl} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">{conversation.otherParty.name}</p>
              <p className="truncate text-xs text-text-muted" aria-live="polite">
                {typing
                  ? t('messages.typing', { name: conversation.otherParty.name })
                  : t(conversation.role === 'buyer' ? 'messages.seller' : 'messages.buyer')}
              </p>
            </div>
          </>
        ) : (
          <Skeleton className="h-8 w-40" />
        )}
      </header>

      {conversation?.product ? (
        <Link
          to={`/product/${conversation.product.ref}`}
          className="flex shrink-0 items-center gap-3 border-b border-border-subtle bg-surface-sunken/50 px-3 py-2 transition-colors hover:bg-surface-sunken"
        >
          {conversation.product.thumbnailUrl ? (
            <img
              src={conversation.product.thumbnailUrl}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              className="size-10 shrink-0 rounded-[--radius-field] object-cover"
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[--radius-field] bg-surface-sunken text-text-muted">
              <Icon name="image" size={16} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] uppercase tracking-wide text-text-muted">{t('messages.aboutListing')}</p>
            <p className="truncate text-sm font-medium text-text-primary">{conversation.product.title}</p>
          </div>
          <span className="shrink-0 text-sm font-bold text-text-primary">
            {formatPrice(conversation.product.price, conversation.product.currency, language)}
          </span>
        </Link>
      ) : conversation?.productRemoved ? (
        <p className="shrink-0 border-b border-border-subtle bg-surface-sunken/50 px-3 py-2 text-xs text-text-muted">
          {t('messages.listingRemoved')}
        </p>
      ) : null}

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {hasMore ? (
          <div className="mb-3 flex justify-center">
            <Button variant="ghost" size="sm" loading={loadingOlder} onClick={() => void loadOlder()}>
              {t('common.showMore')}
            </Button>
          </div>
        ) : null}

        {firstPage.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-3/5" />
          </div>
        ) : firstPage.isError ? (
          <ErrorState
            title={t('messages.loadError')}
            onRetry={() => void firstPage.refetch()}
            retryLabel={t('common.retry')}
          />
        ) : timeline.length === 0 ? (
          <p className="mx-auto mt-10 max-w-xs text-center text-sm text-text-muted">{t('messages.newConversation')}</p>
        ) : (
          <ol className="space-y-2" aria-live="polite">
            {timeline.map((message) => (
              <li key={message.id} className={`flex flex-col ${message.isMine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed sm:max-w-[70%] ${
                    message.isMine
                      ? 'rounded-br-md bg-brand text-white dark:text-ink-950'
                      : 'rounded-bl-md bg-surface-sunken text-text-primary'
                  } ${message.status ? 'opacity-70' : ''}`}
                >
                  {/* Plain text only; React escapes it, and pre-wrap keeps the sender's line breaks. */}
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                </div>
                <div className="mt-0.5 px-1 text-[0.6875rem] text-text-muted">
                  {message.status === 'sending' ? (
                    t('messages.sending')
                  ) : message.status === 'failed' ? (
                    <button
                      type="button"
                      onClick={() => void send(message.body ?? '', message.id)}
                      className="font-semibold text-[--color-danger] hover:underline"
                    >
                      {t('messages.failed')}
                    </button>
                  ) : (
                    <>
                      <time dateTime={message.createdAt}>{formatRelativeTime(message.createdAt, language)}</time>
                      {message.id === lastMine?.id && message.readAt ? <span> · {t('messages.seen')}</span> : null}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft;
          setDraft('');
          void send(text);
        }}
        className="flex shrink-0 items-end gap-2 border-t border-border-subtle bg-surface-raised p-3"
      >
        <label htmlFor="message-draft" className="sr-only">
          {t('messages.placeholder')}
        </label>
        <textarea
          id="message-draft"
          rows={1}
          value={draft}
          maxLength={2000}
          placeholder={t('messages.placeholder')}
          enterKeyHint="send"
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            // Never send mid-composition: Amharic and other input-method
            // keyboards use Enter to confirm a character, not to send.
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-[--radius-field] border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
        <Button type="submit" icon="arrow-right" disabled={!draft.trim()} aria-label={t('messages.send')}>
          <span className="hidden sm:inline">{t('messages.send')}</span>
        </Button>
      </form>
    </>
  );
}
