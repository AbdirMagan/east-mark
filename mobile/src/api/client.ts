import { API_BASE_URL } from '../config';
import type { Envelope } from './types';

/**
 * The backend client.
 *
 * Everything the app shows comes through here rather than from Supabase
 * directly, so the business rules live in one place instead of being
 * reimplemented in each of the three clients. The phone only ever holds the
 * publishable key and its own session token.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Supplies the signed-in user's access token, set by the auth store once it
 * exists. A function rather than a value because the token is refreshed, and
 * a captured copy goes stale within the hour.
 */
let tokenProvider: () => Promise<string | null> = async () => null;

export function setTokenProvider(provider: () => Promise<string | null>) {
  tokenProvider = provider;
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE_URL}/${path.replace(/^\//, '')}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    // An empty filter is not a filter: sending `categoryId=` asks the backend
    // to match listings whose category is the empty string.
    if (value === null || value === undefined || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: Envelope<T> | null = null;
  try {
    body = text ? (JSON.parse(text) as Envelope<T>) : null;
  } catch {
    // An HTML error page from a proxy, or a truncated response on a bad
    // connection. Either way it is not the API answering.
    throw new ApiError(response.status, 'The server sent something unreadable');
  }

  if (!response.ok || body?.success === false) {
    throw new ApiError(
      response.status,
      body?.message ?? `Request failed (${response.status})`,
      (body as { code?: string } | null)?.code ?? 'error',
    );
  }

  return (body?.data ?? (null as unknown)) as T;
}

interface RequestOptions {
  method?: string;
  query?: Query;
  body?: unknown;
  /** Send the access token when there is one. Some routes vary by viewer. */
  authorized?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, authorized = false } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authorized) {
    const token = await tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // On a 2G connection this is the common failure, and "network request
    // failed" tells a seller nothing they can act on.
    throw new ApiError(0, 'Could not reach East Market. Check your connection.', 'offline');
  }

  return parse<T>(response);
}

/** For the calls whose outcome does not change the screen: views, clicks, read receipts. */
export async function fireAndForget(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  try {
    await request(path, options);
  } catch {
    // Deliberately silent. A view counter that fails is not worth a message.
  }
}
