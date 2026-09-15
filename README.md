# Cruise Deck

Cruise Deck is a React app with Cognito-backed login, a typed Hono API, and AWS infrastructure managed with CDK. This restarted baseline keeps the template-with-login structure: the API owns auth and stores Cognito tokens in HTTP-only cookies, while the UI uses `/me` to protect the `/app` route.

## Tech Stack

- TypeScript
- React
- Vite
- Tailwind
- Hono
- AWS CDK
- Biome

## Repo Structure

- `ui` - Vite React app
- `ui/src/pages` - Route-level pages for login, sign-up, forgot password, app, and not found states
- `ui/src/auth` - Client-side auth provider and typed Hono API client
- `api` - Hono serverless API
- `api/src/lambdas` - Lambda entry points and route wiring
- `api/src/contracts` - API request/response types and validators
- `api/src/lib` - Reusable API helpers and Cognito utilities
- `infra` - CDK app and stacks for hosting the UI, Cognito, HTTP API, and Lambda
- `.github/workflows/deploy.yml` - Production deploy workflow for pushes to `main` and manual dispatches

## Getting Started (Local Development)

- Node.js: `24.12.0`
- pnpm: `10.28.2`
- AWS CLI configured for deployments
- AWS SSO access for the `DRoemhildt19` profile used by the current deploy scripts

## Local Development

Install dependencies from the repo root:

```bash
pnpm install
```

Run the local UI dev server:

```bash
pnpm run local-ui
```

Run the local API dev server:

```bash
pnpm run local-api
```

Run the UI and API together:

```bash
pnpm run local
```

Local defaults:

- UI: `http://localhost:5173`
- API: `http://localhost:8787`
- The UI uses `VITE_API_URL` when set, otherwise it calls the local API URL.

For local development, point the API at a real Cognito user pool before running `pnpm run local-api`. The local API automatically loads `api/.env` when it exists:

```powershell
Copy-Item api/.env.example api/.env
```

Then fill in `USER_POOL_ID`, `USER_POOL_CLIENT_ID`, and `USER_POOL_REGION` in `api/.env`. You can get those values from the CDK outputs after deploying the API stack.

Do not reuse an `api/.env` from another project. Deploy this project first, then create `api/.env` from `api/.env.example` and fill it with this project's own CDK outputs.

The API sets HTTP-only cookies for Cognito access, ID, and refresh tokens. The UI does not store auth tokens in `localStorage`.

## Quality Checks

Run all package typechecks:

```bash
pnpm run typecheck
```

Apply Biome fixes:

```bash
pnpm run format
```

Build every package with a build script:

```bash
pnpm run build
```

## API and Auth

The auth Hono app lives in `api/src/lambdas/auth.ts` and exposes:

- `GET /health`
- `POST /auth/signup`
- `POST /auth/confirm-signup`
- `POST /auth/resend-code`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/confirm-forgot-password`
- `POST /auth/logout`
- `GET /me`

The UI uses Hono's typed client from `hono/client` in `ui/src/auth/api.ts`. The API package exports the route type, so UI calls like `client.auth.login.$post(...)` are checked against the actual Hono routes. The client sends cookies with each request and retries once through `/auth/refresh` when an authenticated request returns `401`.

The `/app` UI route is protected by the auth provider. If `/me` cannot resolve a signed-in user, the user is routed back to `/`.

Cruise Deck uses self-signup with first and last name fields, a user-chosen password, and email verification. Names are stored in Cognito standard `given_name` and `family_name` attributes. It does not use Cognito admin invitations, temporary passwords, or `NEW_PASSWORD_REQUIRED` challenge handling.

## Infrastructure

The CDK app lives in `infra` and defines two stacks:

- `cruise-deck-ui`
- `cruise-deck-api`

CDK context in `infra/cdk.json` controls the hosted domain:

- `rootDomain` - Route53 hosted zone domain
- `hostedZoneId` - Route53 hosted zone ID
- `siteSubdomain` - Subdomain deployed by this app; leave empty to deploy at the root domain

The UI stack deploys the built UI from `ui/dist` to `cruise-deck.derek-dev.com` by default.

The UI stack creates:

- Private S3 bucket for static site assets
- CloudFront distribution with Origin Access Control
- CloudFront proxy behaviors for `/auth/*`, `/me`, and `/health` so the deployed UI calls the API through the same site origin
- CloudFront Function SPA routing for extensionless UI paths like `/verify`, without rewriting API error responses
- ACM certificate for the primary domain and `www` domain
- Route53 A and AAAA alias records for both domains
- Bucket deployment with CloudFront invalidation

The API stack creates:

- Cognito user pool with email sign-in, email-only recovery, and standard name attributes
- Cognito user pool client with read/write access to email and name attributes
- HTTP API Gateway
- `cruise-deck-auth` Lambda backed by the Hono API
- Lambda integration for API Gateway

## Deploying the app

Log in with AWS SSO:

```bash
pnpm run sso
```

Preview the stack:

```bash
pnpm run diff
```

Synthesize the stacks:

```bash
pnpm run synth
```

Deploy the stack:

```bash
pnpm run deploy
```

## GitHub Actions Deploy

The deploy workflow runs on pushes to the `main` branch and can also be started manually from GitHub Actions.

The workflow:

- Installs pnpm and Node.js
- Installs dependencies with `pnpm install --frozen-lockfile`
- Assumes the AWS role from GitHub's `AWS_DEPLOY_ROLE_ARN` secret
- Runs `pnpm run github-action-deploy`
- Deploys to `us-east-1`

## GitHub OIDC Setup
Cruise Deck needs access to the AWS deploy role used by GitHub Actions.

1. Add a repository secret in GitHub:

	- Name: `AWS_DEPLOY_ROLE_ARN`
	- Value: the ARN of the IAM role GitHub Actions should assume

2. Update that IAM role's trust policy to allow the new repo on `main`:

	```json
	"token.actions.githubusercontent.com:sub": [
		"repo:Droem19/derek-dev-website:ref:refs/heads/main",
		"repo:Droem19/cruise-deck:ref:refs/heads/main"
	]
	```
