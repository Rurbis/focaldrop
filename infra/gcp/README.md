# Google Cloud

The NestJS API runs on **Cloud Run** in `us-east4`, next to Supabase `us-east-1` (D56, D63). Files never go through Google: the API signs R2 URLs and browsers upload and download straight from R2, where egress is free.

The project lives in the organization Google created with the billing account. New organizations enforce secure-by-default policies, and three of them shape this setup:

- **No service account keys can be created or uploaded**, which enforces D105 at the platform level.
- **Default service accounts get no roles.** Every workload here (API, deployer, billing guard, function build) has its own service account with only the roles it needs.
- **Domain restricted sharing**: roles can only go to identities of the organization. External accounts (personal Gmail) and `allUsers` are rejected. Both owners use the platform account, and the API is made public with Cloud Run's `--no-invoker-iam-check` instead of granting `allUsers` (issue #16).

## What `bootstrap.sh` sets up

| Piece                                                                  | Why                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Artifact Registry `focaldrop` (Docker, `us-east4`)                     | Stores the API images that Cloud Run runs. A cleanup policy keeps the 5 most recent and every `v*` release, and deletes the rest after 30 days, to stay inside the 0.5 GB free tier.                                                                                |
| `focaldrop-api-runtime` service account                                | Identity of the API in Cloud Run, with no roles yet.                                                                                                                                                                                                                |
| `github-deployer` service account                                      | What GitHub Actions impersonates to deploy. It can deploy Cloud Run services (`run.developer`), push to this repository only and act as the runtime account only.                                                                                                   |
| Workload Identity Federation: pool `github`, provider `github-actions` | GitHub signs a short-lived token saying which repository a workflow belongs to; Google verifies it and grants temporary access. There is no long-lived key to leak (D105).                                                                                          |
| Billing guard: topic `billing-alerts` and function `billing-guard`     | Turns the budget into a hard cap. When a budget notification reports a cost above the budget, the function unlinks the billing account, which stops every service in the project. Its account can only manage billing on this project and read the billing account. |
| `function-builder` service account                                     | Identity Cloud Build uses to build the billing guard (`cloudbuild.builds.builder`).                                                                                                                                                                                 |
| Secret Manager secret `api-database-url-staging`                       | The API's `DATABASE_URL` in staging. Only the runtime account can read it; the deploy references it by name. The script creates it empty: the value is added by hand (below).                                                                                       |

**Access is granted by immutable IDs.** Repository `1414983088` of owner `263442215` instead of `Rurbis/focaldrop`: names can be renamed (this repository was `darkroom`) or reused after a deletion, IDs cannot.

**No service account keys.** The script fails if any user-managed key exists.

## Run it

