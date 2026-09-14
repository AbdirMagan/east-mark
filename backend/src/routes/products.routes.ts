import { Router } from 'express';
import { z } from 'zod';

import { env } from '../config/env.js';
import { authOf, optionalAuth, requireAuth } from '../middleware/auth.js';
import { listingLimiter, readLimiter, writeLimiter } from '../middleware/rateLimit.js';
import {
  validateBody,
  validateParams,
  validateQuery,
  validatedQuery,
} from '../middleware/validate.js';
import * as products from '../services/products.service.js';
import { created, noContent, ok, paginated } from '../utils/response.js';
import { idParam, uuid } from '../validators/common.js';
import {
  createProductSchema,
  myProductsQuery,
  productSearchQuery,
  productStatusSchema,
  recordViewSchema,
  refParam,
  registerImageSchema,
  reorderImagesSchema,
  updateProductSchema,
  uploadUrlSchema,
  type ProductSearchQuery,
} from '../validators/products.schema.js';

export const productsRouter: Router = Router();

const detailOptions = { siteUrl: env.SITE_URL };

/* -------------------------------------------------------------------------- */
/* Read                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The marketplace feed. Also serves category browsing, text search and every
 * filter combination — they are all the same query with different arguments.
 *
 * optionalAuth rather than requireAuth: browsing works signed out, but a
 * signed-in caller gets their blocked sellers filtered out by RLS and their
 * saved listings flagged.
 */
productsRouter.get(
  '/',
  readLimiter,
  optionalAuth,
  validateQuery(productSearchQuery),
  async (req, res) => {
    const query = validatedQuery<ProductSearchQuery>(req);
    const { items, meta } = await products.searchProducts(query, req.auth);
    paginated(res, items, meta);
  },
);

/** The caller's own listings, including drafts and rejected ones. */
productsRouter.get(
  '/mine',
  readLimiter,
  requireAuth,
  validateQuery(myProductsQuery),
  async (req, res) => {
    const query = validatedQuery<z.infer<typeof myProductsQuery>>(req);
    const { items, meta } = await products.listMyProducts(authOf(req), query);
    paginated(res, items, meta);
  },
);

productsRouter.get('/recommended', readLimiter, requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20) || 20, 50);
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
  const data = await products.recommendedProducts(authOf(req), limit, offset);
  ok(res, data);
});

/**
 * Shareable link target: eastmarket.app/product/100042 resolves here.
 * Kept ahead of /:id so a numeric ref is never mistaken for a uuid.
 */
productsRouter.get(
  '/ref/:ref',
  readLimiter,
  optionalAuth,
  validateParams(refParam),
  async (req, res) => {
    const data = await products.getProductByRef(Number(req.params.ref), detailOptions, req.auth);
    ok(res, data);
  },
);

productsRouter.get('/:id', readLimiter, optionalAuth, validateParams(idParam), async (req, res) => {
  const data = await products.getProductById(req.params.id as string, detailOptions, req.auth);
  ok(res, data);
});

productsRouter.get('/:id/similar', readLimiter, validateParams(idParam), async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 10) || 10, 30);
  const data = await products.similarProducts(req.params.id as string, limit);
  ok(res, data);
});

/**
 * View counter. Deliberately not awaited into the response: the RPC
 * de-duplicates to one view per viewer per listing per hour, and a slow or
 * failed count must never delay or break a product page.
 */
productsRouter.post(
  '/:id/view',
  optionalAuth,
  validateParams(idParam),
  validateBody(recordViewSchema),
  (req, res) => {
    const body = req.body as z.infer<typeof recordViewSchema>;
    void products
      .recordView(req.params.id as string, req.auth, body.sessionId, body.source)
      .catch(() => undefined);
    ok(res, null, 'Recorded');
  },
);

/* -------------------------------------------------------------------------- */
/* Write                                                                      */
/* -------------------------------------------------------------------------- */

productsRouter.post(
  '/',
  listingLimiter,
  requireAuth,
  validateBody(createProductSchema),
  async (req, res) => {
    const data = await products.createProduct(authOf(req), req.body);
    created(
      res,
      data,
      data.status === 'draft' ? 'Draft saved' : 'Listing submitted for review',
    );
  },
);

productsRouter.patch(
  '/:id',
  writeLimiter,
  requireAuth,
  validateParams(idParam),
  validateBody(updateProductSchema),
  async (req, res) => {
    const data = await products.updateProduct(authOf(req), req.params.id as string, req.body);
    ok(
      res,
      data,
      data.status === 'pending_approval'
        ? 'Updated. Your changes are being reviewed.'
        : 'Listing updated',
    );
  },
);

productsRouter.patch(
  '/:id/status',
  writeLimiter,
  requireAuth,
  validateParams(idParam),
  validateBody(productStatusSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof productStatusSchema>;
    const data = await products.setProductStatus(authOf(req), req.params.id as string, body.status);
    ok(res, data, data.status === 'sold' ? 'Marked as sold' : 'Listing updated');
  },
);

productsRouter.delete('/:id', writeLimiter, requireAuth, validateParams(idParam), async (req, res) => {
  await products.deleteProduct(authOf(req), req.params.id as string);
  noContent(res, 'Listing deleted');
});

/* -------------------------------------------------------------------------- */
/* Images                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Step 1 of 2. Returns a short-lived signed URL the client PUTs the file to
 * directly. The bytes never pass through this API — see the note in
 * products.service.ts for why that matters on a mobile connection.
 */
productsRouter.post(
  '/:id/images/upload-url',
  writeLimiter,
  requireAuth,
  validateParams(idParam),
  validateBody(uploadUrlSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof uploadUrlSchema>;
    const data = await products.createImageUploadUrl(
      authOf(req),
      req.params.id as string,
      body.contentType,
    );
    ok(res, data);
  },
);

/** Step 2 of 2: register the uploaded object against the listing. */
productsRouter.post(
  '/:id/images',
  writeLimiter,
  requireAuth,
  validateParams(idParam),
  validateBody(registerImageSchema),
  async (req, res) => {
    const data = await products.registerImage(authOf(req), req.params.id as string, req.body);
    created(res, data, 'Image added');
  },
);

productsRouter.patch(
  '/:id/images/order',
  writeLimiter,
  requireAuth,
  validateParams(idParam),
  validateBody(reorderImagesSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof reorderImagesSchema>;
    await products.reorderImages(authOf(req), req.params.id as string, body.imageIds);
    ok(res, null, 'Images reordered');
  },
);

productsRouter.delete(
  '/:id/images/:imageId',
  writeLimiter,
  requireAuth,
  validateParams(z.object({ id: uuid, imageId: uuid })),
  async (req, res) => {
    await products.deleteImage(
      authOf(req),
      req.params.id as string,
      req.params.imageId as string,
    );
    noContent(res, 'Image removed');
  },
);
