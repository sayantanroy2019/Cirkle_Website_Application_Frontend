# Cirkle — Post-Launch Fix List (Frontend + Backend)

Working list of everything still open after the pre-launch security audit (2026-08-22).
Each item is written to be self-contained: an agent picking one up should not need the
original conversation. Items marked **[SECURITY]** come from the audit and carry its
severity; the rest are correctness/UX/quality debt being tracked in the same place.

Repos:
- Frontend (consumer app): `Cirkle_Website_Application_Frontend` — React + Vite + Zustand + Tailwind, deployed on Vercel
- Backend: `Cirkle_Website_Application_Backend` — Express + Postgres (Supabase), deployed on DigitalOcean, `https://api.cirkle.live`

Related specs already written (in the frontend repo root):
- `cirkle_events_list_cta_spec.md` — backend spec for B1
- `cirkle_ticket_qr_and_checkin_spec.md` — QR payload + venue check-in (Part 1 shipped; Part 2 status unknown, see B4)
- `cirkle_attendees_endpoint_spec.md` — shipped; kept for reference

## Status tracker

| ID | Side | Priority | Item | Status |
|----|------|----------|------|--------|
| F1 | FE | Now | Deploy security-fix batch, verify headers live | pending |
| F2 | FE | Now | Real-browser click-through pass | pending |
| F3 | FE | Now | iOS retest of CTA ghost-paint fix | pending |
| F4 | FE | Now | Real-SMS OTP round trip, one intl number | pending |
| F5 | FE | Next | Verify instant CTA after B1; grey out sold-out cards | blocked on B1 |
| F6 | FE | Next | Load Razorpay SDK only on Checkout | pending |
| F7 | FE | Next | CSP rollout (report-only first) | after F6 |
| F8 | FE | Next | Real phone in Edit Profile | blocked on B5 |
| F9 | FE | Next | Remove ngrok header remnant | pending |
| F10 | FE | Later | Error boundary | pending |
| F11 | FE | Later | Clear 10 pre-existing lint errors | pending |
| F12 | FE | Later | Split EventDetail.jsx | pending |
| F13 | FE | Later | Groups/tribes UI (Phase 2 product work) | parked |
| B1 | BE | Now | CTA fields on GET /events (spec ready) | pending |
| B2 | BE | Now | RATE_LIMITS_DISABLED prod guard + env var docs | pending |
| B3 | BE | Now | Swagger stale /auth/login references | pending |
| B4 | BE | Next | Confirm venue check-in endpoint vs spec | pending |
| B5 | BE | Next | Expose phone on GET /profile/me | pending |
| B6 | BE | Next | Hold release-and-recreate on tier switch | spec not yet written |
| B7 | BE | Next | Onboarding step-gating + gender backfill | pending |
| B8 | BE | Next | APP_BASE_URL → production frontend domain | pending |
| B9 | BE | Next | Prod DB hygiene (purge seeded fixtures) | pending |
| B10 | BE | Later | httpOnly cookie session + CSRF design | decision needed |
| B11 | BE | Later | Re-confirm attendees visibility product call | decision needed |
| B12 | BE | Later | Abuse limits on coupons/uploads | pending |
| B13 | BE | Later | Ops tail: restore test, alerting, rollback drill | pending |

---

# FRONTEND

## F1 — Deploy the security-fix batch and verify headers live · [SECURITY: closes audit P1-2]

