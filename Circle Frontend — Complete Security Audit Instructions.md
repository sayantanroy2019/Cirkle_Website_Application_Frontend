# Circle Frontend — Complete Security Audit

Perform a **deep security audit of the entire frontend codebase** before production deployment.

Do not only search for obvious vulnerabilities. Trace how authentication, user input, API responses, browser storage, URLs, third-party libraries, payment flows, cookies, files, routing, caching and browser APIs are actually being used.

The objective is:

> Find every realistic way an attacker could steal credentials or user data, execute malicious JavaScript, impersonate another user, manipulate application behavior, expose secrets, abuse browser storage, compromise sessions, misuse APIs, manipulate payments, or exploit client-side trust.

---

# OUTPUT REQUIRED FOR EVERY FINDING

For every vulnerability or questionable implementation, report:

```text
Severity: P0 / P1 / P2 / P3

Category:
File:
Line/function/component:
Current implementation:
Why it is dangerous:
Realistic attack scenario:
Potential impact:
Exact recommended fix:
Whether frontend-only fix is sufficient:
Backend change required? YES / NO
Regression tests required:
```

Do **not** silently modify a security-sensitive architecture without explaining the change.

---

# SEVERITY

## 🔴 P0 — Critical

Potential for:

- account takeover
- secret/key exposure
- authentication bypass
- payment manipulation
- arbitrary JavaScript execution
- sensitive user-data theft
- privilege escalation
- session theft
- production credentials exposed in browser bundle

Must be fixed before production.

## 🟠 P1 — High

Potential for:

- meaningful XSS
- CSRF
- token leakage
- insecure redirects
- PII leakage
- insecure third-party code
- sensitive caching
- significant authorization assumptions
- exploitable dependency vulnerability

Should be fixed before production.

## 🟡 P2 — Medium

Defense-in-depth problems, weaker browser protections, information disclosure, unsafe coding patterns, etc.

## 🟢 P3 — Low

Security hygiene or hardening improvements.

---

# 1. SECRET EXPOSURE — P0

Search the **entire frontend repository** for:

```text
API_KEY
SECRET
PASSWORD
TOKEN
PRIVATE_KEY
CLIENT_SECRET
DATABASE_URL
SUPABASE_SERVICE_ROLE
AWS_SECRET
RAZORPAY_SECRET
STRIPE_SECRET
JWT_SECRET
AUTH_SECRET
TWILIO_AUTH_TOKEN
OPENAI_API_KEY
```

Also inspect:

- `.env`
- `.env.local`
- `.env.production`
- config files
- constants
- test files
- comments
- scripts
- mock files
- GitHub configuration
- CI files
- build scripts

Check framework-specific public environment variables:

```text
NEXT_PUBLIC_*
VITE_*
REACT_APP_*
```

Assume anything included in frontend JavaScript is **public**.

Verify that absolutely none of these appear in the browser:

- database password
- JWT signing secret
- service-role key
- Razorpay secret
- Stripe secret
- AWS secret
- OAuth client secret
- private API key
- backend encryption key
- private certificate

Public/publishable keys must be verified as genuinely intended for browser exposure.

---

# 2. INSPECT THE ACTUAL PRODUCTION BUNDLE

Do not only inspect source files.

Build the production application.

Then inspect generated JavaScript bundles for:

```text
secret
password
apikey
token
database
localhost
127.0.0.1
staging
development
internal URLs
private endpoints
```

Verify that production bundles do not contain:

- credentials
- development API URLs
- staging credentials
- private infrastructure names
- debugging information
- test accounts
- internal admin endpoints unnecessarily
- sensitive environment variables

---

# 3. SOURCE MAP EXPOSURE

Check how production source maps are configured.

Determine whether public users can obtain source maps containing:

- original source files
- internal comments
- source paths
- internal endpoint names
- architectural details
- debugging information

If source maps are needed for monitoring systems, make sure deployment configuration follows an intentional strategy rather than exposing them accidentally.

---

# 4. AUTHENTICATION TOKEN STORAGE — P0/P1

Audit exactly where authentication credentials live.

Search:

```text
localStorage
sessionStorage
indexedDB
document.cookie
Cookies
Authorization
Bearer
accessToken
refreshToken
jwt
session
```

Identify where the application stores:

- access tokens
- refresh tokens
- JWTs
- session identifiers
- OTP state
- authentication information

Sensitive authentication credentials should not casually be kept in browser-accessible storage.

Audit whether an XSS vulnerability could steal them.

