# HRL Course Hub — Kompletna Biblia Platformy

## Access & Certification Manager dla kursów zewnętrznych

**Wersja:** 0.1.0
**Data:** 2026-07-08
**Status:** DOKUMENT PLANISTYCZNY — architektura zaprojektowana, wdrożenie na VPS jeszcze nie wykonane. Wypełniaj sekcje oznaczone `[DO UZUPEŁNIENIA PO WDROŻENIU]` rzeczywistymi wartościami w miarę postępu prac, tak jak robi to `CMLP_WordPress_Bible_2026.md` dla CMLP.
**VPS:** 84.247.162.167 | Hostname: `vmi3061455` (ten sam VPS co CMLP — nowa usługa dokłada się do istniejącej infrastruktury, nie zastępuje jej)

> ⚠️ **Do zweryfikowania przed startem prac**: w `CMLP_WordPress_Bible_2026.md` (sekcja 1.1) figuruje już wpis `course-hub.hardbanrecordslab.online → Course Hub → Academy API → port 9104 → ✅ Aktywna`. Zanim zaczniesz wdrożenie wg tej biblii, sprawdź na VPS czym dokładnie jest ta istniejąca usługa (stary prototyp? inny projekt o tej samej nazwie?) i czy port 9104 jest wolny, czy zajęty. Domeny docelowe HRL Course Hub w tym dokumencie (`app-course-hub.` i `api.course-hub.`) są innym zestawem niż istniejący wpis — nie zakładaj, że to ta sama usługa.

---

## SPIS TREŚCI

