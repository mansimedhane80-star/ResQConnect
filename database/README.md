# Res-Q Connect Database

This folder contains the PostgreSQL/PostGIS database setup for ResQConnect.

## Database

- Database name: `resq_connect`
- Database technology: PostgreSQL + PostGIS

The database stores users, SOS cases, risk alerts, responders, resources, road
updates, assignments, notification deduplication records, cached geocodes, and
tracking-attempt counters.

## Files

- `schema.sql` creates the project tables, location fields, and spatial indexes.
- `seed.sql` adds demo responder, resource, road update, risk alert, and SOS
  data. Use it only in a development database.
- `migrations/` contains incremental changes for existing databases.

## Existing database migrations

Apply these files in order from the repository root with `psql` (configure your local
PostgreSQL connection using your usual private connection settings):

```powershell
psql -d resq_connect -f database/migrations/20261105_admin_applications_and_sos_tracking.sql
psql -d resq_connect -f database/migrations/20261107_notification_log.sql
psql -d resq_connect -f database/migrations/20261107_tracking_codes_and_geocode_cache.sql
```

The migrations add administrator applications and hashed SOS tracking,
notification deduplication, and the geocode cache plus tracking-attempt
limiter. They preserve existing SOS rows and coordinates. The tracking code
upgrade does not rewrite previously stored token hashes, so existing links
remain valid.

For a new development database, create the database with PostGIS enabled and
apply `schema.sql`; do not also apply migrations that create the same tables.