In [Cloud Shell](https://shell.cloud.google.com), signed in with the platform account:

```bash
git clone https://github.com/Rurbis/focaldrop.git
cd focaldrop
PROJECT_ID=focaldrop bash infra/gcp/bootstrap.sh
```

It is safe to run again. At the end it prints the values that issue #16 stores as GitHub Environment variables. They are identifiers, not secrets.

## Cost protection (D87)

Three layers, because a budget on its own only sends emails:

1. **`max-instances = 2`** on the Cloud Run service (issue #16) bounds how far traffic can scale it.
2. **A US$5/month budget** (MX$100, the billing account is in MXN) with alerts at 50, 90 and 100 %, set in the console on the paid account. Credits are excluded, so it measures real usage.
3. **The billing guard** cuts billing when the budget is exceeded. Budget notifications arrive with a delay of a few hours, so the real ceiling is slightly above US$5.

Cutting billing stops the API, and Google warns that resources may be deleted. That is acceptable here: no data lives in Google Cloud (the database is Supabase and files are R2), and CI can redeploy the API. To recover, link the billing account again in the console.

### Test the guard

```bash
# Under budget: the logs say "No action".
gcloud pubsub topics publish billing-alerts --message='{"budgetDisplayName":"test","costAmount":1,"budgetAmount":5}'
# Over budget: billing is disabled.
gcloud pubsub topics publish billing-alerts --message='{"budgetDisplayName":"test","costAmount":10,"budgetAmount":5}'
gcloud functions logs read billing-guard --region=us-east4 --limit=10
gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)'
# Then link the billing account again in the console (Billing > Link a billing account).
```

### Billing guard dependencies

`billing-guard/package.json` overrides `uuid` to 11.1.1. `cloudevents` 10.0.0, pulled in by `@google-cloud/functions-framework` 5.0.5 (both are the latest versions), still asks for `uuid@^8.3.2`, which Dependabot flags (GHSA-w5hq-g745-h8pq) and cannot update. The flaw only affects `v3`, `v5` and `v6` called with a `buf` argument; `cloudevents` only calls `v4()`, and 11.1.1 still ships the CommonJS build it loads. Remove the override once `cloudevents` accepts `uuid` 11.1.1 or later. Dependency changes reach the deployed function the next time `bootstrap.sh` runs.

## Not here

- **Billing and budget** are set in the console. After the script runs, connect the budget to the `billing-alerts` topic (_Manage notifications_).
- **The value of `DATABASE_URL`** and **the public Cloud Run service**: one-time steps by hand, below.

## Before the first API deploy (issue #16)

The deploy workflow ([`deploy-api.yml`](../../.github/workflows/deploy-api.yml)) needs three things that only a person with the platform account can do, once per environment. Run them in Cloud Shell after `bootstrap.sh`.

**1. The runtime role in Supabase.** Migration `0001` creates `app_api` without a password, and passwords never go through Git. Create it first; the migration accepts an existing role as long as it has no administrative privileges. Generate its password in Bitwarden (32 letters and digits, so it needs no escaping in the URL). Connect with `psql` from Cloud Shell as `postgres`, through the session pooler (host in Supabase, _Connect_ > _Session pooler_); it asks for the database password:

```bash
psql "host=<pooler host> port=5432 dbname=postgres user=postgres.<project ref> sslmode=require"
```

```sql
CREATE ROLE app_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
\password app_api
```

`\password` asks for the new password twice and hashes it in `psql` before sending it, so the plain password never reaches the server's logs or the SQL editor's history.

**2. The secret's value.** The API connects through the transaction pooler (same host, port 6543, D63) as `app_api.<project ref>`. Keep the full URL in Bitwarden next to the password. `read -rs` takes it without echoing it or saving it in the shell history, and `printf '%s'` sends it without a trailing newline, which would end up inside `DATABASE_URL`:

```bash
read -rs DB_URL   # paste the URL and press Enter
printf '%s' "$DB_URL" | gcloud secrets versions add api-database-url-staging --data-file=- && unset DB_URL
```

The deploy reads the `latest` version when each instance starts. After rotating the password, add a new version and deploy again.

**Tenant fallback in staging (#13).** The workflow sets `NODE_ENV=production`
and `APP_ENV=staging` independently. After provisioning the staging agency
(#71), add its existing slug as the `DEFAULT_AGENCY_SLUG` secret in GitHub's
`staging` Environment. The workflow passes it to the API without exposing the
agency's name in public build logs. An absent/empty secret disables fallback;
unknown hosts return 404 until an agency/default is configured. Production
must use `APP_ENV=production` and omit this default: a nonempty value stops
the API before startup. `SENTRY_ENVIRONMENT` never controls tenant resolution.

**3. The public service.** The deployer can deploy (`run.developer`) but not change who may call a service, and in this organization `allUsers` is rejected (domain restricted sharing). So the service is created once, public, with Google's sample image; every deploy afterwards replaces the image and keeps the setting:

```bash
gcloud run deploy focaldrop-api-staging \
  --image=us-docker.pkg.dev/cloudrun/container/hello \
  --region=us-east4 \
  --service-account=focaldrop-api-runtime@focaldrop.iam.gserviceaccount.com \
  --max-instances=2 \
  --no-invoker-iam-check
```
