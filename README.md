# drkloos-smtp

Secure SMTP management and form delivery application for Hausarzt Marienheide.

The application provides:

- protected admin login with password, TOTP and WebAuthn/security keys;
- SMTP configuration management for website forms;
- encrypted SMTP credentials in the database;
- server-to-server form delivery from the website backend to this SMTP app;
- HMAC-signed form requests;
- audit logging for sensitive actions.

---

## 1. Tech stack and tested versions

The application was developed and tested with the following stack:

| Tool / Library | Version used |
|---|---|
| Node.js | 22.x |
| npm | Use the npm version bundled with Node.js 22.x. Check with `npm -v`. |
| Next.js | 16.2.1 |
| Prisma / Prisma Client | 7.6.0 |
| PostgreSQL | 18.x / tested with PostgreSQL 18.4 Docker image |
| Docker | Docker Engine with Docker Compose plugin |
| PM2 | Used for production process management |
| Nodemailer | Installed from project dependencies |
| SimpleWebAuthn | Installed from project dependencies |
| Material UI | Installed from project dependencies |

To check the actual installed versions:

```bash
node -v
npm -v
npx prisma -v
npm list next @prisma/client prisma nodemailer @simplewebauthn/server @simplewebauthn/browser
```

---

## 2. Environment variables

Create a `.env` file in the project root.

Never commit `.env` to Git.

### Local development example

Use this when opening the app locally through `http://localhost:3000` or `http://localhost:3001`.

```env
DATABASE_URL="postgres://adMLogin:YOUR_DB_PASSWORD@localhost:5432/drkloos_smtp?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0"

SHADOW_DATABASE_URL="postgres://adMLogin:YOUR_DB_PASSWORD@localhost:5432/drkloos_smtp_shadow?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0"

APP_ENCRYPTION_KEY=YOUR_64_CHAR_HEX_ENCRYPTION_KEY
SESSION_TOKEN_SECRET=YOUR_LONG_RANDOM_SESSION_SECRET

INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=VeryStrongTemporaryPassword123!

TOTP_ISSUER="drkloos root"

APP_ORIGIN=http://localhost:3000

WEBAUTHN_RP_NAME=drkloos-smtp
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000

PUBLIC_FORM_API_KEY=YOUR_LONG_SHARED_FORM_SECRET
```

If the app runs on port `3001`, update:

```env
APP_ORIGIN=http://localhost:3001
WEBAUTHN_ORIGIN=http://localhost:3001
```

### Production example

Use this when the app is opened through the production domain.

```env
DATABASE_URL="postgres://adMLogin:YOUR_DB_PASSWORD@127.0.0.1:5432/drkloos_smtp?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0"

SHADOW_DATABASE_URL="postgres://adMLogin:YOUR_DB_PASSWORD@127.0.0.1:5432/drkloos_smtp_shadow?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0"

APP_ENCRYPTION_KEY=YOUR_64_CHAR_HEX_ENCRYPTION_KEY
SESSION_TOKEN_SECRET=YOUR_LONG_RANDOM_SESSION_SECRET

INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=VeryStrongTemporaryPassword123!

TOTP_ISSUER="drkloos root"

APP_ORIGIN=https://ops.hausarzt-marienheide.de

WEBAUTHN_RP_NAME=drkloos-smtp
WEBAUTHN_RP_ID=ops.hausarzt-marienheide.de
WEBAUTHN_ORIGIN=https://ops.hausarzt-marienheide.de

PUBLIC_FORM_API_KEY=YOUR_LONG_SHARED_FORM_SECRET
```

Important:

- `APP_ORIGIN` must be the external URL used in the browser.
- `WEBAUTHN_RP_ID` must be the production domain without protocol.
- `WEBAUTHN_ORIGIN` must be the full production origin with `https://`.
- WebAuthn keys registered for `localhost` will not work on the production domain.
- After changing WebAuthn domain settings, security keys must be registered again for the new domain.

---

## 3. Website app environment variables

The public website does not send emails directly.

The flow is:

```txt
Frontend form -> website backend API -> SMTP app API -> verification -> email sending
```

The website project needs its own `.env`:

### Website local development

```env
SMTP_APP_URL=http://localhost:3001
SMTP_APP_FORM_API_KEY=YOUR_LONG_SHARED_FORM_SECRET
```