If cookies are used, verify appropriate:

```text
HttpOnly
Secure
SameSite
```

Note:

**HttpOnly can only be configured by the server.**

If the frontend currently relies on localStorage for important authentication credentials, explicitly flag the architectural risk.

---

# 5. LOGOUT SECURITY

Test:

```text
User logs in
↓
Uses application
↓
Logs out
```

Then verify:

- frontend authentication state disappears
- cached user data disappears appropriately
- localStorage/sessionStorage state is cleared appropriately
- sensitive in-memory state disappears
- browser back button does not reveal protected sensitive data
- another account logging into the same browser does not see previous user's data

Test:

```text
User A logout
↓
User B login
↓
Check for User A information
```

---

# 6. XSS — CRITICAL AUDIT

Search for every place user-controlled or API-controlled content is rendered.

Pay special attention to:

```javascript
dangerouslySetInnerHTML
innerHTML
outerHTML
insertAdjacentHTML
document.write
eval
new Function
setTimeout(string)
setInterval(string)
```

Also search for:

```text
unsafeHTML
HTML parsers
Markdown renderers
rich-text renderers
template engines
```

Every occurrence must be justified.

---

# 7. STORED XSS

Attack all user-generated fields.

Examples:

```text
name
username
bio
event name
event description
tribe name
tribe description
chat messages
comments
search
profile information
organizer descriptions
venue descriptions
uploaded filenames
URLs
```

Try payloads conceptually equivalent to:

```html
<script>...</script>
<img onerror="...">
<svg onload="...">
```

Do not simply test `<script>` and conclude the field is safe.

Verify that malicious input is rendered as **data**, not executable markup.

---

# 8. DOM-BASED XSS

Audit data derived from:

```javascript
window.location
location.search
location.hash
document.URL
document.referrer
window.name
postMessage
localStorage
sessionStorage
```

Trace whether it reaches dangerous DOM sinks.

Example:

```text
URL parameter
    ↓
JavaScript
    ↓
innerHTML
```

This must not happen unsafely.

---

# 9. RICH HTML / MARKDOWN

If users can submit Markdown, rich text, HTML or formatted content:

Audit:

```text
Markdown → HTML
HTML → React
Rich text → DOM
```

Verify sanitization.

Test:

- script tags
- image event handlers
- SVG
- embedded objects
- iframes
- malicious links
- `javascript:` URLs
- malformed HTML
- encoded payloads

If sanitization libraries are used, verify configuration and version.

---

# 10. URL INJECTION

Audit every dynamic:

```text
href
src
iframe src
window.location
window.open
router.push
router.replace
redirect
```

Do not assume a string is safe because it "looks like a URL."

Test dangerous schemes:

```text
javascript:
data:
blob:
file:
```

where relevant.

Prefer explicit allowlists for protocols/domains when URLs come from users or APIs.

---

# 11. OPEN REDIRECTS

Search for patterns similar to:

```text
?redirect=
?returnUrl=
?next=
?callback=
?continue=
```

Test:

```text
https://circle/.../?redirect=https://attacker.com
```

The application should not allow arbitrary attacker-controlled external redirects unless explicitly intended.

Prefer internal-path allowlists or exact trusted-domain allowlists.

---

# 12. TABNABBING

Audit links opening new windows:

```html
target="_blank"
```

Check appropriate protections such as:

```text
noopener
noreferrer
```

where needed.

Audit `window.open()` usage as well.

---

# 13. CONTENT SECURITY POLICY

Check the production application's CSP.

Audit:

```text
default-src
script-src
style-src
img-src
connect-src
font-src
frame-src
frame-ancestors
object-src
base-uri
form-action
```

Look for overly permissive policies such as:

```text
*
unsafe-eval
```

and unnecessary:

```text
unsafe-inline
```

The objective is to restrict scripts/resources to trusted origins.

CSP should be **defense in depth**, not the primary XSS defense.

---

# 14. INLINE SCRIPT AUDIT

Search for:

```html
<script>
onclick=
onerror=
onload=
```

and dynamically generated inline JavaScript.

Determine whether these unnecessarily weaken CSP.

---

# 15. CLICKJACKING

Verify the application cannot be embedded inside an attacker-controlled iframe unless that behavior is intentionally required.

Check:

```text
Content-Security-Policy: frame-ancestors
```

and/or appropriate framing protection.

Test embedding the production site in another page.

Pay special attention to:

- Login
- Buy Ticket
- Payments
- Profile
- Account settings
- destructive actions

---

