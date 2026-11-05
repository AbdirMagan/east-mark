import { Router } from 'express';
import { z } from 'zod';

import { authLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import * as phoneAuth from '../services/phoneAuth.service.js';
import { created, ok } from '../utils/response.js';

export const authRouter: Router = Router();

/**
 * Phone sign-up and sign-in.
 *
 * Email accounts do not come through here: the apps talk to Supabase Auth
 * directly for those, as they always have. A phone number needs the server,
 * because turning it into the address the account is held under takes a
 * secret no client may hold.
 *
 * Both routes answer with a session the client installs exactly as it would
 * one from Supabase, so everything downstream -- refreshing, the API's own
 * bearer token, signing out -- is unchanged.
 */

const phone = z
  .string()
  .trim()
  .min(6, 'Enter your phone number')
  .max(24, 'That is too long for a phone number');

// Supabase's own floor is 6. Eight is not much to ask of the one credential
// standing between someone and their listings, and nothing stops a long one.
const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Passwords can be up to 72 characters');

/** The country's dial code, e.g. "252". Sent so "063..." resolves correctly. */
const dialCode = z.string().trim().max(6).optional();

const registerBody = z.object({
  phone,
  dialCode,
  password,
  fullName: z.string().trim().min(2, 'Tell us your name').max(80),
  languageCode: z.enum(['en', 'so', 'am', 'sw']).optional(),
  currencyCode: z.string().trim().length(3).optional(),
});

authRouter.post('/phone/register', authLimiter, validateBody(registerBody), async (req, res) => {
  const body = req.body as z.infer<typeof registerBody>;
  created(res, await phoneAuth.register(body), 'Account created');
});

const signInBody = z.object({
  phone,
  dialCode,
  // Not the register rule: an older account may have a shorter password, and
  // refusing to even try it would lock people out on a validation message.
  password: z.string().min(1, 'Enter your password').max(72),
});

authRouter.post('/phone/sign-in', authLimiter, validateBody(signInBody), async (req, res) => {
  const body = req.body as z.infer<typeof signInBody>;
  ok(res, await phoneAuth.signIn(body), 'Signed in');
});