### Website production

```env
SMTP_APP_URL=https://ops.hausarzt-marienheide.de
SMTP_APP_FORM_API_KEY=YOUR_LONG_SHARED_FORM_SECRET
```

`SMTP_APP_FORM_API_KEY` on the website must match `PUBLIC_FORM_API_KEY` in the SMTP app.

---

## 4. Local development setup

### 4.1 Install dependencies

```bash
npm install
```

### 4.2 Start PostgreSQL with Docker

Example `docker-compose.yml` for PostgreSQL 18:

```yaml
services:
  postgres:
    image: postgres:18
    container_name: drkloos-smtp-postgres
    restart: unless-stopped

    environment:
      POSTGRES_DB: drkloos_smtp
      POSTGRES_USER: adMLogin
      POSTGRES_PASSWORD: YOUR_DB_PASSWORD

    ports:
      - "127.0.0.1:5432:5432"

    volumes:
      - postgres_data:/var/lib/postgresql

volumes:
  postgres_data:
```

Start the database:

```bash
docker compose up -d
```

### 4.3 Create the shadow database

```bash
docker exec -it drkloos-smtp-postgres psql -U "adMLogin" -d postgres
```

Inside `psql`:

```sql
CREATE DATABASE drkloos_smtp_shadow OWNER "adMLogin";
\l
\q
```

### 4.4 Generate Prisma Client

```bash
npx prisma generate
```

### 4.5 Apply database migrations

For an existing project with migrations:

```bash
npx prisma migrate deploy
```

For local development only, if migrations are not ready yet:

```bash
npx prisma db push
```

Production should use `migrate deploy`, not `db push`.

### 4.6 Run the app locally

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

If port `3000` is busy, Next.js may use `3001`. In that case update `APP_ORIGIN` and `WEBAUTHN_ORIGIN` in `.env`.

---

## 5. Production deployment from scratch

### 5.1 Prepare the server

Install Node.js 22.x, npm, Docker, Docker Compose plugin and PM2.

Example:

```bash
npm install -g pm2
```

### 5.2 Clone the repository

```bash
git clone <repository-url> drkloos-smtp
cd drkloos-smtp
```

### 5.3 Create `.env`

Create the production `.env` file in the project root.

Use the production environment example from this README.

### 5.4 Start PostgreSQL

Create PostgreSQL Docker Compose configuration as shown above.

Start it:

```bash
docker compose up -d
```

Check logs:

```bash
docker logs drkloos-smtp-postgres --tail=50
```

Expected message:

```txt
database system is ready to accept connections
```

### 5.5 Create shadow database

```bash
docker exec -it drkloos-smtp-postgres psql -U "adMLogin" -d postgres
```

```sql
CREATE DATABASE drkloos_smtp_shadow OWNER "adMLogin";
\q
```

### 5.6 Install dependencies

```bash
npm install
```

### 5.7 Generate Prisma Client

```bash
npx prisma generate
```

### 5.8 Apply Prisma migrations

```bash
npx prisma migrate deploy
```

### 5.9 Build the app

```bash
npm run build
```

### 5.10 Start with PM2

If the app should run on port `3001` behind Nginx:

```bash
PORT=3001 pm2 start npm --name drkloos-smtp -- start
```

Save PM2 process list:

```bash
pm2 save
pm2 startup
```

After code or env changes:

```bash
npm run build
pm2 restart drkloos-smtp --update-env
```

---

## 6. Nginx production example

Example reverse proxy for:

```txt
https://ops.hausarzt-marienheide.de -> http://127.0.0.1:3001
```