# 16. HTTP SECURITY HEADERS

Audit actual production responses for:

```text
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
frame-ancestors / X-Frame-Options
```

Do not merely check configuration files.

Verify headers in the actual Vercel production response.

---

# 17. HTTPS

Verify:

- no production HTTP resources
- no mixed content
- no HTTP API URLs
- no HTTP images/scripts
- no insecure WebSockets

Search for:

```text
http://
ws://
```

Every production occurrence must be justified.

Use:

```text
https://
wss://
```

for sensitive production communications.

---

# 18. CSRF

Determine the authentication architecture first.

If authentication uses cookies/session cookies, audit CSRF protection for every state-changing operation:

```text
POST
PUT
PATCH
DELETE
```

Examples:

- change profile
- change password
- join tribe
- leave tribe
- purchase action
- send invitation
- cancel
- delete
- account settings

Check whether the application uses appropriate:

- SameSite cookies
- CSRF tokens
- Origin validation
- framework protections

Frontend and backend must cooperate here.

**Do not implement a frontend-only fake CSRF solution.**

---

# 19. CLIENT-SIDE AUTHORIZATION — CRITICAL ARCHITECTURAL CHECK

Search for code similar to:

```javascript
if (user.role === "admin") {
    showAdminButton();
}
```

This is fine for UI behavior.

It is **not authorization**.

Audit every place where frontend code assumes:

```text
hidden button = protected action
hidden route = secure route
disabled button = action cannot happen
```

For every sensitive operation verify that the backend performs the actual authorization.

Flag cases where security relies on frontend controls.

---

# 20. FRONTEND ROUTE GUARDS

Audit:

```text
ProtectedRoute
middleware
route guards
role checks
auth redirects
```

Verify these are used for UX, not treated as the security boundary.

Users can manually call APIs without using the frontend.

---

# 21. ID MANIPULATION / IDOR INDICATORS

Inspect frontend API requests containing:

```text
userId
eventId
organizerId
ticketId
paymentId
orderId
tribeId
messageId
```

Ask:

> What happens if a user modifies this identifier manually?

The frontend agent cannot prove backend authorization solely from frontend code.

Therefore:

- identify every sensitive identifier-based API call
- list it
- verify whether backend authorization needs confirmation
- mark anything unclear for backend audit

---

# 22. PAYMENT SECURITY — P0

Audit the entire frontend payment flow.

The frontend must never be considered authoritative for:

```text
ticket price
discount
quantity
tax
fees
payment success
ticket issuance
```

Search for any code where frontend-calculated values are blindly sent and trusted.

Verify that:

- server determines authoritative price
- frontend cannot manipulate final payment value
- frontend "success callback" alone does not grant paid access
- server verifies payment
- payment verification happens before ticket issuance
- secret payment keys do not exist client-side

The frontend may contain a public/publishable payment key where the provider intends that.

---

# 23. DUPLICATE PAYMENT / DOUBLE TAP

Audit purchase buttons.

Test:

```text
Tap Buy
Tap Buy again quickly
Tap 10 times
Slow network
Back
Forward
Refresh
```

Frontend should provide:

- loading state
- disabled duplicate submission
- clear transaction state

But also explicitly verify that the backend provides idempotency.

Frontend button disabling is not sufficient payment protection.

---

# 24. API CLIENT SECURITY

Audit the centralized API client.

Check:

- how authentication headers are attached
- whether credentials leak to wrong domains
- how base URLs are selected
- development vs production URLs
- retries
- interceptors
- error handling
- token refresh
- redirects

A token must never accidentally be attached to arbitrary third-party requests.

---

# 25. ERROR MESSAGE INFORMATION LEAKAGE

Audit user-visible errors.

Check whether the UI displays:

- stack traces
- SQL errors
- internal service names
- file paths
- environment variable names
- API keys
- raw server exceptions
- infrastructure information
- internal IDs unnecessarily

Production users should receive useful but sanitized messages.

---

# 26. CONSOLE LOGGING

Search:

```javascript
console.log
console.error
console.debug
console.info
console.table
```

Check for:

- tokens
- authentication state
- user objects
- phone numbers
- emails
- payment objects
- API responses
- secrets
- request headers
- cookies
- PII

Remove unnecessary production debugging logs.

---

# 27. PII EXPOSURE

Map all user data displayed or processed by the frontend:

```text
name
email
phone
DOB
profile data
location
ticket information
payment metadata
chat data
social graph
```

For each one determine:

```text
API → Browser memory → UI → Storage → Analytics → Logs
```

