import type { Response } from 'express';

import type { FieldErrors } from './errors.js';

/**
 * The API speaks one envelope everywhere, so the Android, iOS, web and admin
 * clients can share a single decoder.
 *
 *   success: { "success": true,  "data": {...}, "message": "Success" }
 *   failure: { "success": false, "message": "Validation failed", "errors": {...} }
 */

export interface SuccessBody<T> {
  success: true;
  data: T;
  message: string;
  meta?: PageMeta;
}

export interface ErrorBody {
  success: false;
  message: string;
  code: string;
  errors?: FieldErrors;
  requestId?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function ok<T>(res: Response, data: T, message = 'Success', status = 200): Response {
  const body: SuccessBody<T> = { success: true, data, message };
  return res.status(status).json(body);
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return ok(res, data, message, 201);
}

export function noContent(res: Response, message = 'Deleted'): Response {
  // A body is still sent: clients parse one shape for every response.
  return ok(res, null, message, 200);
}

export function paginated<T>(
  res: Response,
  items: T[],
  meta: PageMeta,
  message = 'Success',
): Response {
  const body: SuccessBody<T[]> = { success: true, data: items, message, meta };
  return res.status(200).json(body);
}

export function buildPageMeta(total: number, page: number, limit: number): PageMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}
