# Res-Q Connect Database

This folder contains the PostgreSQL/PostGIS database setup for the Res-Q Connect project.

## Database

Database name:

resq_connect

Database technology:

PostgreSQL + PostGIS

## Tables

The database contains these project tables:

1. users
   - Stores responder and authority accounts.

2. sos_cases
   - Stores citizen emergency/SOS reports.

3. risk_alerts
   - Stores disaster risk alerts.

4. responders
   - Stores responder information, skills, equipment and location.

5. resources
   - Stores available rescue resources and their locations.

6. road_updates
   - Stores road and bridge condition updates.

7. case_assignments
   - Connects SOS cases with responders.

## Files

### schema.sql

Creates all project tables, location fields and spatial indexes.

### seed.sql

Adds demo data for testing:

- Demo responder
- Demo rescue boat
- Demo road update
- Demo flood-risk alert
- Demo SOS case

## Loading the database

Connect to PostgreSQL:

```sql
\c resq_connect