```nginx
server {
    listen 80;
    server_name ops.hausarzt-marienheide.de;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ops.hausarzt-marienheide.de;

    ssl_certificate /etc/letsencrypt/live/ops.hausarzt-marienheide.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ops.hausarzt-marienheide.de/privkey.pem;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_buffering off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

Check and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Prisma migration commands

Generate Prisma client:

```bash
npx prisma generate
```

Create a new migration during development:

```bash
npx prisma migrate dev --name migration_name
```

Deploy migrations in production:

```bash
npx prisma migrate deploy
```

Open Prisma Studio locally or on a protected environment:

```bash
npx prisma studio
```

Do not use `prisma migrate dev` in production.

---

## 8. Initial application registration

When the database is empty:

1. Open the app URL.
2. The app redirects to initial setup.
3. Create the first admin account.
4. Configure TOTP in an authenticator app.
5. Register the required WebAuthn/security keys.
6. Log in with password, TOTP and security key.
7. Configure SMTP settings in the admin area.

---

## 9. SMTP configuration

The app stores SMTP settings in the database.

Each form has its own SMTP configuration:

- `CAREER`
- `CONTACTS`
- `NEWRECIPE`
- `CONTACTS_POPUP`

Recommended IONOS settings:

```txt
Host: smtp.ionos.de
Port: 587
Security: STARTTLS
```

or:

```txt
Host: smtp.ionos.de
Port: 465
Security: SSL/TLS
```

SMTP passwords and recipients are encrypted before being stored in the database.

If SMTP values are changed in production and the app still uses old values, restart PM2:

```bash
pm2 restart drkloos-smtp --update-env
```

If the app implementation does not cache mail transporters, changes should apply immediately.

---

## 10. Website form delivery security

Website forms must not send email directly.

Correct flow:

```txt
Website browser
  -> website backend route
  -> SMTP app /api/forms/* route
  -> HMAC verification
  -> SMTP sending
```

The website backend signs every request using:

- `x-form-api-key`
- `x-form-source`
- `x-form-timestamp`
- `x-form-nonce`
- `x-form-signature`

The SMTP app verifies:

- API key;
- request source;
- timestamp;
- nonce;
- HMAC signature over the raw request body.

For production:

```txt
x-form-source = website-production
```

For development:

```txt
x-form-source = website-development
```

---

## 11. Access recovery / loss of admin access

If all admin access is lost, for example:

- password is lost;
- TOTP device is lost;
- all WebAuthn/security keys are lost;
- login is no longer possible;

then the simplest recovery method is to reset the application database state and perform initial registration again.

Warning: this removes admin users, sessions, TOTP records, WebAuthn credentials, audit logs, throttling records and SMTP configuration. Back up important data first if needed.

### Full reset option

Connect to PostgreSQL:

```bash
docker exec -it drkloos-smtp-postgres psql -U "adMLogin" -d drkloos_smtp
```

Then run:

```sql
TRUNCATE TABLE
  "AdminWebAuthnChallenge",
  "AdminWebAuthnCredential",
  "AdminTotp",
  "AdminSession",
  "AuditLog",
  "LoginThrottle",
  "SmtpConfig",
  "AdminUser"
RESTART IDENTITY CASCADE;
```

Exit:

```sql
\q
```

Restart the app:

```bash
pm2 restart drkloos-smtp --update-env
```

Open the app again and complete registration from the beginning.

### Safer partial reset option

If SMTP configuration should be preserved, do not truncate `SmtpConfig`:

```sql
TRUNCATE TABLE
  "AdminWebAuthnChallenge",
  "AdminWebAuthnCredential",
  "AdminTotp",
  "AdminSession",
  "AuditLog",
  "LoginThrottle",
  "AdminUser"
RESTART IDENTITY CASCADE;
```

Then restart the app and register the admin account again.

---

## 12. Useful commands

### Check PM2 processes

```bash
pm2 list
pm2 logs drkloos-smtp --lines 100
pm2 restart drkloos-smtp --update-env
```

### Check PostgreSQL container

```bash
docker ps
docker logs drkloos-smtp-postgres --tail=100
```

### Open database shell

```bash
docker exec -it drkloos-smtp-postgres psql -U "adMLogin" -d drkloos_smtp
```

### List tables

```sql
\dt
```

### List SMTP configuration

```sql
SELECT "key", "smtpHost", "smtpPort", "smtpUser", "updatedAt"
FROM "SmtpConfig"
ORDER BY "key";
```

---

## 13. Security notes

- Never expose `.env` or commit it to Git.
- Use long random values for `APP_ENCRYPTION_KEY`, `SESSION_TOKEN_SECRET` and `PUBLIC_FORM_API_KEY`.
- Keep the SMTP app behind HTTPS.
- Use production WebAuthn settings only with the final production domain.
- Do not reuse localhost WebAuthn keys in production.
- Do not log form body, patient data, SMTP passwords or TOTP secrets.
- Back up the PostgreSQL Docker volume before server migrations.