Check whether more information is received from the backend than the page actually needs.

Flag excessive API responses for backend correction.

---

# 28. ANALYTICS / ERROR MONITORING LEAKS

Audit:

```text
Google Analytics
Meta Pixel
Sentry
LogRocket
Mixpanel
PostHog
Hotjar
other telemetry
```

Determine exactly what data each receives.

Check for accidental transmission of:

- phone numbers
- emails
- auth tokens
- payment details
- chat contents
- private profile data
- URLs containing secrets
- API payloads

Redact sensitive information.

---

# 29. THIRD-PARTY JAVASCRIPT

List every external script loaded by the application.

Examples:

```text
analytics
payment SDK
maps
chat
support widgets
advertising
social embeds
CDN scripts
```

For each determine:

```text
Why is this loaded?
Which pages?
What browser access does it receive?
Is it necessary?
Is the source trusted?
Can it access sensitive DOM/storage?
```

Remember:

> Third-party JavaScript running on your page effectively receives substantial privileges within your origin.

Remove unnecessary scripts.

---

# 30. SUBRESOURCE INTEGRITY

For appropriate third-party static resources loaded from external CDNs, investigate use of:

```html
integrity=
crossorigin=
```

where feasible.

Do not blindly add SRI to dynamically versioned third-party SDKs without understanding their deployment model.

---

# 31. NPM / SUPPLY-CHAIN SECURITY

Audit:

```bash
npm audit
```

and inspect:

- critical vulnerabilities
- high vulnerabilities
- deprecated packages
- abandoned dependencies
- suspicious packages
- unnecessary packages
- duplicate packages
- packages with large dependency trees

Do not automatically run:

```bash
npm audit fix --force
```

without examining breaking changes.

---

# 32. PACKAGE LOCKFILE

Verify:

- lockfile exists
- lockfile committed
- production build uses deterministic dependency installation
- unexpected dependency changes are reviewed

Examples:

```text
package-lock.json
pnpm-lock.yaml
yarn.lock
```

---

# 33. DEPENDENCY MINIMIZATION

Ask for every dependency:

> Why is this package required?

Remove dependencies used for trivial functionality where doing so materially reduces unnecessary supply-chain risk.

Pay extra attention to packages with:

- installation scripts
- little maintenance
- very low reputation
- recent ownership changes
- typo-like names

---

# 34. FILE UPLOADS

If frontend supports:

- profile pictures
- event images
- files
- documents

audit frontend validation:

```text
size
extension
MIME type
preview handling
filename
```

But clearly note:

> Frontend validation is UX only.

Backend must independently validate every file.

Also test malicious SVG/HTML files and unsafe previews.

---

# 35. SVG SECURITY

Audit user-controlled SVGs carefully.

SVG can contain active content depending on how it is handled.

Do not blindly render untrusted SVG markup into the DOM.

---

# 36. IMAGE / MEDIA URL SECURITY

Audit dynamically supplied:

```text
img src
video src
audio src
background-image
```

Ensure attacker-controlled resource URLs cannot create unexpected script/resource behavior or leak sensitive information.

---

# 37. `postMessage` SECURITY

Search:

```javascript
postMessage
addEventListener("message"
onmessage
```

For every message handler verify exact origin checking.

Dangerous:

```javascript
if (event.origin.includes("circle.com"))
```

Prefer exact trusted-origin comparison.

Never process arbitrary messages from `*` without a carefully justified design.

---

# 38. IFRAME SECURITY

Audit every iframe.

Check:

- source
- trusted domain
- sandbox attributes
- allow attributes
- payment iframe usage
- communication through `postMessage`

Do not embed arbitrary user-controlled URLs.

---

# 39. WEBSOCKETS

If chat or real-time features use WebSockets:

Audit:

```text
ws:// vs wss://
token handling
reconnection
message validation assumptions
URL parameters
logging
```

Never put long-lived secrets in a WebSocket URL unnecessarily because URLs can leak through logging.

Backend authentication/authorization must still be enforced.

---

# 40. SERVICE WORKERS / PWA

If the app uses a service worker:

Audit:

- registration scope
- scripts
- update behavior
- cached responses
- sensitive-data caching
- offline behavior

Never unintentionally cache:

- authenticated API responses
- tickets containing sensitive data
- account pages
- private user information
- payment data

Have a strategy to invalidate compromised/outdated service workers.

---

# 41. BROWSER CACHE SECURITY

Inspect cache behavior for authenticated/private pages.

Sensitive responses should not remain in shared caches.