**Context.** The security audit fixed four things locally, uncommitted at time of writing:
`vercel.json` (added security headers: `X-Frame-Options: DENY`, `Content-Security-Policy:
frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/mic/geo),
`package-lock.json` (`npm audit fix` → react-router-dom 7.18.2, 0 vulnerabilities),
`src/pages/Profile.jsx` (logout now calls `clearRedirect()` so a stored deep-link
destination can't leak to the next account), and `src/lib/crop.js` (removed
`console.info`/`console.time` diagnostics that logged picked-file metadata).

Until deployed, the production site has **no clickjacking protection** — login/OTP and
checkout pages can be embedded in an attacker's iframe.

**Task.** Commit these four files, push to `main` (that *is* the production deploy — the
project deploys via Vercel's GitHub integration; there is no separate staging), wait for
the deploy, then verify.

**Verify.**
```bash
curl -sI https://cirkle-website-application-frontend.vercel.app/phone | grep -iE "x-frame|content-security|nosniff|referrer|permissions"
```
All five headers must appear, on `/`, `/phone`, and a `/tickets/<uuid>` path (the SPA
rewrite serves every route, but headers are configured per-source and must be confirmed
per-route, not assumed). Also confirm an iframe embed of the site now refuses to render.

## F2 — Real-browser click-through pass (accumulated verification debt)

**Context.** The auth-guard / deep-link / redirect work was verified structurally (the
real modules run under Node against the live API, storage semantics tested case-by-case)
but **never clicked through in a real browser**. These are the exact flows still unproven:

1. Open a WhatsApp ticket link `/tickets/<id>` while **logged out** → should redirect to
   `/phone`, survive the whole OTP flow, and land on **that ticket**, not the Feed.
2. Mid-OTP, reload the tab, then finish → still lands on the ticket. (The destination
   lives in `sessionStorage` under `cirkle-post-login-redirect` — this tests it.)
3. Refresh `/feed` while logged in → stays on Feed, no flash of empty state.
4. Refresh `/feed` while logged out → bounces to `/phone`; after sign-in you land back
   on `/feed` (first-write-wins redirect store).
5. Open `/tickets/00000000-0000-4000-8000-000000000000` (fabricated id) while logged in
   → the friendly "Ticket not found" state, **not** a crash or a spinner.
6. Corrupt the stored token (DevTools → localStorage `cirkle-auth` → mangle it), open
   `/events/<real-id>` → API 401 → redirected to `/phone`; after sign-in you land back
   on that **event page**, not Home. (Tests the central 401 interceptor in
   `src/lib/api.js` — it remembers `window.location` and clears the token.)
7. Sign in normally the next day → lands on Feed/Home, **not** a stale remembered ticket
   (consume-once semantics).

**Task.** Run all seven on a phone + a laptop. File whatever breaks; nothing is expected
to.

## F3 — Retest the CTA ghost-paint fix on the same iPhone

**Context.** On iOS Safari, tapping "Request invite" on an invite-only event produced two
superimposed labels ("Request invite" + "Invite requested") at full brightness — a stale
composite: the DOM had updated (helper text showed the pending state) but the old frame
stayed painted. Root cause: one `<button>` element reused across CTA states with
`transition-all` on `.btn-primary`; iOS failed to invalidate the text layer mid-opacity
transition. Fix shipped: a state-derived `key` on `<EventCta>` in
`src/pages/EventDetail.jsx` forces a remount per CTA state, so there is no in-place
mutation to leave a ghost. Never reproduced on-device since (no iOS device available to
the agent that fixed it).

**Task.** On the same iPhone that showed the bug: invite-only event → tap Request invite
→ the button must flip cleanly to "Invite requested". If a ghost still appears, the next
step (documented in the code comment at the `key`) is removing the transitioned opacity
from disabled CTA states — flat colour, no `transition-all` for them to ride.

## F4 — One real-SMS OTP round trip with an international number

**Context.** International login shipped: country picker (`src/components/
CountrySelect.jsx`), client validation via libphonenumber-js pinned to the same version
the backend validates with (1.13.11), E.164 submission. Client/server verdict parity was
tested across 15 numbers with 0 mismatches — but **no actual SMS was ever sent to a
non-Indian number** (costs money, messages real phones). Delivery depends on Twilio
Verify geo-permissions, which code cannot verify.

**Task.** With a real +1 or +44 number: send → receive code → verify → land. If the send
fails with `provider_error`, check the Twilio console's Verify geo-permission settings
before touching code — the frontend surfaces exactly the typed error codes the backend
returns.

## F5 — After B1 ships: verify instant CTA; grey out sold-out cards · [blocked on B1]

**Context.** Today, tapping an event card shows "Not yet available" on the detail page's
CTA for 1–2 s before flipping to the truth. Cause: the page paints from the cached
feed-list object, and the list payload doesn't carry `ticketCategories` / `eventType` /
`soldOut` / `userHasTicket` / `invitationStatus` — the CTA guesses "no categories" until
the detail fetch lands. B1 (spec: `cirkle_events_list_cta_spec.md`) adds those fields to
`GET /events`. The frontend already derives everything from whatever event object it
holds, and the events store caches list objects whole — so **zero frontend code changes
are expected**; the cached first paint simply becomes truthful.

**Task once B1 is live.**
1. Verify: tap a card → correct button (Book a ticket / Request invite / Sold out / You
   have a ticket) **instantly**, no flash.
2. Optional polish now unblocked: on `src/components/home/EventCard.jsx`, use the new
   `soldOut` field to render sold-out cards with a dimmed state, and the categories to
   show a "From ₹X" on the card. Keep it display-only — the server enforces everything.

## F6 — Load the Razorpay SDK only on Checkout · [SECURITY: audit P2-2]

**Context.** `index.html` loads `https://checkout.razorpay.com/v1/checkout.js` globally,
so third-party JS with full origin privileges runs on **every** page — login, OTP,
profile — when it's needed only at payment. Third-party script on your origin can read
the DOM and storage; minimizing where it runs is standard hardening. (No SRI: Razorpay
serves a dynamically-versioned SDK; pinning integrity would break their deployment model
— deliberate, don't "fix" it.)

**Task.** Remove the script tag from `index.html`. In `src/lib/payment.js`,
`openRazorpayCheckout` already guards on `window.Razorpay` — add a small loader that
injects the script on first use (or on Checkout mount) and resolves when loaded:
```js
let sdkPromise = null
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve()
  sdkPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = resolve
    s.onerror = () => { sdkPromise = null; reject(new Error('Payment is unavailable right now. Please try again.')) }
    document.head.appendChild(s)
  })
  return sdkPromise
}
```
Call it at Checkout mount (so the SDK is warm before the user taps Pay) and await it in
`openRazorpayCheckout`. Reset the memo on error so a failed CDN fetch can retry.

**Verify.** Network tab: `checkout.js` requested on `/checkout/<id>` only, never on
`/phone` or `/feed`. A full payment still completes.

## F7 — Content-Security-Policy rollout · [SECURITY: audit P2-1] · after F6

**Context.** The app now sends `frame-ancestors 'none'` but no full CSP. React +
zero-HTML-sinks means CSP is defense-in-depth here, not the primary control — but it's
the correct backstop against a future XSS. Do this **after F6**, because scoping Razorpay
first simplifies the policy.

**Task.** Add to `vercel.json` as `Content-Security-Policy-Report-Only` first:
```
default-src 'self';
script-src 'self' https://checkout.razorpay.com;
connect-src 'self' https://api.cirkle.live https://*.razorpay.com https://cirkle-user-photos.s3.ap-south-1.amazonaws.com;
img-src 'self' data: https://cirkle-user-photos.s3.ap-south-1.amazonaws.com;
style-src 'self' 'unsafe-inline';
frame-src https://*.razorpay.com;
frame-ancestors 'none';
base-uri 'self'; object-src 'none'
```
Notes for whoever tunes it: QR codes render as `data:` image URIs (hence `img-src data:`);
Tailwind injects a style tag (hence `style-src 'unsafe-inline'` — acceptable; do NOT add
`unsafe-inline` to script-src); Razorpay opens frames and calls its own APIs at runtime —
run a real test payment while watching the console for violations before flipping from
Report-Only to enforced. S3 host must match the actual bucket host in presigned URLs.

**Verify.** One full session (login → browse → buy → ticket QR) with zero violation
reports, then enforce.

## F8 — Real phone number in Edit Profile · [blocked on B5]

**Context.** `src/pages/EditProfile.jsx` shows a hardcoded `MOCK_PHONE = '+91 98765
43210'` in the locked "Phone number" row, because no consumer endpoint returns the user's
phone. Cosmetic, but it shows every user a fake number as their own.

**Task once B5 ships.** Replace `MOCK_PHONE` with `profile.phone` from `GET /profile/me`
(format with `formatPhoneForDisplay` from `src/lib/phone.js` — handles international).
Keep the row locked/read-only: phone is the login credential, changing it is a future
re-verification flow, not an edit field.

## F9 — Remove the ngrok header remnant · [SECURITY: audit P3-3]

**Context.** `src/lib/api.js` sends `'ngrok-skip-browser-warning': 'true'` on every API
request — a leftover from when the dev backend ran behind an ngrok tunnel. Production
talks to `api.cirkle.live`; the header is dead weight in every request and a small
infrastructure disclosure. `vite.config.js` carries the same header for the dev proxy.

**Task.** Remove the header from the axios instance in `api.js`. Leave the dev-proxy
config alone only if local dev still uses ngrok; if local dev now targets a local
backend or the droplet, delete it there too.

**Verify.** Network tab on production: no `ngrok-skip-browser-warning` request header;
app works unchanged.

## F10 — Error boundary · [audit P3]

**Context.** No React error boundary exists. A render crash unmounts to a white screen.
Production builds leak no stack traces (verified), so this is UX robustness, not
security.

**Task.** One top-level boundary (class component with `componentDidCatch` or
`react-error-boundary`) rendering a branded "Something went wrong — reload" screen. Do
not render error details beyond a generic message; log nothing sensitive.

## F11 — Clear the 10 pre-existing lint errors

**Context.** `npx eslint src/` reports a stable set of 10 errors that predate recent
work; each was consciously stepped around rather than fixed in passing:
`react-hooks/set-state-in-effect` in VibesTab (194), EditProfile (85), EventDetail
(~553), MyTickets (68); `react-hooks/refs` in PhotoGrid (25); `preserve-caught-error` ×2
in `lib/uploads.js`; `no-unused-vars` — `formatPrice` in Checkout (7), `slots` and
`firstEmpty` in EditProfile (212–213).

**Task.** Fix them properly, not with disable-comments. The `set-state-in-effect` ones
follow the pattern already used elsewhere in the codebase: wrap the async work in a
`void (async () => { ... })()` inside the effect so setState lands after an await (see
`EventAttendees.jsx` / `TicketDetail.jsx` for the established shape). Unused vars: just
delete. `preserve-caught-error`: re-throw with `{ cause }` or use the caught error.

**Verify.** `npx eslint src/` → 0 errors; build passes; the touched screens still work
(DobStep/EditProfile save, Vibes swipe, My Tickets list, photo grid upload).

## F12 — Split EventDetail.jsx

**Context.** `src/pages/EventDetail.jsx` is ~700 lines holding 10+ components (header,
hero, CTA, info block, about, lineup, gallery, venue, Who's-Going, attendee summary,
plus the page). It has absorbed feature after feature and is the file most likely to eat
a merge conflict or a regression.

**Task.** Mechanical extraction only — no behaviour change: move each section component
to `src/components/event/` keeping props identical. Keep `EventCta`'s state-derived
`key` and its comment (it prevents an iOS stale-paint bug — see F3); keep the
`entryPrice` helper with the info block. Verify with a click-through of one open event,
one invite-only event, one sold-out event.

## F13 — Groups / tribes UI · parked product work

Phase 2. Mock/commented code for "Find Your Tribe" sits in EventDetail (deliberately
disabled). Do not resurrect until the groups backend exists. Listed here only so it
isn't mistaken for dead code and deleted.

---

# BACKEND

## B1 — CTA fields on `GET /events` · spec ready

**Full spec: `cirkle_events_list_cta_spec.md` in the frontend repo root.** Summary: add
`eventType`, `soldOut`, `userHasTicket`, `invitationStatus`, and `ticketCategories`
(same `ConsumerTicketCategory` shape as the detail endpoint, same serializers, batched
queries — no N+1) to each event in the consumer list. Fixes the frontend's 1–2 s wrong
"Not yet available" CTA flash (see F5). The response becomes per-user — it's already
authenticated and uncached; note that in Swagger so nobody adds a shared cache later.

## B2 — `RATE_LIMITS_DISABLED` production guard + env documentation · [SECURITY]

**Context.** `src/middlewares/rateLimits.js` honours `RATE_LIMITS_DISABLED=1` — a kill
switch that disables **every** limiter (staff logins, OTP send/verify, order creation,
uploads, global). It exists for the test suite (set in `vitest.config.js`) and is
legitimate there — but it is undocumented, and nothing stops it being set in production,
where it would silently switch off all abuse controls.

Separately, 10 env vars are read in `src/` but absent from `.env.example`:
`ENABLE_API_DOCS`, `NOTIFICATION_RETRIES`, `NOTIFICATION_TIMEOUT_MS`, `OTP_CHANNEL`,
`RATE_LIMITS_DISABLED`, `WATI_API_ENDPOINT`, `WATI_API_TOKEN`, `WATI_CHANNEL_NUMBER`,
`WATI_DEBUG_CAPTURE`, `WATI_WEBHOOK_SECRET`.

**Task.**
1. In `validateEnvAtStartup()` (already the boot gate): if `NODE_ENV === 'production'`
   and `RATE_LIMITS_DISABLED === '1'`, **refuse to start** with a named error — same
   pattern as missing-variable handling. A silent unset is not enough; a prod deploy
   with the flag set should fail loudly, not run unprotected.
2. Document all 10 vars in `.env.example` with one-line explanations.
3. The `WATI_*` set implies a second WhatsApp provider receiving phone numbers — add it
   to the personal-data-flow documentation alongside Twilio/SendGrid.

**Verify.** `NODE_ENV=production RATE_LIMITS_DISABLED=1 node src/server.js` exits
non-zero with a message naming the flag; test suite still runs with limiters off.

## B3 — Swagger stale `/auth/login` references

**Context.** The phone-as-password login was removed (404s live), but Swagger still says:
line ~12, *"All endpoints except GET /cities, GET /lifestyle-tags, and POST /auth/login
require a Bearer token"* — wrong endpoint list AND wrong paths (real ones are
`/reference/cities`, `/reference/lifestyle-tags`, plus `/reference/event-categories` and
`/webhooks/razorpay` are also unauthenticated); and line ~3800, the `bearerAuth`
description says tokens come from `POST /auth/login` — an endpoint that no longer
exists. An integrator following the docs would dead-end.

**Task.** Point both at `POST /auth/otp/send` / `POST /auth/otp/verify` and correct the
unauthenticated list. Grep for any other `/auth/login` mention while in there.

## B4 — Confirm the venue check-in endpoint against the spec

**Context.** `cirkle_ticket_qr_and_checkin_spec.md` Part 1 (server-owned `qrPayload`,
opaque token) is live. Part 2 specified `POST /organizer/events/{id}/check-in` (+
`DELETE` for undo) with: lookup by token/bookingRef with the DB as truth, event-match
check, `SELECT … FOR UPDATE` so two turnstiles can't double-admit, typed error codes
(`already_checked_in`, `ticket_mismatch`, `wrong_event`, `invalid_qr`), `admitsCount` in
the response (a Couple Pass is ONE QR admitting two people — the door needs that
number), and attendee `firstName`/`age`/`photoUrl` (never phone/email/lastName) so
staff can ID-check. At least one ticket in the DB now has `checked_in_at` set, so
*something* writes it — but whether the full endpoint with locking, mismatch checks and
undo exists is unverified.

**Task.** Audit whatever exists against the spec's verification checklist (it's in the
spec file), especially: concurrent double-scan → exactly one admit; forged payload with
a real bookingRef but wrong user → `ticket_mismatch`; ticket for event A at event B's
door → `wrong_event`; `admitsCount` not hardcoded to 1. Build what's missing.

