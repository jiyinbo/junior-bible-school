# Deploying the Laravel API (`api/`) on SiteGround

## Requirements

- PHP **8.3+** with extensions: **openssl**, **pdo_mysql**, **mbstring**, **tokenizer**, **json**, **ctype**, **fileinfo**. Use **Site Tools → PHP Manager** for your API subdomain (not only the main domain). **PHP 7.x will not run Laravel 13.**
- **`composer.json`** sets **`config.platform.php`** to **8.3.28** so Composer resolves **Symfony 7** (PHP 8.3–compatible). Without that pin, Composer may pull **Symfony 8**, which requires **PHP ≥ 8.4** and triggers “Your Composer dependencies require a PHP version >= 8.4.0” on PHP 8.3 hosts.
- Composer locally or over SSH.

## Running commands on SiteGround (SSH)

1. **Site Tools** → **Devs** → **SSH** — enable SSH and note **host**, **user**, **port** (often **18765**).
2. Connect: `ssh -p PORT USER@HOST`
3. `cd` to the folder that contains **`artisan`** (your **`api`** directory).
4. Run **`php artisan …`**, **`composer install …`**, etc. If **`composer`** is missing, use **`php composer.phar`** or SiteGround’s documented PHP/Composer paths.

## Prepare on your Mac (then upload)

Production-style **`vendor/`** (no dev packages):

```bash
cd api
composer run siteground-vendor
```

If **`composer`** is not installed: `brew install composer`, or download **`composer.phar`** and run **`php composer.phar run siteground-vendor`**.

Then upload **`api/`** (including **`vendor/`**) and copy **`api/public/*`** into **`public_html/`**. For local development afterward, run **`composer install`** again (with dev dependencies).

## Database

1. Create MySQL DB/user in Site Tools.
2. Set **`DB_*`** in **`api/.env`**.
3. From **`api/`** on the server: **`php artisan migrate --force`**.

## Upload checklist

| Where on the server | What to put there |
|---------------------|-------------------|
| **`api/`** (next to **`public_html`**) | Full Laravel app: **`app/`**, **`bootstrap/`**, **`config/`**, **`database/`**, **`public/`**, **`routes/`**, **`storage/`**, **`vendor/`**, **`artisan`**, **`composer.json`**, **`composer.lock`**, **`.env`**. |
| **`public_html/`** | Only the **contents** of **`api/public/`** (`index.php`, `.htaccess`, …) — **not** nested as **`public_html/public/`**. |

1. Upload **`api/`** (or build **`vendor`** on server via Composer).
2. Copy **`api/public/*`** → **`public_html/`**.
3. Remove host placeholders (e.g. **`Default.html`**) from **`public_html`**.
4. **`.env`** lives only under **`api/`**, never in **`public_html`**.

`public/index.php` supports both local layout and SiteGround (**`public_html`** + sibling **`api/`**).

### Installing `vendor` without uploading thousands of files

1. **SSH:** `cd …/api && composer install --no-dev --optimize-autoloader`
2. **Zip:** locally run **`composer install --no-dev`**, **`zip -r vendor.zip vendor`**, upload **`vendor.zip`**, unzip on server.
3. **SFTP** (FileZilla, etc.) instead of the browser file manager.

### If `/up` returns **500**

1. **`api/vendor/autoload.php`** must exist.
2. **`APP_KEY`** set: **`php artisan key:generate --force`**
3. **`storage/`** and **`bootstrap/cache/`** writable.
4. **`storage/logs/laravel.log`** or SiteGround error log.
5. **Dev-only providers:** use **`composer.json`** (**`dont-discover`** for Pail/Pao/Collision), **`bootstrap/providers.php`**, and **`composer run siteground-vendor`** before upload; or delete **`bootstrap/cache/packages.php`** / **`services.php`** on the server and run **`php artisan optimize:clear`**.

## Environment

Use **`.env.siteground.example`** → **`.env`** in **`api/`**. Run **`php artisan key:generate --force`** once on the server.

### Database (`.env`)

| Variable | Typical SiteGround value |
|----------|---------------------------|
| **`DB_CONNECTION`** | **`mysql`** |
| **`DB_HOST`** | **`localhost`** (or value from Site Tools) |
| **`DB_PORT`** | **`3306`** |
| **`DB_DATABASE`** / **`DB_USERNAME`** / **`DB_PASSWORD`** | From MySQL manager |

### Email (Microsoft 365 SMTP)

Registration confirmations are sent via Laravel mail. Configure these in **`api/.env`** (see **`.env.siteground.example`**):