1. [Domeny i konfiguracja DNS](#1-domeny-i-konfiguracja-dns)
2. [Credentials i zmienne środowiskowe](#2-credentials-i-zmienne-środowiskowe)
3. [Architektura systemu](#3-architektura-systemu)
4. [Baza danych (PostgreSQL + Prisma)](#4-baza-danych-postgresql--prisma)
5. [Backend API (Express + TypeScript)](#5-backend-api-express--typescript)
6. [Frontend (React + Vite + Vercel)](#6-frontend-react--vite--vercel)
7. [Integracja z hostami kursów (wielodomenowość)](#7-integracja-z-hostami-kursów-wielodomenowość)
8. [Płatności — Stripe jednorazowe](#8-płatności--stripe-jednorazowe)
9. [Certyfikaty](#9-certyfikaty)
10. [Monitoring i bezpieczeństwo](#10-monitoring-i-bezpieczeństwo)
11. [Model biznesowy](#11-model-biznesowy)
12. [Procedury wdrożeniowe i awaryjne](#12-procedury-wdrożeniowe-i-awaryjne)
13. [Pełna tabela zmiennych środowiskowych](#13-pełna-tabela-zmiennych-środowiskowych)
14. [Webhook Events Reference](#14-webhook-events-reference)
15. [API Error Codes](#15-api-error-codes)
16. [Struktura katalogów (VPS)](#16-struktura-katalogów-vps)

---

## 1. DOMENY I KONFIGURACJA DNS

### 1.1 Mapa Domen (stan docelowy)

| Subdomena                                | Typ                | Cel                              | Port  | Status                       |
| ----------------------------------------- | ------------------ | --------------------------------- | ----- | ----------------------------- |
| `app-course-hub.hardbanrecordslab.online` | Frontend           | Vercel (React SPA, panel + portal) | —     | `[DO UZUPEŁNIENIA]`           |
| `api.course-hub.hardbanrecordslab.online` | Backend API        | Express API (VPS)                 | `[X]` | `[DO UZUPEŁNIENIA]`           |

Port backendu do ustalenia przy wdrożeniu — wybierz wolny port z puli już zajętej przez inne usługi HRL na tym VPS (patrz `CMLP_WordPress_Bible_2026.md` sekcja 1.4 — porty 3000, 3006, 3007, 8888, 9000, 9104, 9107, 9108, 9109 są już zajęte; nie koliduj).

### 1.2 Konfiguracja DNS (Cloudflare / DNS Provider)

```
app-course-hub.hardbanrecordslab.online.  CNAME  cname.vercel-dns.com
api.course-hub.hardbanrecordslab.online.  A      84.247.162.167
```

### 1.3 Nginx Upstream (VPS)

```
course_hub_hrl_backend  → 127.0.0.1:[PORT]  (HRL Course Hub API)
```

Dopisz do istniejącej konfiguracji Nginx na VPS — nie twórz osobnego serwera nginx, dokładasz kolejny `server {}` blok / upstream obok istniejących (CMLP, Access Manager itd.), zgodnie z konwencją opisaną w biblii CMLP sekcja 1.3.

### 1.4 Uwaga o współdzieleniu VPS

Ten sam VPS hostuje już: CMLP (port 3000), WordPress (3006), Admin Panel (3007), Metadata Engine (8888), AzuraCast (9000), Course Hub / Academy API — stary (9104), Access Manager / SSO (9107), Sync Hub (9108), AI Publish (9109). HRL Course Hub **dokłada się** jako kolejna, niezależna usługa — osobny kontener/proces Postgres i Node, osobny port, osobna baza danych. Nie dziel bazy danych z CMLP.

---

## 2. CREDENTIALS I ZMIENNE ŚRODOWISKOWE

### 2.1 VPS

| Parametr     | Wartość             |
| ------------ | -------------------- |
| **IP**       | `84.247.162.167`     |
| **Hostname** | `vmi3061455`          |
| **OS**       | Ubuntu 24.04          |
| **SSH Key**  | `~/.ssh/id_ed25519`    |
| **User**     | `root`                |

(Ten sam VPS co CMLP — patrz `CMLP_WordPress_Bible_2026.md` sekcja 2.1 dla pełnych parametrów sprzętowych.)

### 2.2 PostgreSQL (HRL Course Hub — osobna baza)

| Parametr      | Wartość                                            |
| ------------- | --------------------------------------------------- |
| **Host**      | `127.0.0.1` (localhost, dostęp tylko z backendu)     |
| **Port**      | `[DO USTALENIA — nie kolidować z 5432/5433]`         |
| **User**      | `[DO UZUPEŁNIENIA]`                                  |
| **Password**  | `[DO UZUPEŁNIENIA — wygenerować losowo, nie używać haseł z CMLP]` |
| **Database**  | `hrl_course_hub`                                      |
| **Container/Instalacja** | `[DO UZUPEŁNIENIA — Docker czy natywny Postgres]` |

### 2.3 Sekrety JWT (dwa różne, nigdy nie mylić)

| Zmienna                | Wartość        | Zastosowanie                                                  |
| ----------------------- | -------------- | ---------------------------------------------------------------- |
| `SESSION_JWT_SECRET`    | `[WYGENEROWAĆ]` | Podpisywanie sesji zalogowanego użytkownika (admin/student)      |
| `COURSE_LINK_JWT_SECRET_<course_id>` | `[WYGENEROWAĆ PER KURS]` | Podpisywanie linków dostępowych do treści kursu na zewnętrznej domenie — **osobny sekret dla każdego kursu**, przechowywany zahaszowany w tabeli `Course` (`integrationSecretHash`) |

### 2.4 Stripe

| Parametr           | Wartość                                                         |
| ------------------- | ----------------------------------------------------------------- |
| **Secret Key**      | `[DO UZUPEŁNIENIA — sk_live_... po przełączeniu z trybu testowego]` |
| **Publishable Key** | `[DO UZUPEŁNIENIA — pk_live_..., trafia też do frontendu]`         |
| **Webhook Secret**  | `[DO UZUPEŁNIENIA — whsec_...]`                                    |
| **Mode**            | `Test` do czasu pierwszego wdrożenia produkcyjnego, potem `Live`   |
| **Webhook URL**      | `https://api.course-hub.hardbanrecordslab.online/api/webhooks/stripe` |
| **Checkout mode**    | **`payment` ZAWSZE** — nigdy `subscription`. Zero cyklicznych opłat w tym produkcie. |
| **Events**           | `checkout.session.completed`, opcjonalnie `charge.refunded`        |

Można użyć tego samego konta Stripe co CMLP (patrz `CMLP_WordPress_Bible_2026.md` sekcja 2.5) z osobnym produktem/kluczami restricted, albo osobnego konta — decyzja do podjęcia przy wdrożeniu; w każdym razie webhook musi wskazywać na endpoint HRL Course Hub, nie na endpoint CMLP.

### 2.5 Vercel (Frontend)

| Parametr      | Wartość                                                    |
| -------------- | ------------------------------------------------------------- |
| **Domena**     | `app-course-hub.hardbanrecordslab.online`                      |
| **Zmienna**    | `VITE_API_BASE_URL=https://api.course-hub.hardbanrecordslab.online` |
| **Zmienna**    | `VITE_STRIPE_PUBLISHABLE_KEY=[pk_live_...]`                    |

### 2.6 GitHub

| Parametr   | Wartość                                    |
| ----------- | -------------------------------------------- |
| **Repo**    | `[DO UZUPEŁNIENIA]`                          |
| **Branch**  | `main`                                        |
| **CI/CD**   | `[DO UZUPEŁNIENIA — GitHub Actions czy ręczny deploy]` |

---

## 3. ARCHITEKTURA SYSTEMU

### 3.1 Diagram Warstw

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                         │
│  app-course-hub.hardbanrecordslab.online                     │
│  React + Vite + Tailwind + shadcn/ui                         │
│  Panel Admina | Portal Ucznia | Publiczna weryfikacja cert.  │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS (fetch/axios, CORS)
┌─────────────────────▼───────────────────────────────────────┐
│               NGINX (VPS 84.247.162.167)                     │
│  Reverse proxy | SSL termination | CORS pass-through          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│           BACKEND (Express + TypeScript, VPS)                │
│                                                              │
│  Routes → Middleware (requireAuth/requireAdmin) → Controllers│
│                        │                                     │
│      ┌─────────────────┼─────────────────┐                  │
│      ▼                 ▼                 ▼                  │
│  Auth (JWT)     Stripe Checkout    Link Generator (JWT)      │
│  bcrypt          + Webhook          per-kurs sekret          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                 ┌────▼────┐
                 │PostgreSQL│  (Prisma ORM)
                 │ (VPS)    │
                 └──────────┘

Zewnętrzne hosty kursów (WordPress / Cloudflare Worker / własna appka)
weryfikują JWT-link LOKALNIE, bez synchronicznego zapytania do VPS.
```

### 3.2 Podział odpowiedzialności (skąd co pochodzi)

| Warstwa   | Bazowany na repo         | Uwagi                                                            |
| ---------- | -------------------------- | -------------------------------------------------------------------- |
| Backend    | `course-hub` (Express+Prisma) | Przycięty wg instrukcji budowy — bez treści/lekcji/quizów, bez subskrypcji |
| Frontend   | `plugin-hub-builder` (React/Vite/shadcn) | Warstwa Supabase usunięta, podmieniona na REST wobec backendu VPS |

### 3.3 Proces backendu (VPS)

`[DO UZUPEŁNIENIA PO WDROŻENIU]` — PM2 czy Docker, ile instancji, nazwa procesu w `pm2 list` / `docker ps`.

---

## 4. BAZA DANYCH (PostgreSQL + Prisma)

### 4.1 Model danych

```
User          — użytkownicy (role: ADMIN, STUDENT)
Course        — metadane kursu: tytuł, opis, externalUrl, cena, integrationSecretHash,
                certificateEnabled, certificateIssueMode ('manual' | 'on_purchase')
Enrollment    — dostęp user × course, expiresAt (NULL = bezterminowo), completedAt
Order         — zamówienie (jednorazowe)
OrderItem     — pozycja zamówienia
Certificate   — wystawiony certyfikat: verificationCode (unikalny), studentDisplayName,
                courseTitleSnapshot, issuedAt, issuedByUserId (NULL = automatycznie), revokedAt
AccessLog     — log audytowy: action ('granted'|'revoked'|'link_generated'|'link_used'|
                'certificate_issued'), meta (JSON), createdAt
```

Świadomie **brak** tabel: `Lesson`, `Module`, `Quiz`, `StudentProfile` (streaki/postęp nauki), `Price.type` z wartością subskrypcyjną — to są rzeczy wycięte względem `course-hub`, żeby nie odtworzyć zakresu LMS.

### 4.2 Migracje

```bash
npx prisma migrate dev      # lokalnie, tworzy nową migrację
npx prisma migrate deploy   # na VPS, aplikuje migracje produkcyjnie
npx prisma studio           # podgląd bazy w przeglądarce
```

### 4.3 Backup

`[DO UZUPEŁNIENIA PO WDROŻENIU]` — analogicznie do CMLP (`pg_dump` → gzip → cron), patrz `CMLP_WordPress_Bible_2026.md` sekcja 2.17 jako wzorzec do skopiowania pod nową bazę `hrl_course_hub`.

---

## 5. BACKEND API (Express + TypeScript)

### 5.1 Endpointy

#### Health
- `GET /api/health`

#### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`

#### Kursy (admin)
- `GET /api/courses`
- `POST /api/courses`
- `PATCH /api/courses/:id`

#### Dostępy (admin)
- `GET /api/access`
- `POST /api/access`
- `DELETE /api/access/:id`
- `PATCH /api/access/:id/complete` — oznaczenie ukończenia, wystawia certyfikat gdy tryb `manual`
- `POST /api/access/:id/generate-link` — generuje podpisany JWT-link do treści kursu

#### Płatności
- `POST /api/checkout` — Stripe Checkout Session, **zawsze `mode: "payment"`**
- `POST /api/webhooks/stripe` — publiczny, weryfikuje podpis Stripe

#### Certyfikaty
- `GET /api/certificates` (admin)
- `GET /api/certificates/mine` (student)
- `GET /api/certificates/verify/:code` — **publiczny, bez auth**, zwraca tylko: imię, tytuł kursu, data, `isValid`

#### Logi
- `GET /api/logs` (admin)

### 5.2 Middleware

| Middleware       | Opis                                                    |
| ------------------ | ---------------------------------------------------------- |
| `requireAuth`      | Weryfikacja `SESSION_JWT_SECRET` z nagłówka `Authorization` |
| `requireAdmin`      | Sprawdza `role === 'ADMIN'`                                 |
| `corsMiddleware`    | Ogranicza do `https://app-course-hub.hardbanrecordslab.online` |
| `stripeWebhookRaw`  | Raw body parser tylko dla `/api/webhooks/stripe` (Stripe wymaga surowego body do weryfikacji podpisu) |

### 5.3 Rate limiting

`[DO UZUPEŁNIENIA PO WDROŻENIU]` — rozważyć analogicznie do CMLP: osobny, niższy limit na `/api/auth/*`, wyższy na resztę `/api/*`.

---

## 6. FRONTEND (React + Vite + Vercel)

### 6.1 Stack technologiczny

| Technologia   | Zastosowanie              |
| -------------- | ---------------------------- |
| React 18       | Framework UI                  |
| Vite            | Build tool                    |
| Tailwind CSS    | Styling                       |
| shadcn/ui       | Komponenty UI                 |
| TypeScript      | Type safety                   |
| React Router    | Routing                       |
| fetch/axios     | Wywołania REST do API na VPS  |
| jsPDF + html2canvas | Generowanie certyfikatów PDF (w przeglądarce) |

### 6.2 Struktura stron

```
src/pages/
├── LoginPage.tsx
├── RegisterPage.tsx
├── Dashboard.tsx            (admin)
├── Courses.tsx               (admin — CRUD metadanych kursu)
├── AccessPage.tsx            (admin — nadawanie/odbieranie dostępu, generowanie linków,
│                               oznaczanie ukończenia)
├── CertificatesPage.tsx      (admin — lista i zarządzanie certyfikatami)
├── UsersPage.tsx              (admin)
├── ActivityPage.tsx           (admin — log audytowy)
├── SettingsPage.tsx
├── StudentPortal.tsx          (student — lista dostępnych kursów, pobieranie certyfikatów)
└── VerifyCertificatePage.tsx  (PUBLICZNA, bez auth, route /verify/:code)
```

### 6.3 Deployment (Vercel)

```bash
vercel link
vercel env add VITE_API_BASE_URL production https://api.course-hub.hardbanrecordslab.online
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production pk_live_...
vercel --prod
```

---

## 7. INTEGRACJA Z HOSTAMI KURSÓW (WIELODOMENOWOŚĆ)

### 7.1 Zasada działania

HRL Course Hub **nie hostuje treści kursu**. Kurs mieszka pod dowolną zewnętrzną domeną (WordPress, własna appka, Notion/Drive/Vimeo za prostym gatem). HRL Course Hub generuje podpisany JWT, host kursu weryfikuje go **lokalnie**, bez synchronicznego zapytania zwrotnego do VPS — dzięki temu dostępność kursu nie zależy od dostępności HRL Course Hub.

### 7.2 Przepływ

```
1. Student loguje się w HRL Course Hub → sesja (SESSION_JWT_SECRET)
2. Student klika "Wejdź do kursu" w portalu ucznia
3. Frontend woła POST /api/access/:id/generate-link
4. Backend: sprawdza aktywny Enrollment, podpisuje payload
   { v, iss: "hrl-course-hub", sub: userId, aud: courseId, iat, exp, jti, email }
   sekretem integrationSecretHash TEGO KURSU (HS256)
5. Backend zwraca {course_url}?ch_token={jwt}, loguje 'link_generated'
6. Student trafia na zewnętrzną domenę z tokenem w query stringu
7. Weryfikator na hoście kursu (patrz 7.3) sprawdza podpis + exp lokalnie
8. Jeśli ważny → wpuszcza; jeśli nie → przekierowuje z powrotem do HRL Course Hub
```

### 7.3 Gotowe wzorce weryfikatorów (`docs/verifiers/`)

| Plik                     | Dla                          | Rozmiar   |
| -------------------------- | ------------------------------- | ----------- |
| `cloudflare-worker.ts`     | Domena za Cloudflare              | ~50 linii    |
| `wordpress-plugin.php`     | WordPress                         | ~150 linii   |
| `node-snippet.ts`          | Własna aplikacja webowa           | —            |

### 7.4 Dodawanie nowej domeny kursu — checklist

1. Dodaj kurs w panelu admina (`Courses.tsx`) z `externalUrl`.
2. Backend wygeneruje `integrationSecretHash` per kurs.
3. Wdróż odpowiedni weryfikator (7.3) na docelowej domenie z tym sekretem.
4. Test end-to-end: nadaj sobie testowy dostęp → wygeneruj link → sprawdź czy host wpuszcza.

---

## 8. PŁATNOŚCI — STRIPE JEDNORAZOWE

### 8.1 Zasada — bez wyjątków

Zero subskrypcji. Każdy kurs to jedna, jednorazowa opłata. `mode: "payment"` w każdej sesji Checkout, bez wyjątku i bez pola na przyszłość "billing interval" nigdzie w schemacie czy UI.

### 8.2 Przepływ zakupu

```
1. Student wybiera kurs → POST /api/checkout { courseId }
2. Backend tworzy Stripe Checkout Session (mode: payment, line_items z price_data
   liczonym z Course.priceCents, metadata: { courseId, userEmail })
3. Student płaci na stronie Stripe
4. Stripe wysyła checkout.session.completed → POST /api/webhooks/stripe
5. Backend: weryfikuje podpis (STRIPE_WEBHOOK_SECRET) → tworzy Enrollment
   (source: 'purchase', expiresAt wg Course.accessType/accessDays)
6. Jeśli Course.certificateEnabled && certificateIssueMode === 'on_purchase'
   → od razu wystaw Certificate
7. AccessLog: action = 'granted'
```

### 8.3 Zwroty

`charge.refunded` (opcjonalnie obsługiwane) → `Enrollment.revokedAt` ustawione, jeśli certyfikat już wystawiony automatycznie → `Certificate.revokedAt` też ustawiony.

---

## 9. CERTYFIKATY

### 9.1 Dwa tryby wystawiania (per kurs)

| Tryb           | Kiedy wystawiany                                          |
| --------------- | -------------------------------------------------------------- |
| `on_purchase`    | Automatycznie, natychmiast po zaksięgowaniu płatności           |
| `manual`         | Ręcznie przez admina — przycisk "Oznacz jako ukończony i wystaw certyfikat" w `AccessPage.tsx`, wywołuje `PATCH /api/access/:id/complete` |

Appka nie śledzi postępu w lekcjach (świadomie poza zakresem — patrz sekcja 2 instrukcji budowy), więc "ukończenie" w trybie manual to decyzja admina, nie automatyczny pomiar.

### 9.2 Generowanie PDF

`src/utils/CertificateGenerator.ts` (jsPDF + html2canvas) — renderuje komponent `VisualCertificatePreview.tsx` do PDF A4 poziomo, w przeglądarce, bez udziału backendu poza dostarczeniem danych (imię, tytuł kursu, data, kod weryfikacyjny).

### 9.3 Publiczna weryfikacja

`GET /api/certificates/verify/:code` — bez autoryzacji. Strona `/verify/:code` pokazuje: imię studenta, tytuł kursu, datę wystawienia, status (`isValid`). Nic więcej — bez e-maila, bez ID użytkownika.

---

## 10. MONITORING I BEZPIECZEŃSTWO

| Obszar               | Status                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| Uptime monitoring       | `[DO UZUPEŁNIENIA — podłączyć do istniejącego Uptime Kuma na VPS, patrz CMLP bible 2.12]` |
| Error tracking          | `[DO UZUPEŁNIENIA — osobny projekt Sentry czy dopisać do istniejącego DSN?]` |
| CORS                    | Ograniczony wyłącznie do `app-course-hub.hardbanrecordslab.online` |
| Rate limiting            | `[DO UZUPEŁNIENIA]`                                                 |
| Sekrety                 | Tylko w `.env` na VPS, nigdy w repo. Frontend na Vercelu dostaje wyłącznie `VITE_*` (publiczne z natury) |
| HTTPS                   | Let's Encrypt / Certbot na Nginx, analogicznie do reszty subdomen HRL |

---

## 11. MODEL BIZNESOWY

Sprzedaż dostępu do własnych kursów jako produktów jednorazowych (nie subskrypcja, nie marketplace dla innych twórców). Cena ustalana per kurs w panelu admina. Certyfikat ukończenia jako element wartości dodanej podnoszący postrzeganą jakość kursu — możliwość publicznej weryfikacji autentyczności certyfikatu przez pracodawcę/osobę trzecią pod `/verify/:code`.

`[DO UZUPEŁNIENIA — jeśli chcesz rozbudować: cennik konkretnych kursów, planowana liczba kursów, kanały promocji]`

---

## 12. PROCEDURY WDROŻENIOWE I AWARYJNE

### 12.1 Pierwsze wdrożenie (kolejność)

1. Utwórz bazę Postgres na VPS (`hrl_course_hub`), osobne credentials od CMLP.
2. Wgraj backend na VPS, ustaw `.env` (sekcja 13), uruchom `npx prisma migrate deploy`.
3. Skonfiguruj Nginx + HTTPS pod `api.course-hub.hardbanrecordslab.online`.
4. Uruchom proces backendu (PM2/Docker), zweryfikuj `GET /api/health`.
5. Wdróż frontend na Vercel pod `app-course-hub.hardbanrecordslab.online`, ustaw zmienne środowiskowe.
6. Skonfiguruj webhook Stripe na `https://api.course-hub.hardbanrecordslab.online/api/webhooks/stripe`, przetestuj w trybie testowym.
7. Test end-to-end (zakup testowy → dostęp → certyfikat → weryfikacja publiczna).
8. Dopiero po pełnym teście: przełącz Stripe z trybu testowego na `Live`.

### 12.2 Awaria backendu (VPS)

`[DO UZUPEŁNIENIA PO WDROŻENIU]` — komenda restartu procesu, gdzie sprawdzić logi (PM2 `pm2 logs course-hub-api` / `docker logs ...`).

### 12.3 Awaria bazy danych

`[DO UZUPEŁNIENIA PO WDROŻENIU]` — procedura przywrócenia z backupu, analogicznie do CMLP.

### 12.4 Rotacja sekretów

Sekret sesyjny (`SESSION_JWT_SECRET`) — rotacja unieważnia wszystkie aktywne sesje (użytkownicy muszą się zalogować ponownie). Sekret per-kurs (`integrationSecretHash`) — rotacja unieważnia wszystkie dotąd wygenerowane, niewykorzystane linki do TEGO kursu; wymaga też aktualizacji sekretu w weryfikatorze wdrożonym na hoście kursu.

---

## 13. PEŁNA TABELA ZMIENNYCH ŚRODOWISKOWYCH

### 13.1 Backend (VPS `.env`, nigdy w repo)

| Zmienna                  | Opis                                    |
| -------------------------- | -------------------------------------------- |
| `DATABASE_URL`              | Connection string do Postgresa (VPS)          |
| `SESSION_JWT_SECRET`        | Podpisywanie sesji użytkownika                 |
| `STRIPE_SECRET_KEY`         | Klucz sekretny Stripe                          |
| `STRIPE_WEBHOOK_SECRET`     | Weryfikacja podpisu webhooka Stripe            |
| `CORS_ORIGIN`               | `https://app-course-hub.hardbanrecordslab.online` |
| `PORT`                      | Port nasłuchu backendu (wewnętrzny, za Nginx)  |

### 13.2 Frontend (Vercel — zmienne środowiskowe projektu)

| Zmienna                        | Opis                                          |
| --------------------------------- | -------------------------------------------------- |
| `VITE_API_BASE_URL`                | `https://api.course-hub.hardbanrecordslab.online`     |
| `VITE_STRIPE_PUBLISHABLE_KEY`      | Klucz publiczny Stripe (bezpieczny we froncie)        |

---

## 14. WEBHOOK EVENTS REFERENCE

### 14.1 Incoming (od Stripe)

| Event                        | Handler                          | Efekt                                             |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| `checkout.session.completed`      | `POST /api/webhooks/stripe`           | Tworzy `Enrollment`, ewentualnie `Certificate`, log `AccessLog` |
| `charge.refunded` (opcjonalnie)    | `POST /api/webhooks/stripe`           | Unieważnia `Enrollment` i ewentualny automatyczny `Certificate` |

### 14.2 Format odpowiedzi błędu (analogicznie do CMLP)

```json
{ "error": "ValidationError", "message": "courseId is required", "statusCode": 400 }
```

---

## 15. API ERROR CODES

| Status | Klasa                 | Kiedy                                  |
| ------- | ------------------------ | -------------------------------------------- |
| 400     | ValidationError            | Brak/nieprawidłowe pole                        |
| 401     | AuthError                  | Brak/nieprawidłowy JWT                          |
| 402     | PaymentError                | Błąd płatności Stripe                            |
| 403     | ForbiddenError              | Brak uprawnień (np. student próbuje admin-endpoint) |
| 404     | NotFoundError                | Zasób nie istnieje (np. kod certyfikatu)          |
| 500     | InternalServerError          | Nieobsłużony wyjątek (ukryty szczegół w produkcji) |

---

## 16. STRUKTURA KATALOGÓW (VPS)

```
/opt/hrl-course-hub/
  dist/               Zbudowany backend
  src/                Kod źródłowy TypeScript
  prisma/             schema.prisma + migracje
  docs/               Cała dokumentacja z sekcji 8 instrukcji budowy
    verifiers/         cloudflare-worker.ts, wordpress-plugin.php, node-snippet.ts
  scripts/             Skrypty pomocnicze (backup bazy)
  logs/                Logi PM2/Dockera
  backups/             Backup bazy (.sql.gz)
  .env                 Zmienne środowiskowe (NIE COMMITOWAĆ)
  HRL_Course_Hub_Bible_2026.md   (ten dokument — trzymany razem z kodem)
```

---

## HISTORIA WERSJI

| Wersja | Data       | Zmiany                                                          |
| ------- | ----------- | -------------------------------------------------------------------- |
| 0.1.0   | 2026-07-08  | Wersja startowa — architektura zaprojektowana, dokument planistyczny na bazie instrukcji budowy i wzorca `CMLP_WordPress_Bible_2026.md`. Wdrożenie na VPS jeszcze nie wykonane. |

---

*Dokument ten ma być żywy — po każdym etapie wdrożenia z sekcji 12.1 wypełnij odpowiednie `[DO UZUPEŁNIENIA]` rzeczywistymi wartościami ze stanu VPS, tak jak robi to biblia CMLP.*