## B5 — Expose `phone` on `GET /profile/me`

**Context.** No consumer endpoint returns the user's own phone number, so the frontend
shows a hardcoded fake in Edit Profile (F8). The phone lives on `users`, not `profiles`.

**Task.** Add `phone` (E.164, as stored) to the `GET /profile/me` response. Own-profile
only — this must NOT leak into attendee cards, vibes cards, or organizer views, which
deliberately exclude contact info (`fetchPublicAttendeeProfiles` keeps its guarantee).
Update Swagger.

## B6 — Hold release-and-recreate on ticket-tier switch · spec to be written

**Context.** Order creation holds one seat per `(user, event)` for 10 minutes
(`hold_duration_minutes` in `app_settings`). If a user starts paying for Single Pass,
abandons Razorpay, then picks Group of 4, the server silently returns the **Single Pass
hold** (`resumed: true`) — the frontend now detects the mismatch and shows a countdown
("forced wait", the District model), but the better behaviour is: void the old hold,
create a new one at the newly chosen tier, inside the same transaction/locking that
order creation already uses. Revenue-positive (switches skew toward upgrades). Guard
against hold-churn squatting by capping replacements per user per event per window
rather than blocking the switch.

**Task.** Request the full spec before building (it needs the exact endpoint semantics
decided: replace-on-create vs explicit cancel endpoint), or write it from this summary
and the existing `orders.js` critical-section comments. Frontend has a
`conflictingHold` UI (`src/pages/Checkout.jsx`) that becomes mostly obsolete once this
lands — coordinate removal.

