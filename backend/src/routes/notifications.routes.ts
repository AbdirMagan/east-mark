import { Router } from 'express';
import { z } from 'zod';

import { authOf, requireAuth } from '../middleware/auth.js';
import { readLimiter, writeLimiter } from '../middleware/rateLimit.js';
import { validateBody, validateParams, validateQuery, validatedQuery } from '../middleware/validate.js';
import * as notifications from '../services/notifications.service.js';
import { NOTIFICATION_TYPES } from '../services/notifications.service.js';
import { noContent, ok } from '../utils/response.js';
import { idParam } from '../validators/common.js';

export const notificationsRouter: Router = Router();

// Everything here is about one person's own notifications.
notificationsRouter.use(requireAuth);

const listQuery = z.object({
  before: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

notificationsRouter.get('/', readLimiter, validateQuery(listQuery), async (req, res) => {
  const query = validatedQuery<z.infer<typeof listQuery>>(req);
  ok(res, await notifications.list(authOf(req), query));
});

/** The bell badge. Polled by the apps, so it stays cheap: a count, no rows. */
notificationsRouter.get('/unread', readLimiter, async (req, res) => {
  ok(res, await notifications.unreadCount(authOf(req)));
});

notificationsRouter.post('/read-all', writeLimiter, async (req, res) => {
  ok(res, await notifications.markAllRead(authOf(req)), 'All caught up');
});

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

notificationsRouter.get('/preferences', readLimiter, async (req, res) => {
  ok(res, await notifications.preferences(authOf(req)));
});

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM')
  .nullable();

const preferencesBody = z
  .object({
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    typeOverrides: z.record(z.enum(NOTIFICATION_TYPES), z.boolean()).optional(),
    quietHoursStart: time.optional(),
    quietHoursEnd: time.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to change');

notificationsRouter.patch('/preferences', writeLimiter, validateBody(preferencesBody), async (req, res) => {
  const body = req.body as z.infer<typeof preferencesBody>;
  ok(res, await notifications.updatePreferences(authOf(req), body), 'Preferences saved');
});

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

const deviceBody = z.object({
  // An Expo push token, or a browser PushSubscription serialised as JSON --
  // which is why this is long and not a uuid.
  token: z.string().min(16).max(4000),
  platform: z.enum(['android', 'ios', 'web']),
  deviceName: z.string().max(120).optional(),
  appVersion: z.string().max(40).optional(),
  locale: z.string().max(16).optional(),
});

notificationsRouter.post('/devices', writeLimiter, validateBody(deviceBody), async (req, res) => {
  const body = req.body as z.infer<typeof deviceBody>;
  ok(res, await notifications.registerDevice(authOf(req), body), 'Device registered');
});

const forgetBody = z.object({ token: z.string().min(16).max(4000) });

notificationsRouter.post('/devices/forget', writeLimiter, validateBody(forgetBody), async (req, res) => {
  const body = req.body as z.infer<typeof forgetBody>;
  await notifications.unregisterDevice(authOf(req), body.token);
  noContent(res, 'Device forgotten');
});

// ---------------------------------------------------------------------------
// One notification
// ---------------------------------------------------------------------------
//
// Last, because `/:id` would otherwise swallow `/unread`, `/preferences` and
// `/devices` -- Express takes the first route that matches.

notificationsRouter.post('/:id/read', writeLimiter, validateParams(idParam), async (req, res) => {
  ok(res, await notifications.markRead(authOf(req), req.params.id as string));
});

notificationsRouter.delete('/:id', writeLimiter, validateParams(idParam), async (req, res) => {
  await notifications.remove(authOf(req), req.params.id as string);
  noContent(res, 'Notification removed');
});
