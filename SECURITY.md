# Security

Report vulnerabilities privately through GitHub's private vulnerability reporting feature when available. Do not put credentials, customer conversations, or exploit details in public issues.

## Deployment requirements

- Configure `CONVEX_SERVER_BRIDGE_SECRET` with the same cryptographically random value (at least 32 characters) in the Next.js server and Convex server environments. Never use a `NEXT_PUBLIC_` prefix. This credential is required for authoritative Clerk membership synchronization and server-only Zendesk credential access. Generate it outside the repository and keep it in your hosting secret managers.
- Configure `CLERK_WEBHOOK_SIGNING_SECRET` in Next.js and enable verified `organizationMembership.created`, `organizationMembership.updated`, and `organizationMembership.deleted` events. Membership snapshots are fetched from Clerk's server API, including all pages; browser-supplied roles are never trusted.
- Reconcile existing Convex membership records against Clerk before enabling production traffic. Earlier versions accepted untrusted membership claims. Rotate potentially exposed Zendesk tokens and inspect access logs.
- Configure `ZENDESK_APP_SIGNING_SECRET` in Convex and your trusted Zendesk application backend. Unsigned standalone sidebar requests are denied. Never embed this signing secret in an iframe, static HTML, or browser JavaScript.
- The trusted backend must verify the Zendesk user's identity, account and permissions before issuing a short-lived bearer token. The token format is `base64url(JSON payload).hex(HMAC-SHA256(encoded-payload))`. Payload fields: `aud: "repvix-zendesk"`, `subdomain`, Unix-second `iat` and `exp` (maximum lifetime 300 seconds), and `paths` (an allowlist such as `/zendesk/analyze`). Only billing administrators may receive `/zendesk/billing-portal` scope. There is no anonymous compatibility fallback.
- Configure the existing Clerk, Convex, OpenAI, Lemon Squeezy and Zendesk variables in the hosting environments. Use a separate test deployment for validation. Publishing GitHub source does not deploy Convex functions or rotate tokens.

Run `npm run typecheck`, `npm run test:security`, `npm audit`, and Gitleaks before releasing. Security tests use synthetic data and do not contact production services. CI runs with read-only repository permissions.

## Public repository contents

Demo illustrations contain synthetic data. Original screenshots, videos and bundled font files were removed from the public history. The repository is publicly viewable, but no open-source redistribution license is granted by making it public. Third-party packages retain their respective licenses.