## B7 — Onboarding step-gating + gender backfill

**Context.** Every onboarding step endpoint advances `current_onboarding_step` with
`GREATEST(step, N)` and none checks that prior steps were completed — so a client (or
script) calling steps out of order can produce a "complete" profile with null columns.
This happened: two seeded test users reached step 5 with `gender` null, which also
degrades the Vibes feed's five-tier ordering (null gender collapses to the "remaining"
tier). The write path itself is correct — the flaw is that skipping is silently allowed
and unrecoverable through the UI (the resume logic sends the user *past* the missing
step).

**Task.** Either (a) each step verifies the previous steps' columns are non-null before
advancing, or (b) drop the stored counter and derive the resume point from which profile
columns are actually filled — (b) is self-healing for anyone already in a bad state and
is the recommended shape. Backfill or delete the two test users with null gender
(`+919000000001`, `+919000000002`). Also make each step's `UPDATE profiles` check
`rowCount` — today a missing profiles row would return `{success:true}` having written
nothing.

## B8 — `APP_BASE_URL` → production frontend domain

**Context.** WhatsApp ticket messages carry a deep link built from `APP_BASE_URL`
(`{APP_BASE_URL}/tickets/{ticketId}`). The frontend route exists and works. At last
check the env var still pointed at localhost. Every WhatsApp ticket message sent with
it wrong dead-ends the customer.