Check:

```text
Cache-Control
Vercel caching
CDN behavior
browser caching
service worker caching
```

Be particularly careful with:

```text
profile
tickets
payments
account information
private chats
```

---

# 42. LOCALSTORAGE TRUST

Anything read from:

```text
localStorage
sessionStorage
IndexedDB
```

must be treated as **untrusted attacker-controlled input**.

Do not assume:

```javascript
localStorage.role === "admin"
```

means the user is an admin.

Likewise do not trust locally stored:

- price
- permissions
- role
- user ID
- payment status
- ticket validity

---

# 43. CLIENT-SIDE CRYPTO

Search for custom:

```text
encryption
hashing
crypto
signatures
token generation
random IDs
```

Do not invent cryptographic schemes in frontend code.

Anything whose secret key must remain secret cannot safely rely on a key delivered to the browser.

---

# 44. RANDOMNESS

Search:

```javascript
Math.random()
```

Determine whether it is being used for anything security-sensitive.

Do not use non-cryptographic randomness for:

- tokens
- reset codes
- security challenges
- sensitive identifiers

---

# 45. HARDCODED ROLE / SECURITY LOGIC

Search:

```text
admin
organizer
moderator
superuser
role
permission
isAdmin
```

Identify whether permission checks exist only in the client.

Frontend roles can control rendering.

They cannot enforce access control.

---

# 46. DEVELOPMENT / TEST CODE

Search for:

```text
debug
test
mock
fake
bypass
dev
staging
localhost
seed
backdoor
```

Remove or disable production-inappropriate functionality.

Examples:

```text
skip login
fake payment success
test admin account
hardcoded OTP
development auth bypass
```

Any authentication/payment bypass is P0.

---

# 47. FEATURE FLAGS

Audit frontend feature flags.

Ask whether a user can enable hidden functionality by changing:

```text
localStorage
query parameters
DevTools state
JavaScript variables
```

Security must never depend on a frontend feature flag.

---

# 48. DEVTOOLS TAMPERING ASSUMPTION

Assume the attacker can:

- modify JavaScript variables
- modify React state
- change localStorage
- change cookies accessible to JS
- call functions manually
- alter network requests
- replay requests
- change request bodies
- invoke hidden routes
- modify frontend code locally

Review the application from this assumption.

Anything still needing protection must be enforced server-side.

---

# 49. REFERRER LEAKAGE

Check URLs for:

```text
tokens
OTP
email
phone
session IDs
payment information
password reset token
```

Sensitive data in URLs may leak into:

- browser history
- analytics
- logs
- referrer headers
- screenshots

Review `Referrer-Policy`.

---

# 50. QUERY STRING SECURITY

Audit:

```javascript
URLSearchParams
router.query
searchParams
location.search
```

Never trust query parameters.

Check whether they influence:

- redirects
- API endpoints
- permissions
- payment information
- role
- HTML
- scripts
- file paths

---

# 51. HASH / FRAGMENT SECURITY

Audit:

```javascript
location.hash
```

especially if its contents are rendered or used to construct API requests.

Check for DOM XSS and client-side CSRF patterns.

---

# 52. BROWSER HISTORY

Verify sensitive information does not unnecessarily remain accessible through:

```text
Back
Forward
History
URL
```

Especially after:

- logout
- payment
- account deletion
- sensitive profile screens

---

# 53. AUTOCOMPLETE / SENSITIVE FORM FIELDS

Review forms containing:

- passwords
- OTP
- phone numbers
- payment-related information

Use appropriate HTML semantics and autocomplete behavior.

Do not disable useful password-manager behavior without a good reason.

---

# 54. CLIPBOARD

If using:

```javascript
navigator.clipboard
```

audit:

- what can be copied
- whether secrets/tokens are copied
- whether clipboard reads occur unnecessarily

---

# 55. CAMERA / LOCATION / MICROPHONE

If the application requests permissions:

```text
camera
location
microphone
notifications
```

verify:

- permission requested only when necessary
- no request on initial load without context
- information isn't retained unnecessarily
- permission failure is handled safely

Review `Permissions-Policy` where appropriate.

---

# 56. BROWSER NOTIFICATIONS

If notifications are used:

Check:

- sensitive information shown on lock screens
- permission timing
- notification links
- user-controlled notification content
- service-worker handling

---

# 57. SOCIAL / DEEP LINKS

Audit event links shared through:

```text
WhatsApp
Instagram
SMS
Email
```

Check whether links leak:

