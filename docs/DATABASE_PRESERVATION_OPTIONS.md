# Database preservation options — proposals only

7 November2026, Europe/Zurich (CET). No credentials/production records accessed, no live export/restore, plan change, new infrastructure or spend. Companion to [RELEASE_READINESS.md](RELEASE_READINESS.md).

## Evidence / coverage / costs

Read-only repository evidence: API `render.yaml` declares free Postgres `arsenal-pro-db` and free web service in Oregon, `DATABASE_URL` reference and generated SESSION_PEPPER. This is desired configuration, **not proof of the live plan, backups, creation time, size or expiry**. No production SQL/records, credentials or recovery keys were read.

Exports differ: `GET /api/me` covers one capability-code stream’s legacy lines/surface/notes/events; `GET /api/account/export` covers the authenticated user/events and their team memberships/shares/notes/reports (`lib/teams.js:130–143`), not the entire database, other members, credentials or invite/session tables. Its JSON is **not the app’s backup-v1 format** and is not a tested direct Import round-trip. Local Download backup covers local event history plus prefs/snapshots (prefs not fully applied on restore). No full-database export/restore operator endpoint/runbook was found in the repo. None of these substitutes for a tested full DB recovery procedure.

Public sources opened7 November2026 (Europe/Zurich): [Free](https://render.com/docs/free), [Pricing](https://render.com/pricing), [Recovery/backups](https://render.com/docs/postgresql-backups). Free Postgres expires30 days after creation; inaccessible after expiry;14-day upgrade grace then deletion. Grace is not uptime/backup. Free has no Render recovery/platform logical exports; docs allow manual `pg_dump`. Free web sleeps after15 idle minutes, wake about1minute. These are generic rules, **not this DB’s exact deadline**.

| Option (proposal only) | Verified cost / preservation limits | Required approval/evidence |
|---|---|---|
| Keep core local-only beta while durability unresolved | No new platform purchase committed. Existing hosting usage limits still apply. Cache/local files are not permanent storage; no account/Team durability promise. | Owner agrees limited beta scope, user-controlled private backup and recovery rehearsal; do not silently disable/change existing account services. |
| Owner-authorized manual full DB preservation while free remains accessible | Free compute is$0/month; no platform backup/recovery. `pg_dump` can produce an off-host private copy; storage/operator costs not assessed. Not a durable hosting solution. | Separate production-data export authorization, secure sanctioned secret handling, encrypted/access-controlled retention; test restore only into an empty isolated DB, verify counts/constraints/events/auth/team coverage without publishing records. Never restore over live/nonempty data. No export executed here. |
| Paid PG on Hobby workspace | PG `0.1c-256mb` **$6/month +$0.30 per provisioned GB/month**; `0.5c-1g` $19+storage if sizing needs it. Hobby workspace$0. Paid PG has3-day PITR and logical exports retained7days. This is a pricing formula, not a$6 total quote: current/provisioned storage minimum/size, tax, region/usage and live bill not verified. | Owner selects size/budget and authorizes change; preserve existing DB first, verify recovery window after upgrade, rehearse empty isolated restore. PITR creates another billable DB; not free or retroactive protection of lost history. No upgrade performed. |
| Optional always-on web / longer PITR | Web `0.5c-512mb` **+$7/month**; Pro workspace **+$25/month** + compute for7-day rather than3-day PITR. Upgrading workspace alone does not make Free PG durable. | Only if owner needs/approves it. Paid web does not fix an expiring free DB; no new service, plan or autoscaling change now. |

Before any approved DB cutover: verify exact deadline/zone from selected live dashboard/owner notice without exposing connection strings; capture plan/backup status; authorize export/retention and isolated rehearsal; verify schema/users/events/device streams/team data/indexes/sequences and app recovery; choose controlled write freeze/cutover/rollback, preserve original. SESSION_PEPPER is not in the database: preserve through approved secret management or accept that rotation signs sessions out; do not print/read it here. Deployment/live writes remain separately blocked.


Release remains blocked on owner-confirmed live deadline, preservation authorization, durable hosting and a tested recovery rehearsal. No command in public documentation was executed against production.


## t102 read-only configuration recheck (8 November2026, America/New_York EST)
API3 `render.yaml` still declares Free Oregon PostgreSQL/web, DATABASE_URL fromDatabase, generated SESSION_PEPPER and existing allowed origin. No production dashboard/connection/records/secret was queried. Desired YAML is not live-plan/expiry/backup proof; **15 November remains unverified**. Price/source table above is the dated prior research, not a refreshed quote or approved purchase.

Preservation order, only after separate approval: verify selected live DB identity/plan/deadline; authorize confidential full DB export/retention using the sanctioned credential channel; operator runs pg_dump custom-format to an access-controlled off-host file; record tool/server versions and non-secret checksum; restore into an empty isolated database and verify schema/constraints/indexes/sequences and account/device/team/event coverage. Retain the original and define cutover/write-freeze/rollback before any production change. No such export or rehearsal was performed. Never substitute a per-account archive or this phone's backup for a full DB dump. Do not put credentials/dumps in PRs/screenshots.

Local user protection available now: Me→Download backup, keep it private; Import→modern file→optional local review of supported settings/lists→inspect conflicts (keep-phone default)→apply only while signed out/code sync off→download checkpoint→Undo before later edits or Keep current data. Existing account export remains an archive, not an app Import file. This does not guarantee remote durability or full-phone recovery.
