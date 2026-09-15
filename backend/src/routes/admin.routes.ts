import { Router } from 'express';
import { z } from 'zod';

import { authOf, requireAdmin, requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { readLimiter, writeLimiter } from '../middleware/rateLimit.js';
import { validateBody, validateParams, validateQuery, validatedQuery } from '../middleware/validate.js';
import { AD_PLACEMENTS, AD_TARGET_TYPES, AD_THEMES } from '../services/ads.service.js';
import * as admin from '../services/admin.service.js';
import { created, ok, paginated } from '../utils/response.js';
import { idParam, optionalText, pagination, refId, uuid } from '../validators/common.js';

export const adminRouter: Router = Router();

// Every route below is staff-only. requireAuth resolves the token, requireAdmin
// reads profiles.role and rejects anyone who is not an admin or moderator.
adminRouter.use(requireAuth, requireAdmin);

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

adminRouter.get('/stats', readLimiter, async (req, res) => {
  ok(res, await admin.getStats(authOf(req)));
});

adminRouter.get('/analytics', readLimiter, async (req, res) => {
  ok(res, await admin.getAnalytics(authOf(req)));
});

/* -------------------------------------------------------------------------- */
/* Listings                                                                   */
/* -------------------------------------------------------------------------- */

const productListQuery = pagination.extend({
  status: z
    .enum(['draft', 'pending_approval', 'active', 'rejected', 'sold', 'expired', 'suspended'])
    .optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

adminRouter.get('/products', readLimiter, validateQuery(productListQuery), async (req, res) => {
  const query = validatedQuery<z.infer<typeof productListQuery>>(req);
  const { items, meta } = await admin.listProducts(authOf(req), query);
  paginated(res, items, meta);
});

const moderationBody = z.object({
  decision: z.enum(['approve', 'reject', 'suspend', 'restore']),
  reason: optionalText(500),
});

adminRouter.post(
  '/products/:id/moderate',
  writeLimiter,
  validateParams(idParam),
  validateBody(moderationBody),
  async (req, res) => {
    const body = req.body as z.infer<typeof moderationBody>;
    const data = await admin.moderateProduct(
      authOf(req),
      req.params.id as string,
      body.decision,
      body.reason,
    );
    ok(res, data, `Listing ${body.decision}d`);
  },
);

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

const userListQuery = pagination.extend({
  q: z.string().trim().min(1).max(80).optional(),
  role: z.enum(['buyer', 'seller', 'business', 'moderator', 'admin']).optional(),
});

adminRouter.get('/users', readLimiter, validateQuery(userListQuery), async (req, res) => {
  const query = validatedQuery<z.infer<typeof userListQuery>>(req);
  const { items, meta } = await admin.listUsers(authOf(req), query);
  paginated(res, items, meta);
});

const userUpdateBody = z
  .object({
    role: z.enum(['buyer', 'seller', 'business', 'moderator', 'admin']).optional(),
    isBanned: z.boolean().optional(),
    banReason: optionalText(500),
  })
  .refine((value) => value.role !== undefined || value.isBanned !== undefined, {
    message: 'Nothing to update',
  });

adminRouter.patch(
  '/users/:id',
  writeLimiter,
  validateParams(idParam),
  validateBody(userUpdateBody),
  async (req, res) => {
    const body = req.body as z.infer<typeof userUpdateBody>;
    // Granting or revoking staff access is an admin-only act, not a moderator
    // one: a moderator who could promote accounts could promote themselves.
    if (body.role === 'admin' || body.role === 'moderator') {
      return requireSuperAdmin(req, res, async (error?: unknown) => {
        if (error) return res.status(403).json({ success: false, message: 'Admins only', code: 'forbidden' });
        ok(res, await admin.updateUser(authOf(req), req.params.id as string, body), 'User updated');
      });
    }
    ok(res, await admin.updateUser(authOf(req), req.params.id as string, body), 'User updated');
  },
);

/* -------------------------------------------------------------------------- */
/* Reports                                                                    */
/* -------------------------------------------------------------------------- */

const reportListQuery = pagination.extend({
  status: z.enum(['open', 'under_review', 'actioned', 'dismissed']).optional(),
});

adminRouter.get('/reports', readLimiter, validateQuery(reportListQuery), async (req, res) => {
  const query = validatedQuery<z.infer<typeof reportListQuery>>(req);
  const { items, meta } = await admin.listReports(authOf(req), query);
  paginated(res, items, meta);
});

const reportResolveBody = z.object({
  status: z.enum(['under_review', 'actioned', 'dismissed']),
  resolutionNote: optionalText(1000),
  actionTaken: optionalText(200),
});

adminRouter.patch(
  '/reports/:id',
  writeLimiter,
  validateParams(idParam),
  validateBody(reportResolveBody),
  async (req, res) => {
    const data = await admin.resolveReport(authOf(req), req.params.id as string, req.body);
    ok(res, data, 'Report updated');
  },
);

/* -------------------------------------------------------------------------- */
/* Verification                                                               */
/* -------------------------------------------------------------------------- */

const verificationListQuery = pagination.extend({
  status: z.enum(['pending', 'verified', 'rejected', 'unverified']).optional(),
});

adminRouter.get('/verifications', readLimiter, validateQuery(verificationListQuery), async (req, res) => {
  const query = validatedQuery<z.infer<typeof verificationListQuery>>(req);
  const { items, meta } = await admin.listVerifications(authOf(req), query);
  paginated(res, items, meta);
});

const verificationDecisionBody = z.object({
  status: z.enum(['verified', 'rejected']),
  reviewNote: optionalText(1000),
});

adminRouter.patch(
  '/verifications/:id',
  writeLimiter,
  validateParams(idParam),
  validateBody(verificationDecisionBody),
  async (req, res) => {
    const data = await admin.decideVerification(authOf(req), req.params.id as string, req.body);
    ok(res, data, 'Verification updated');
  },
);

/* -------------------------------------------------------------------------- */
/* Categories and locations                                                   */
/* -------------------------------------------------------------------------- */

const categoryBody = z.object({
  id: refId.optional(),
  parentId: refId.nullable().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  icon: optionalText(40),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour such as #1E6F5C')
    .optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  translations: z.record(z.string().max(80)).optional(),
});

adminRouter.post('/categories', writeLimiter, validateBody(categoryBody), async (req, res) => {
  const data = await admin.upsertCategory(authOf(req), req.body);
  ok(res, data, 'Category saved');
});

const locationParams = z.object({
  level: z.enum(['countries', 'regions', 'cities', 'districts']),
});

adminRouter.post(
  '/locations/:level',
  writeLimiter,
  validateParams(locationParams),
  validateBody(z.record(z.unknown())),
  async (req, res) => {
    const data = await admin.upsertLocation(
      authOf(req),
      req.params.level as 'countries' | 'regions' | 'cities' | 'districts',
      req.body as Record<string, unknown> & { id?: number },
    );
    ok(res, data, 'Location saved');
  },
);

/* -------------------------------------------------------------------------- */
/* Audit trail                                                                */
/* -------------------------------------------------------------------------- */

adminRouter.get('/audit', readLimiter, validateQuery(pagination), async (req, res) => {
  const query = validatedQuery<z.infer<typeof pagination>>(req);
  const { items, meta } = await admin.listAuditLog(authOf(req), query);
  paginated(res, items, meta);
});

/* -------------------------------------------------------------------------- */
/* Promotions: the home carousel slides on the web and Android                */
/* -------------------------------------------------------------------------- */

const isoDate = z.string().datetime({ offset: true, message: 'Must be a date and time' });

const adCopy = z.object({
  title: optionalText(80),
  subtitle: optionalText(200),
  badge: optionalText(24),
  cta_label: optionalText(40),
});

const adBody = z.object({
  placement: z.enum(AD_PLACEMENTS).default('home_hero'),
  title: z.string().trim().min(2, 'Give the slide a title').max(80, 'Must be 80 characters or fewer'),
  subtitle: optionalText(200),
  badge: optionalText(24),
  ctaLabel: optionalText(40),
  theme: z.enum(AD_THEMES).default('night'),
  icon: optionalText(32),
  imageUrl: z
    .union([z.literal('').transform(() => null), z.string().trim().url('Must be a full https:// address').max(500)])
    .nullable()
    .optional(),
  targetType: z.enum(AD_TARGET_TYPES).default('url'),
  targetValue: optionalText(300),
  status: z.enum(['draft', 'scheduled', 'running', 'paused', 'ended', 'rejected']).default('running'),
  priority: z.coerce.number().int().min(0).max(1000).default(0),
  startsAt: isoDate.optional(),
  endsAt: isoDate.nullable().optional(),
  translations: z.record(z.enum(['so', 'am', 'sw']), adCopy).optional(),
});

adminRouter.get('/ads', readLimiter, async (req, res) => {
  ok(res, await admin.listAds(authOf(req)));
});

adminRouter.post('/ads', writeLimiter, validateBody(adBody), async (req, res) => {
  created(res, await admin.createAd(authOf(req), req.body as admin.AdInput), 'Promotion created');
});

adminRouter.patch('/ads/:id', writeLimiter, validateParams(idParam), validateBody(adBody), async (req, res) => {
  ok(res, await admin.updateAd(authOf(req), req.params.id as string, req.body as admin.AdInput), 'Promotion saved');
});

adminRouter.delete('/ads/:id', writeLimiter, validateParams(idParam), async (req, res) => {
  await admin.deleteAd(authOf(req), req.params.id as string);
  ok(res, null, 'Promotion deleted');
});

export { uuid };
