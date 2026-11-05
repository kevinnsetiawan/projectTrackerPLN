# Production contracts

## Auth config

`GET /api/auth/config` is public and returns JSON `{ "registrationOpen": boolean }`.

`POST /api/auth/register` returns HTTP 403 with a safe message when `REGISTRATION_OPEN=0`; it must not create a user. Non-production defaults preserve the existing development behavior.

## Runtime

Only `10.99.9.21:8080` (Nginx on the VM) is tunnel-facing. PostgreSQL listens on the Compose network only. `/api/events/stream` must use `proxy_buffering off` and HTTP/1.1 proxying.

## Data and backup

PostgreSQL is the source of truth. Base64 data URLs stay in existing TEXT columns. Backups use `pg_dump -Fc`; restore is always into an isolated database/service before any production action.