- user IDs unnecessarily
- access tokens
- private invitation tokens
- internal IDs
- personal information

Invitation tokens must not provide more access than intended.

---

# 58. PRIVATE INVITATION LINKS

If invite-only events or tribes use links:

Evaluate:

```text
entropy
expiration
single/multi-use behavior
revocation
information exposure
```

Frontend must not infer access merely because a URL contains an invitation parameter.

Backend must validate the invitation.

---

# 59. CORS ASSUMPTIONS

Search frontend configuration for API origins.

Check whether developers assume:

> "CORS prevents unauthorized users from calling our API."

It does not.

CORS is primarily a browser cross-origin policy.

Backend authentication and authorization are still required.

Flag overly broad backend CORS if discovered during frontend testing.

---

# 60. NEXT.JS-SPECIFIC AUDIT — IF APPLICABLE

If this frontend uses Next.js, explicitly audit the client/server boundary.

Search for:

```text
"use client"
Server Components
Server Actions
route handlers
middleware
NEXT_PUBLIC_
cookies()
headers()
```

Verify:

- server secrets never cross into client bundles
- server-only modules aren't imported into client components
- private environment variables aren't serialized into props
- Server Actions perform authentication
- Server Actions perform authorization
- Server Actions validate input
- Server Actions are not treated as secure merely because the frontend doesn't expose them
- route handlers receive normal API security review
- middleware isn't the only authorization control for critical operations

Anything executing server-side as part of the frontend repository should be treated as **backend security code** and audited accordingly.

---

# 61. SSR / HYDRATION DATA EXPOSURE

If server rendering is used, inspect HTML source for serialized data.

Look for:

```text
__NEXT_DATA__
hydration payloads
server props
inline JSON
```

Verify no sensitive server-only data is accidentally sent to the browser.

Remember:

> If it appears in rendered HTML, the user can read it.

---

# 62. INTERNAL URL EXPOSURE

Search browser bundles for:

```text
internal hostnames
private IP addresses
database hosts
admin endpoints
staging APIs
monitoring endpoints
```

Exposure isn't always a vulnerability, but unnecessary infrastructure disclosure should be removed.

---

# 63. FORMS

Audit every form for:

- client validation
- unsafe HTML
- duplicate submissions
- sensitive data handling
- autocomplete
- error leakage

But confirm server-side validation exists independently.

Client validation can always be bypassed.

---

# 64. PROTOTYPE POLLUTION / UNSAFE OBJECT MERGING

Search for code that merges attacker-controlled objects using generic utility functions.

Audit libraries/utilities doing:

```text
deep merge
object assignment
query-string parsing
nested property assignment
```

Check dependency vulnerabilities related to prototype pollution.

---

# 65. REGEX / CLIENT RESOURCE ABUSE

Review complex regular expressions operating on attacker-controlled strings.

Look for potential browser freezing or excessive CPU use.

Likewise check expensive client processing triggered by arbitrary user input.

---

# 66. DENIAL-OF-SERVICE FROM FRONTEND

Test:

- huge messages
- huge event descriptions
- thousands of DOM nodes
- huge JSON responses
- huge images
- repeated API polling
- infinite retry loops
- infinite WebSocket reconnects

An attacker should not easily freeze the user's browser.

---

# 67. API RETRY SECURITY

Audit automatic retries.

A retry must not accidentally repeat:

```text
purchase
refund
ticket creation
invitation
message send
account change
```

without understanding whether the backend operation is idempotent.

---

# 68. TOKEN REFRESH

If refresh tokens/session refresh is implemented:

Test:

```text
access token expires
refresh succeeds
refresh fails
refresh token expires
multiple requests refresh simultaneously
logout occurs during refresh
```

Check for loops and accidental token leakage.

---

# 69. ACCOUNT SWITCHING

Test on the same mobile browser:

```text
User A login
↓
Browse
↓
Logout
↓
User B login
```

Check:

- cache
- React Query cache
- Redux state
- Zustand state
- Apollo cache
- localStorage
- sessionStorage
- IndexedDB

No User A information should appear for User B.

---

# 70. FRONTEND DATA CACHES

If using:

```text
React Query
SWR
Apollo
Redux
Zustand
other state stores
```

audit:

- logout cleanup
- account switching
- stale private data
- persistence
- cross-user cache keys

Cache keys involving user-specific data must not collide between accounts.

---

# 71. THIRD-PARTY AUTH / OAUTH

If Google/social login is used:

Audit:

- redirect URI handling
- state/nonce handling
- callback parameters
- open redirects
- token storage
- error handling