| Variable | Value |
|----------|--------|
| **`MAIL_MAILER`** | **`smtp`** |
| **`MAIL_SCHEME`** | **`smtp`** (STARTTLS on port 587; not `tls`) |
| **`MAIL_HOST`** | **`smtp.office365.com`** |
| **`MAIL_PORT`** | **`587`** |
| **`MAIL_USERNAME`** | Dedicated M365 mailbox (e.g. `jbs-noreply@yourdomain.org.uk`) |
| **`MAIL_PASSWORD`** | Mailbox password or app password |
| **`MAIL_FROM_ADDRESS`** | Same as **`MAIL_USERNAME`** |
| **`MAIL_FROM_NAME`** | **`${APP_NAME}`** |

IT must enable **SMTP AUTH** on the sender mailbox. After changing mail settings, run **`php artisan config:cache`** (optional) and test by submitting a registration.

### Verify

- **`GET /up`** — Laravel health.
- **`GET /api/v1/health`** — plain-text API health.

## Frontend (`app/`)

Build the React app locally (`cd app && npm run build`), then deploy the **`dist/`** output to SiteGround (subdomain **`public_html`**, subdirectory, or a separate static site), and point API calls at your API hostname. Same pattern as Worship Watcher: API on one host, SPA on another or in a subfolder.

**SPA routing:** Vite copies **`app/public/.htaccess`** into **`dist/.htaccess`** on build. Upload it with the rest of `dist/`. Without it, direct URLs and full page loads (e.g. `/staff/login` after logout) return SiteGround’s 404 page. If the site is in a subfolder, edit **`RewriteBase`** in `.htaccess` (e.g. `RewriteBase /jbs/`).

---

## End-to-end deployment (API) — checklist

### 1. Site Tools before upload

- Create or choose the **API subdomain** (e.g. `api.yourdomain.org`) and note its **document root** (usually `public_html` for that subdomain).
- **PHP Manager** for that host: **PHP 8.3+** (required for Laravel 13). Enable extensions: **openssl**, **pdo_mysql**, **mbstring**, **tokenizer**, **json**, **ctype**, **fileinfo**.
- **MySQL**: create database + user; record host (often **`localhost`**), database name, username, password.
- **SSH**: enable it for running `artisan`, `composer`, and fixing permissions.

### 2. Prepare `vendor/` (choose one)

**Locally** (then upload `vendor/`):

```bash
cd api
composer run siteground-vendor
```

**On the server** (upload code without `vendor`, then):

```bash
cd path/to/api
composer install --no-dev --optimize-autoloader
```

### 3. Upload layout

| Server path | Content |
|-------------|---------|
| **Sibling of** `public_html` | Full **`api/`** tree including **`vendor/`**, **`artisan`**, **`.env`** |
| **`public_html/`** (web root for the API subdomain) | **Only** the contents of **`api/public/`** (`index.php`, `.htaccess`) |

Remove default placeholder pages from `public_html` if they interfere.

### 4. Configure `api/.env` on the server

Copy **`.env.siteground.example`** → **`.env`** and set:

- **`APP_URL=https://your-api-host`** (exact HTTPS URL of this subdomain)
- **`APP_ENV=production`**, **`APP_DEBUG=false`**
- **`DB_DATABASE`**, **`DB_USERNAME`**, **`DB_PASSWORD`**, **`DB_HOST`** (usually `localhost`)

Never place `.env` under `public_html`.

### 5. SSH: finalize

```bash
cd path/to/api
php artisan key:generate --force
php artisan migrate --force
chmod -R ug+rwx storage bootstrap/cache
```

(Optional after `.env` is correct: `php artisan config:cache`.)

### 6. Test that deployment works

Replace `https://api.example.org` with your real API base URL.

**Laravel health**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "https://api.example.org/up"
```

Expect **`200`**.

**API health (this project)**

```bash
curl -sS "https://api.example.org/api/v1/health"
```

Expect response body: **`Junior Bible School API OK`**.

**Login (optional)**

```bash
curl -sS -X POST "https://api.example.org/api/v1/auth/login" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
```

Expect JSON containing **`token`** and **`user`** with **`role`**.

**Browser**

- Open `https://api.example.org/up` — should not be HTTP 500.
- Open `https://api.example.org/api/v1/health` — should show the OK message.

If **`/up`** is **500**, check **`api/storage/logs/laravel.log`**, **`APP_KEY`**, **`vendor/`**, and permissions on **`storage/`** and **`bootstrap/cache/`**. If **`/up`** works but **`/api/v1/health`** is **404**, URL rewriting may be wrong (ensure `public_html` contains Laravel’s `index.php` and `.htaccess`).

---
