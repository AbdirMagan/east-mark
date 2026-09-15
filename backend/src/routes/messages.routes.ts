import { Router } from 'express';
import { z } from 'zod';

import { authOf, requireAuth } from '../middleware/auth.js';
import { messageLimiter, readLimiter } from '../middleware/rateLimit.js';
import {
  validateBody,
  validateParams,
  validateQuery,
  validatedQuery,
} from '../middleware/validate.js';
import * as messages from '../services/messages.service.js';
import { created, ok } from '../utils/response.js';
import { idParam, uuid } from '../validators/common.js';

export const messagesRouter: Router = Router();

// Messaging is for signed-in users only; RLS then limits each user to their own threads.
messagesRouter.use(requireAuth);

/** Total unread messages, for the header and bottom-nav badges. */
messagesRouter.get('/unread', readLimiter, async (req, res) => {
  ok(res, await messages.unreadCount(authOf(req)));
});

/** The inbox. */
messagesRouter.get('/conversations', readLimiter, async (req, res) => {
  ok(res, await messages.listConversations(authOf(req)));
});

const startBody = z.object({ productId: uuid });

/** Opens (or reopens) the thread with a listing's seller. */
messagesRouter.post('/conversations', messageLimiter, validateBody(startBody), async (req, res) => {
  const body = req.body as z.infer<typeof startBody>;
  created(res, await messages.startConversation(authOf(req), body.productId), 'Conversation ready');
});

messagesRouter.get('/conversations/:id', readLimiter, validateParams(idParam), async (req, res) => {
  ok(res, await messages.getConversation(authOf(req), req.params.id as string));
});

const historyQuery = z.object({
  /** Cursor: return messages older than this timestamp. */
  before: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

messagesRouter.get(
  '/conversations/:id/messages',
  readLimiter,
  validateParams(idParam),
  validateQuery(historyQuery),
  async (req, res) => {
    const query = validatedQuery<z.infer<typeof historyQuery>>(req);
    ok(res, await messages.listMessages(authOf(req), req.params.id as string, query));
  },
);

const sendBody = z.object({
  body: z.string().trim().min(1, 'Write a message first').max(2000, 'Messages can be up to 2000 characters'),
});

messagesRouter.post(
  '/conversations/:id/messages',
  messageLimiter,
  validateParams(idParam),
  validateBody(sendBody),
  async (req, res) => {
    const body = req.body as z.infer<typeof sendBody>;
    created(res, await messages.sendMessage(authOf(req), req.params.id as string, body.body), 'Sent');
  },
);

/**
 * Read receipts. On the read limiter rather than the message limiter: an open
 * thread calls this every time a message arrives, which is reading, not sending.
 */
messagesRouter.post('/conversations/:id/read', readLimiter, validateParams(idParam), async (req, res) => {
  await messages.markRead(authOf(req), req.params.id as string);
  ok(res, null, 'Marked as read');
});