Do not trust frontend claims about authenticated identity.

Backend/provider verification is authoritative.

---

# 72. SENSITIVE INFORMATION IN DOM

Inspect DOM after loading authenticated pages.

Determine whether hidden elements contain sensitive information such as:

```html
display:none
hidden
data-*
```

"Hidden" is not protected.

Anything placed in the DOM is accessible to the user and scripts.

---

# 73. HTML COMMENTS

Inspect production HTML for:

```html
<!-- ... -->
```

Remove comments exposing:

- internal architecture
- credentials
- TODOs
- internal URLs
- security controls
- developer notes

---

# 74. SECURITY OF `window` GLOBALS

Search for sensitive information attached to:

```javascript
window.*
globalThis.*
```

Avoid exposing:

- tokens
- secrets
- full user objects
- security state

to global scope unnecessarily.

---

# 75. EXTERNAL NAVIGATION

Whenever user input can determine an external destination:

- validate scheme
- validate destination
- use an allowlist where appropriate
- prevent `javascript:` execution
- prevent open redirect abuse

---

# 76. SUBDOMAIN TRUST

List all application origins:

```text
app.example.com
admin.example.com
organizer.example.com
api.example.com
```

Review:

- cookie Domain attributes
- localStorage separation
- CSP
- CORS
- cross-subdomain messaging
- authentication assumptions

Do not assume every sibling subdomain deserves equal trust.

---

# 77. PAYMENT PROVIDER CALLBACK UI

Test forged frontend states such as:

```text
paymentSuccess = true
paymentId = fake
status = success
```

Manipulating client state must never grant:

- ticket
- paid access
- discount
- order completion

The server must determine final status.

---

# 78. ERROR BOUNDARIES

Verify production error boundaries do not expose:

- component stack
- raw API payloads
- sensitive user state
- tokens
- internal paths

---

# 79. SECURITY HEADERS ON EVERY IMPORTANT ROUTE

Test actual production routes individually:

```text
/
login
signup
event/*
profile
ticket/*
payment/*
tribe/*
```

Do not assume headers applied to `/` automatically appear on every response type.

---

# 80. STATIC ASSET SECURITY

Review files under:

```text
/public
/static
/assets
```

Look for accidentally published:

- JSON data
- credentials
- backups
- config files
- database exports
- test data
- internal PDFs
- environment files

Try accessing likely sensitive paths directly.

---

# 81. `.ENV`, `.GIT` AND BACKUP EXPOSURE

Test that production does not serve:

```text
/.env
/.git/
/.env.production
/config.json
/backup.zip
/source.zip
/package.json
```

where they shouldn't be public.

---

# 82. PII IN URLs

Search routing code for data placed into paths/query parameters.

Avoid URLs like:

```text
?phone=...
?email=...
?token=...
?password=...
```

because URLs can leak into browser history, logs, analytics and referrers.

---

# 83. ACCESSIBILITY-RELATED SECURITY ERRORS

Check custom UI controls where security-sensitive confirmations might be inaccessible or accidentally skipped.

Examples:

- account deletion
- payment confirmation
- permissions
- logout

Not primarily a security mechanism, but broken controls can create dangerous user behavior.

---

# 84. SENSITIVE AUTOFILL / SCREEN DISPLAY

For OTP/payment/authentication screens, review whether sensitive values remain visible unnecessarily.

Ensure password fields use appropriate input types.

---

# 85. CLIENT CLOCK TRUST

Search for:

```javascript
Date.now()
new Date()
```

where used to enforce:

- ticket expiry
- OTP expiry
- invitation expiry
- discounts
- purchase deadlines
- authorization

The user's device clock is attacker-controlled.

Security/business-critical time must be enforced server-side.

---

# 86. CLIENT-SIDE PRICE TRUST

Search for:

```text
price
amount
discount
fee
total
currency
```

Trace every calculation.

Frontend calculations may be used for display.

Backend must independently calculate authoritative financial values.

---

# 87. CLIENT-SIDE INVENTORY TRUST

Do not rely on frontend values for:

```text
ticketsRemaining
eventCapacity
availability
soldOut
```

Frontend can display these.

Backend must enforce capacity atomically.

---

# 88. PRIVATE API INFORMATION

Review whether APIs send sensitive fields which the frontend merely hides.

Example:

```json
{
  "name": "...",
  "email": "...",
  "internalNotes": "...",
  "adminFlags": "...",
  "passwordHash": "..."
}
```

