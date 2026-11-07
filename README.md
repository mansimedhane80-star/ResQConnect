# ResQConnect

ResQConnect is an AI-assisted emergency reporting and disaster coordination application. Citizens can submit SOS reports without an account and track them using a private tracking code. Administrators review reports and coordinate responders; responders manage only their own assignments.

## Architecture and features

- **Frontend:** React 19 and Vite. The citizen interface handles SOS reports, secure tracking and anonymized resolved-case summaries. Administrator and responder portals use protected API sessions.
- **Backend:** FastAPI with SQLAlchemy, JWT authentication, role checks, and the existing AI SOS classification and priority scoring.
- **Database:** PostgreSQL with PostGIS for emergency and responder locations. Schema changes are supplied as repeatable SQL migrations.
- **Private files and notifications:** Administrator verification documents are stored outside frontend assets. Optional SMTP and Twilio adapters send application, assignment and SOS notifications.
- **Location handling:** Original SOS coordinates remain in PostgreSQL. An optional operator-controlled reverse-geocoding endpoint can cache addresses for authorized administrator/responder views and city/state for resolved public cards.

Citizens receive a 100-bit `RSC-XXXX-XXXX-XXXX-XXXX-XXXX` tracking code. Codes are hashed in the database. The tracking API also continues to accept previously issued URL-safe tokens. Invalid lookups are limited to 10 attempts per client per 15-minute window, followed by a 15-minute cooldown.

## Local setup

1. Install Python 3.10+ and Node.js 20+, create a PostgreSQL database named `resq_connect` with PostGIS enabled, then apply `database/schema.sql`. For an existing installation, apply these migrations in order from the repository root:
   `psql -d resq_connect -f database/migrations/20261105_admin_applications_and_sos_tracking.sql`
   `psql -d resq_connect -f database/migrations/20261107_notification_log.sql`
   `psql -d resq_connect -f database/migrations/20261107_tracking_codes_and_geocode_cache.sql`
2. Copy `.env.example` to `backend/.env` and set a private database URL and a long random `SECRET_KEY`. The API loads this file by its absolute project path, so startup works from either the repository root or `backend`. Keep it private; it is ignored by Git.
3. From the repository root, install Python dependencies and start the API:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   uvicorn main:app --app-dir backend --reload
   ```

4. In a second terminal, install frontend dependencies and start Vite:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

The frontend sends API requests to `/api`; Vite forwards those requests to `http://127.0.0.1:8000`. Set `API_PROXY_TARGET` in `frontend/.env.local` to change the development API host, or set `VITE_API_BASE_URL` when building for a deployed API. Browser geolocation requires a secure context (HTTPS) outside localhost.

## Configuration

The API requires `DATABASE_URL` and `SECRET_KEY`. `CORS_ORIGINS` is a comma-separated list of allowed browser origins and defaults to the two local Vite origins. Never commit `.env` or production credentials.

`REVERSE_GEOCODER_URL` is optional and disabled when blank. To show addresses, configure it to an operator-controlled, private Nominatim-compatible `/reverse` endpoint. The API sends the exact latitude and longitude to that configured endpoint and caches successful results. No API key is required by the compatible API. Do not configure the public `nominatim.openstreetmap.org` service for citizen SOS coordinates: those coordinates are sensitive location data, and the public service policy prohibits submitting personal or confidential data. Without a private endpoint, authorized users see the original coordinates and a clear address-unavailable fallback. Public cards never receive full addresses or coordinates.

Administrator verification documents are signature-checked and stored under `backend/.private_documents` by default, outside any frontend static directory. Set `ADMIN_DOCUMENTS_DIR` to a durable private directory with restricted filesystem permissions for deployments. The database stores random document references; document download routes require an authenticated `authority` account.

## First authority account

After configuring `backend/.env` and applying the schema/migrations, run from the repository root in PowerShell. The script refuses to run once an authority user exists and prompts for the password without echoing it:

```powershell
$env:BOOTSTRAP_AUTHORITY_NAME = "Operations Administrator"
$env:BOOTSTRAP_AUTHORITY_EMAIL = "authority@example.org"
python backend/create_admin.py
Remove-Item Env:BOOTSTRAP_AUTHORITY_NAME
Remove-Item Env:BOOTSTRAP_AUTHORITY_EMAIL
```

Use the normal administrator sign-in after the account is created. Administrator applications are pending until an existing authority reviews them. Approval creates the `authority` user account; pending or rejected applications have no login account.

## Added API endpoints

- `POST /api/auth/register-admin` — multipart administrator application submission.
- `GET /api/admin/registrations` and `GET /api/admin/registrations/{id}` — protected application review.
- `GET /api/admin/registrations/{id}/documents/{government_id|authorization_letter|organization_id}` — protected document download.
- `POST /api/admin/registrations/{id}/approve` and `/reject` — protected, single-review actions.
- `POST /api/cases/track` — public token-based case tracking; requires the unguessable tracking token, never a case ID alone.

Tracking codes are returned only by successful SOS submission, stored as SHA-256 hashes in the database, and saved in the submitting browser for return visits. A copied secure tracking link carries the credential in its URL fragment, which is not sent in HTTP requests. Legacy token links remain valid. Public resolved-case cards show only city/state when cached geocoding data exists, plus reported date, disaster type, a category-based anonymized summary, and resolved status. They never include case IDs, submitted descriptions, contact details, full addresses or coordinates.

## Optional notifications

Email uses SMTP and SMS uses Twilio's messaging API. Configure the `SMTP_*`, `TWILIO_*`, and `PUBLIC_WEB_URL` settings in `backend/.env` using provider-issued values. SMS accepts Indian mobile numbers, with ten digit numbers normalized to `+91`. Without complete provider settings the application records `not_configured` and does not claim delivery. Notification events have a durable unique key so retried actions do not send duplicates. Apply the notification migration before enabling these integrations.

## Deployment checklist

- Use HTTPS and set `PUBLIC_WEB_URL` to the deployed citizen site origin.
- Set `CORS_ORIGINS` to only the deployed frontend origins and provide production database/JWT secrets through the host's secret manager.
- Apply all three migrations before starting the API; verify PostGIS is enabled and configure automated database backups and restore checks.
- Set `ADMIN_DOCUMENTS_DIR` to durable private storage outside the frontend/static path, with restricted permissions and backup retention.
- Configure SMTP/Twilio and test with controlled accounts and numbers before enabling real notifications.
- Build the frontend with `npm run build`; serve the generated `frontend/dist` through the chosen HTTPS host/CDN.
- Start the API with a production ASGI server (for example `uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000`) behind a TLS-terminating reverse proxy.
- Review logs, database access, CORS, secret rotation, backup recovery, and provider acceptance monitoring before public launch.

## Current verification limits

The live database connection, authenticated case flows, PostGIS distance queries, and external weather feeds require PostgreSQL/PostGIS and any relevant external services. SOS submission uses the existing keyword analysis and priority score; the separate risk-analysis modules are not part of that submission flow.
