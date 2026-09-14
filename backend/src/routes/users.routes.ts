import { Router } from 'express';
import { z } from 'zod';

import { authOf, requireAuth } from '../middleware/auth.js';
import { readLimiter, writeLimiter } from '../middleware/rateLimit.js';
import {
  validateBody,
  validateParams,
  validateQuery,
  validatedQuery,
} from '../middleware/validate.js';
import * as users from '../services/users.service.js';
import { noContent, ok, paginated } from '../utils/response.js';
import {
  currencyCode,
  idParam,
  languageCode,
  latitude,
  longitude,
  optionalText,
  pagination,
  phone,
  refId,
} from '../validators/common.js';

export const usersRouter: Router = Router();

usersRouter.use(requireAuth);

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

usersRouter.get('/me', readLimiter, async (req, res) => {
  ok(res, await users.getMe(authOf(req)));
});

const updateProfileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_]{3,30}$/, 'Use 3-30 letters, numbers or underscores')
      .optional(),
    fullName: optionalText(120),
    avatarUrl: z.string().url().max(500).optional(),
    bio: optionalText(500),
    language: languageCode.optional(),
    currency: currencyCode.optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    countryId: refId.optional(),
    regionId: refId.optional(),
    cityId: refId.optional(),
    districtId: refId.optional(),
    neighborhoodId: refId.optional(),
    latitude: latitude.optional(),
    longitude: longitude.optional(),
    interests: z.array(refId).max(30).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

usersRouter.patch('/me', writeLimiter, validateBody(updateProfileSchema), async (req, res) => {
  ok(res, await users.updateProfile(authOf(req), req.body), 'Profile updated');
});

const onboardingSchema = z.object({
  countryId: refId,
  regionId: refId.optional(),
  cityId: refId.optional(),
  language: languageCode,
  currency: currencyCode.optional(),
  fullName: optionalText(120),
  interests: z.array(refId).max(30).optional(),
});

/** Country, language, city and interests, stamped as one step. */
usersRouter.post('/me/onboarding', writeLimiter, validateBody(onboardingSchema), async (req, res) => {
  ok(res, await users.completeOnboarding(authOf(req), req.body), 'Welcome to East-Market');
});

const contactSchema = z
  .object({
    phone: phone.nullable().optional(),
    whatsapp: phone.nullable().optional(),
    showPhone: z.boolean().optional(),
    showWhatsapp: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

/** Contact details and their visibility switches. */
usersRouter.patch('/me/contact', writeLimiter, validateBody(contactSchema), async (req, res) => {
  ok(res, await users.updateContact(authOf(req), req.body), 'Contact details updated');
});

/* -------------------------------------------------------------------------- */
/* Favorites                                                                  */
/* -------------------------------------------------------------------------- */

usersRouter.get('/me/favorites', readLimiter, validateQuery(pagination), async (req, res) => {
  const { page, limit } = validatedQuery<z.infer<typeof pagination>>(req);
  const { items, meta } = await users.listFavorites(authOf(req), page, limit);
  paginated(res, items, meta);
});

usersRouter.put(
  '/me/favorites/:id',
  writeLimiter,
  validateParams(idParam),
  async (req, res) => {
    await users.addFavorite(authOf(req), req.params.id as string);
    ok(res, null, 'Saved');
  },
);

usersRouter.delete(
  '/me/favorites/:id',
  writeLimiter,
  validateParams(idParam),
  async (req, res) => {
    await users.removeFavorite(authOf(req), req.params.id as string);
    noContent(res, 'Removed from saved');
  },
);

/* -------------------------------------------------------------------------- */
/* Devices                                                                    */
/* -------------------------------------------------------------------------- */

const deviceSchema = z.object({
  token: z.string().trim().min(10).max(512),
  platform: z.enum(['android', 'ios', 'web']),
  deviceName: optionalText(80),
  appVersion: optionalText(24),
  locale: optionalText(12),
});

usersRouter.post('/me/devices', writeLimiter, validateBody(deviceSchema), async (req, res) => {
  await users.registerDevice(authOf(req), req.body);
  ok(res, null, 'Device registered');
});

usersRouter.delete(
  '/me/devices',
  writeLimiter,
  validateBody(z.object({ token: z.string().trim().min(10).max(512) })),
  async (req, res) => {
    await users.unregisterDevice(authOf(req), (req.body as { token: string }).token);
    noContent(res, 'Device removed');
  },
);