Frontend filtering is not adequate.

The backend should not send unnecessary sensitive fields.

Flag every instance.

---

# 89. ATTACKER-PERSPECTIVE DEVTOOLS TEST

For every important flow:

1. Open DevTools.
2. Modify frontend state.
3. Modify localStorage.
4. Modify API request.
5. Change IDs.
6. Change amount.
7. Change role.
8. Replay request.
9. Call API without UI.
10. Navigate directly to hidden routes.

Observe whether anything unsafe becomes possible.

---

# 90. CRITICAL FLOWS TO ATTACK

Explicitly security-test:

```text
Signup
Login
OTP
Password reset
Profile editing
Event discovery
Event details
Join/create tribe
Invitation
Chat
Ticket purchase
Payment
Ticket display
Refund/cancellation if available
Logout
Account deletion
```

---

# 91. SECURITY TEST THE COMPLETE PAYMENT JOURNEY

Attack:

```text
Event
 ↓
Select Ticket
 ↓
Manipulate quantity
 ↓
Manipulate price
 ↓
Manipulate discount
 ↓
Start payment
 ↓
Cancel
 ↓
Retry
 ↓
Fake success callback
 ↓
Refresh
 ↓
Replay
 ↓
Back button
```

No combination should produce an invalid paid/ticket state.

---

# 92. AUTOMATED SCANS

Run appropriate tooling for:

```text
dependency vulnerabilities
secret scanning
static analysis
production headers
production bundle analysis
unused/deprecated packages
```

Possible categories of tools include:

```text
npm audit / package-manager audit
Gitleaks or equivalent secret scanner
Semgrep/static-analysis tooling
OWASP ZAP/DAST against a controlled environment
Lighthouse/browser security inspection
```

Do not trust automated tools alone.

Manual review remains required.

---

# 93. DO NOT "FIX" BACKEND SECURITY IN FRONTEND

If the audit discovers:

```text
missing authorization
missing rate limiting
missing payment verification
missing server validation
missing CSRF validation
missing file validation
IDOR
```

do not claim it is fixed because the frontend blocks the action.

Output:

```text
BACKEND SECURITY CHANGE REQUIRED
```

and describe exactly what must change.

---

# 94. FINAL P0 QUESTIONS

Before declaring the frontend production-ready, answer:

- [ ] Can I find any secret in the browser bundle?
- [ ] Can XSS steal a user's session?
- [ ] Can user-generated content execute JavaScript?
- [ ] Can URL parameters produce executable content?
- [ ] Can localStorage modification grant privileges?
- [ ] Can changing a frontend role grant permissions?
- [ ] Can changing an ID expose another user's data?
- [ ] Can changing price/quantity affect authoritative payment?
- [ ] Can fake payment success issue a ticket?
- [ ] Can double-click create duplicate financial actions?
- [ ] Can third-party scripts access unnecessary sensitive information?
- [ ] Can analytics receive PII/tokens?
- [ ] Can an attacker embed the site for clickjacking?
- [ ] Are sensitive pages/responses cached improperly?
- [ ] Can logout leave another user's private data behind?
- [ ] Can an open redirect send users to an attacker domain?
- [ ] Can unsafe URLs execute `javascript:` or other dangerous schemes?
- [ ] Can `postMessage` accept messages from an attacker origin?
- [ ] Can a service worker expose stale/private content?
- [ ] Can an old/test/debug path bypass normal security?
- [ ] Can source maps/build artifacts disclose sensitive information?

---

# FINAL DELIVERABLE

After completing the audit, produce four sections.

## A. P0 — Production Blockers

Every vulnerability that must be fixed before deployment.

## B. P1 — High Priority

Important security vulnerabilities/hardening to complete before public launch.

## C. P2/P3 — Hardening

Non-blocking improvements.

## D. Backend Dependencies

Every frontend-discovered problem that requires backend remediation.

Finally output a table:

| Severity | Vulnerability | File/Component | Exploit | Impact | Fix | Status |
|---|---|---|---|---|---|---|

Then run the security review **again after all P0/P1 fixes** to detect regressions.

The audit is complete only when there are:

```text
0 unresolved P0 findings
0 unjustified P1 findings
```

Do not mark an issue as resolved merely because exploitation is inconvenient.

Assume the attacker has full control over:

```text
their browser
DevTools
frontend JavaScript
network requests
localStorage
query parameters
client-side state
```

The fundamental rule is:

> **Anything sent to the browser belongs to the user. Anything enforced only by the browser can be bypassed.**