**Task.** Set `APP_BASE_URL` to the production frontend origin (the Vercel URL, or
`cirkle.live` if the custom domain fronts the consumer app — confirm which). Send one
real ticket message and tap the link on a phone.

## B9 — Production data hygiene

**Context.** The development database accumulated test fixtures during this build:
events named `[test artifact - safe to ignore] N`, tickets with `order_seed_*` Razorpay
order ids marked `paid` without real payments, seeded attendees, seeded ticket
categories, test users (`Testuser Alpha/Beta`, `+919999999999`, etc.).

**Task.** Confirm production runs on a **separate, clean** database. If prod shares this
DB, purge before launch: `[test artifact]` events (cascade to their categories/tickets),
`order_seed_*` orders and their tickets, the seeded test users. Write the purge as a
reviewed SQL script, not ad-hoc deletes — several tables have FK/no-cascade choices
(`tickets.order_id` has no cascade by design).

## B10 — httpOnly cookie session + CSRF design · [SECURITY: audit P1, architectural]

**Context.** The consumer JWT (7-day expiry) lives in localStorage and is attached via
an axios interceptor. The audit found zero XSS vectors today (no HTML sinks, React
escaping, strict URL builders), so this is not currently exploitable — but any future
XSS means silent 7-day account takeover with no revocation. The durable fix is a
server-set `httpOnly` `Secure` `SameSite` cookie session, which JS cannot read.

