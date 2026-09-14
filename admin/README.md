# East-Market — Admin

React + TypeScript + Vite + Tailwind + Recharts. Staff dashboard for
moderation, users, reports and verification.

```bash
npm install
cp .env.example .env      # Supabase URL + anon key
npm run dev               # http://localhost:5175
```

Run the backend on :4000 alongside it; `/api` is proxied there.

## You need the service-role key

Reads work with a staff account alone. **Every write — approving a listing,
suspending a user, deciding a verification — needs `SUPABASE_SERVICE_ROLE_KEY`
set in `backend/.env`.**

That is not an oversight, it is the schema's design. Migration `0014` revokes
UPDATE on every moderation column (`products.rejection_reason`,
`profiles.role`, `profiles.is_banned`, report verdicts, verification outcomes,
the audit log) from the `authenticated` role outright. Postgres grants column
privileges per role, not per row, so they cannot be given to admins without
giving them to every signed-in user.

The consequence is deliberate and worth the friction: **a stolen admin JWT
cannot approve listings, promote accounts or rewrite the audit trail**, because
those columns are unreachable from any client token. Only the backend, holding
the secret key, can touch them.

Without the key the dashboard still loads and every list still renders; only
moderation actions fail, with a 503 that says exactly what to add and where.

## Architecture

**Reads** run as the signed-in moderator, so RLS decides what they see.
**Writes** go through the service-role client, with `requireAdmin` on every
route and `requireSuperAdmin` on role changes. Authorisation for writes is
therefore the API's job, which is why those two middlewares matter.

Sign-in checks the account's role after authenticating and signs straight back
out if it is not `admin` or `moderator` — otherwise a seller could sign in and
sit on a dashboard where everything 403s.

## Screens

| | |
|---|---|
| **Dashboard** | Counts, 30-day listings line, listings by country, top categories, most viewed |
| **Listings** | Moderation queue. Approve, or reject/suspend with a required reason the seller is notified of |
| **Users** | Search and filter by role, suspend and unsuspend with a reason |
| **Reports** | Open queue, action or dismiss with a note |
| **Verification** | Pending applications, verify or reject — the DB trigger propagates the badge |
| **Audit log** | Append-only record of every action. Staff cannot edit or delete entries |

Pending counts appear as badges in the sidebar: a queue nobody can see the size
of does not get cleared.

## Not built yet

Categories and locations have API endpoints (`POST /admin/categories`,
`POST /admin/locations/:level`) but no screens. Advertisements, subscriptions
and payments are not built at all — there is nothing to administer until the
payment providers are wired up.
