# GoPratle Admin Deployment Dashboard

The `/admin/deployment` dashboard runs on the Vercel frontend and uses only
server-side API routes for cloud management. Do not prefix any secret with
`NEXT_PUBLIC_`.

## Required Vercel environment variables

```text
ADMIN_DASHBOARD_USER=admin
ADMIN_DASHBOARD_PASSWORD=<strong unique password>
ADMIN_SESSION_SECRET=<long random signing secret>

UPSTASH_REDIS_REST_URL=<Upstash Redis REST URL>
UPSTASH_REDIS_REST_TOKEN=<Upstash Redis REST token>

GOPRATLE_FRONTEND_URL=https://event-manager-three-kohl.vercel.app
GOPRATLE_BACKEND_URL=https://gopratle-api.onrender.com

GOPRATLE_GITHUB_OWNER=Akashvasan2003
GOPRATLE_GITHUB_REPO=event-manager
GOPRATLE_GITHUB_BRANCH=master
GOPRATLE_EXPECTED_COMMIT=f9c91fd
GITHUB_TOKEN=<read-only GitHub token>

RENDER_API_KEY=<Render API key>
RENDER_SERVICE_ID=<existing gopratle-api service id>
RENDER_SERVICE_NAME=gopratle-api

ATLAS_CLIENT_ID=<Atlas service account client id>
ATLAS_CLIENT_SECRET=<Atlas service account client secret>
ATLAS_GROUP_ID=<Atlas project id>
ATLAS_CLUSTER_NAME=Cluster0
ATLAS_DATABASE_NAME=gopratle
```

## Credential scopes

- GitHub token: read-only access to repository metadata and commit status.
- Render API key: access to inspect the existing `gopratle-api` service and
  trigger deploys only after explicit admin approval.
- Atlas service account: read-only project, cluster and database-user
  inspection for the current dashboard. Grant write scopes only if approved
  mutation features are added later.
- Upstash Redis: REST token used by Vercel server-side routes for shared rate
  limits and append-only audit records.

## Runtime behavior

- Login, deployment, tests, assistant and plan routes use shared Redis-backed
  rate limits and fail closed if Redis is unavailable.
- Read-only status requests use Redis-backed rate limits but may fail open so
  the dashboard can still report infrastructure status.
- Audit records are stored in Redis key `gp:audit:v1` and include actor, action,
  timestamp, result and resource id. Passwords, tokens, API keys, authorization
  headers, cookies and connection strings are redacted before storage.
- Production deployment and production API tests require exact confirmation
  strings in addition to an authenticated admin session and CSRF token.
- The status view performs read-only verification of GitHub, Render, Atlas and
  the backend health endpoint. It does not deploy or modify cloud resources.