**Task (a decision first, then work).** Decide deliberately whether to stay on
localStorage (documented accepted risk; cheap; fine while the XSS surface stays nil) or
move to cookie sessions. Moving requires: backend sets/clears the cookie at OTP verify
and logout, CORS `credentials: true` with an exact-origin allowlist (no `*`), CSRF
protection on every state-changing route (SameSite=Lax + Origin-header check is the
modern minimum), and the frontend interceptor stops attaching Authorization. Do NOT
half-migrate — a hybrid with both mechanisms live is worse than either.

## B11 — Re-confirm the attendees-visibility product decision

**Context.** `GET /events/{id}/attendees` is readable by **any logged-in user**, ticket
or not — a deliberate social-proof product call made during the build. It exposes each
attendee's first name, age, gender, tagline, photos and lifestyle tags to anyone who
browses the event. The endpoint's field discipline is enforced at the SQL level
(`fetchPublicAttendeeProfiles` — never phone/email/lastName/socials/DOB).

**Task.** Not code — a launch-eve product sign-off: is browse-without-ticket exposure
still wanted? If it changes, the endpoint gate is one condition (ticket-holders only),
and the frontend already handles an empty/absent list gracefully.

## B12 — Abuse limits on `coupons/validate` and upload-URL issuance

**Context.** Rate limiting exists on staff logins, OTP, order creation, uploads (an
`uploadLimiter` is mounted on `/uploads`), and globally. Left to confirm from the audit:
`POST /coupons/validate` (coupon brute-forcing — codes are guessable strings; the
backend already avoids leaking uses-remaining, but unlimited guessing enumerates valid
codes) and whether the upload limiter's budget is tight enough to stop storage-filling
via presigned-URL churn (each call mints a writable S3 URL).

**Task.** Add/confirm a per-user limiter on coupon validation; review upload-URL
issuance volume against realistic use (a user re-cropping photos legitimately needs a
handful per session, not hundreds per minute). Log 429s with the same structured shape
as the existing limiters.

## B13 — Ops tail from the production-readiness guide

Unfinished non-code items from the readiness doc, listed so they don't evaporate:
- **Backup restore actually tested** — a backup that has never been restored is a hope,
  not a backup. Run one restore into a scratch database and time it.
- **Alerts reach a watched channel** — API error rate, payment/webhook failure spikes,
  droplet health → somewhere someone actually looks (email/Slack/WhatsApp).
- **One rollback drill** — redeploy the previous known-good backend release once, on
  purpose, and write down the steps that were annoying.

---

*Cross-dependencies: F5←B1 · F8←B5 · F7 after F6. Everything else is independent —
frontend and backend tracks can run in parallel.*
