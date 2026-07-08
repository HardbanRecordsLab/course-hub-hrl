# Instalacja Backend na VPS

Kompletna instrukcja wdrożenia API HRL Course Hub na serwer VPS (Ubuntu 24.04) z PostgreSQL i Caddy jako reverse proxy.

## 1. Wymagania wstępne

- VPS z Ubuntu 24.04 (dokumentacja zakłada ten sam VPS co CMLP — `vmi3061455` / IP `84.247.162.167`)
- Dostęp SSH jako `root` lub użytkownik z `sudo`
- Domena `api.course-hub.hardbanrecordslab.online` wskazująca rekordem A na IP VPS

## 2. Instalacja Node.js 20 (przez NVM)

```bash
# jako root lub sudo
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

nvm install 20
nvm use 20
nvm alias default 20

node -v   # powinno pokazać v20.x.x
npm -v
```

## 3. Instalacja PostgreSQL 15

```bash
apt update
apt install -y postgresql postgresql-contrib

systemctl start postgresql
systemctl enable postgresql
```

### 3.1 Utworzenie bazy i użytkownika (osobne dane niż CMLP!)

```bash
sudo -u postgres psql
```

W konsoli SQL:

```sql
CREATE USER hrl_course_hub WITH PASSWORD 'WYGENERUJ_SILNE_HASLO_TUTAJ';
CREATE DATABASE hrl_course_hub OWNER hrl_course_hub;
GRANT ALL PRIVILEGES ON DATABASE hrl_course_hub TO hrl_course_hub;
\q
```

> **Ważne:** NIE używaj haseł z CMLP. Wygeneruj nowe, losowe, co najmniej 32-znakowe.

## 4. Wgranie kodu backendu

```bash
mkdir -p /opt/hrl-course-hub
cd /opt/hrl-course-hub

# jeśli repo jeszcze nie jest sklonowane
git clone https://github.com/TWOJ-USER/hrl-course-hub.git .

# przejdź do katalogu serwera
cd server

# zainstaluj zależności
npm install
```

## 5. Konfiguracja zmiennych środowiskowych

```bash
cp .env.example .env
nano .env
```

Uzupełnij plik `.env` rzeczywistymi wartościami (szczegóły w `docs/ZMIENNE-SRODOWISKOWE.md`):

```
DATABASE_URL="postgresql://hrl_course_hub:WYGENEROWANE_HASLO@127.0.0.1:5432/hrl_course_hub?schema=public"
SESSION_JWT_SECRET="wygeneruj-64-znaki-random"
STRIPE_SECRET_KEY="sk_live_TWOJ_KLUCZ"
STRIPE_WEBHOOK_SECRET="whsec_TWOJ_KLUCZ"
CORS_ORIGIN="https://app-course-hub.hardbanrecordslab.online"
FRONTEND_URL="https://app-course-hub.hardbanrecordslab.online"
PORT=3001
ADMIN_EMAIL="admin@hardbanrecordslab.online"
ADMIN_PASSWORD="SILNE_HASLO_POCZATKOWE"
```

> **Sekrety** — wygeneruj np. przez `openssl rand -hex 32` (daje 64 znaki hex).

## 6. Migracja bazy danych

```bash
npx prisma generate
npx prisma migrate deploy
```

Jeśli to pierwsze wdrożenie i nie masz jeszcze folderu `prisma/migrations/`, wykonaj:

```bash
npx prisma migrate dev --name init
```

To utworzy migrację na podstawie `prisma/schema.prisma` i zastosuje ją do bazy.

## 7. Seed konta admina

```bash
npm run db:seed
```

Skrypt `prisma/seed.ts` utworzy konto administratora (email i hasło z `.env`). Zaloguj się w panelu i jak najszybciej zmień hasło.

## 8. Budowanie i uruchomienie

### 8.1 Build produkcyjny

```bash
npm run build
```

To wygeneruje folder `dist/` z skompilowanym TypeScript.

### 8.2 Uruchomienie przez PM2

```bash
npm install -g pm2
pm2 start "node dist/server.js" --name hrl-course-hub-api
pm2 save
pm2 startup    # wykonaj wyświetlone polecenie, aby PM2 startował po restarcie
```

Sprawdź, czy działa:

```bash
pm2 status
pm2 logs hrl-course-hub-api
```

### 8.3 Alternatywnie: bezpośrednio bez PM2 (dev)

```bash
npm run dev    # tsx watch
```

## 9. Reverse proxy (Caddy)

Zakładając, że Caddy już działa na VPS (np. dla CMLP), dodaj do `Caddyfile` (albo w osobnym pliku `Caddyfile.api`):

```
api.course-hub.hardbanrecordslab.online {
    reverse_proxy 127.0.0.1:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }

    encode gzip

    log {
        output file /var/log/caddy/hrl-course-hub.log
    }
}
```

Załaduj konfigurację:

```bash
sudo systemctl reload caddy
```

Caddy **automatycznie** pobierze i odnowi certyfikat Let's Encrypt dla `api.course-hub.hardbanrecordslab.online`.

## 10. Weryfikacja działania

```bash
curl https://api.course-hub.hardbanrecordslab.online/api/health
```

Powinno zwrócić:

```json
{ "status": "ok", "timestamp": "2026-07-08T..." }
```

## 11. Redeploy po zmianach w kodzie

```bash
cd /opt/hrl-course-hub
git pull
cd server

npm install      # jeśli zmieniono package.json
npm run build    # zbuduj na nowo
npx prisma migrate deploy    # jeśli dodano migrację

pm2 restart hrl-course-hub-api
```

Sprawdź logi:

```bash
pm2 logs hrl-course-hub-api --lines 100
```

## 12. Firewall (opcjonalnie, ale zalecane)

```bash
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP (Caddy)
ufw allow 443/tcp    # HTTPS
ufw enable
```

Postgres na `127.0.0.1:5432` nie wymaga otwierania na zewnątrz — backend łączy się lokalnie.

## 13. Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---|---|
| `EADDRINUSE :::3001` | Port zajęty. Znajdź: `lsof -i :3001`, ubij proces lub zmień `PORT` w `.env`. |
| `Error: P1001 Can't reach database` | Sprawdź `DATABASE_URL`, czy PostgreSQL działa (`systemctl status postgresql`). |
| `CORS error` w przeglądarce | Sprawdź `CORS_ORIGIN` w `.env` — musi być dokładnie `https://app-course-hub.hardbanrecordslab.online`. |
| `Webhook signature verification failed` | Sprawdź `STRIPE_WEBHOOK_SECRET` w `.env` i w panelu Stripe (muszą się zgadzać). |
| Migracja nie działa | Sprawdź uprawnienia użytkownika bazy — musi mieć `CREATE` na schemacie. |

## 14. Backup bazy danych

Dodaj do crona (`crontab -e`):

```cron
0 3 * * * pg_dump -U hrl_course_hub hrl_course_hub | gzip > /opt/hrl-course-hub/backups/db-$(date +\%Y\%m\%d).sql.gz
```

Utwórz katalog:

```bash
mkdir -p /opt/hrl-course-hub/backups
```

## 15. Następne kroki

- Skonfiguruj frontend (patrz `docs/INSTALACJA-VERCEL.md`)
- Skonfiguruj Stripe (patrz `docs/STRIPE.md`)
- Utwórz pierwszy kurs w panelu admina (patrz `docs/PODRECZNIK-ADMINA.md`)
