# Zmienne środowiskowe

Pełna lista zmiennych środowiskowych dla HRL Course Hub.

## Backend (VPS, plik `/opt/hrl-course-hub/server/.env`)

| Zmienna | Czy sekret? | Opis | Przykład |
|---|---|---|---|
| `DATABASE_URL` | 🔒 tak | Connection string do PostgreSQL | `postgresql://hrl_course_hub:HASLO@127.0.0.1:5432/hrl_course_hub?schema=public` |
| `SESSION_JWT_SECRET` | 🔒 tak | Sekret do podpisywania sesji użytkowników (login). **NIGDY** nie używaj tego do podpisywania linków do kursów. | `a1b2c3d4e5f6...` (64 znaki hex, `openssl rand -hex 32`) |
| `STRIPE_SECRET_KEY` | 🔒 tak | Klucz Stripe (tryb test lub live) | `sk_live_...` lub `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | 🔒 tak | Sekret do weryfikacji podpisu webhooków Stripe | `whsec_...` |
| `CORS_ORIGIN` | ❌ nie | Dozwolone origin frontendowe (jedno!) | `https://app-course-hub.hardbanrecordslab.online` |
| `FRONTEND_URL` | ❌ nie | URL frontendu — używany do redirect-URL w Stripe Checkout | `https://app-course-hub.hardbanrecordslab.online` |
| `PORT` | ❌ nie | Port nasłuchu backendu (wewnętrzny, za reverse proxy) | `3001` |
| `ADMIN_EMAIL` | ❌ nie | Email konta admina utworzonego przez seed | `admin@hardbanrecordslab.online` |
| `ADMIN_PASSWORD` | 🔒 tak | Hasło konta admina (seed) | `MojeSuperTajneHaslo!2026` |
| `NODE_ENV` | ❌ nie | `production` na VPS, `development` lokalnie | `production` |

> **Generowanie sekretów:** `openssl rand -hex 32` → 64-znakowy losowy ciąg hex.

## Frontend (Vercel, Environment Variables w panelu projektu)

| Zmienna | Czy sekret? | Opis | Przykład |
|---|---|---|---|
| `VITE_API_BASE_URL` | ❌ nie (publiczny) | Bazowy URL API | `https://api.course-hub.hardbanrecordslab.online` |

> **Uwaga:** W Vite zmienna jest dostępna w kodzie jako `import.meta.env.VITE_API_BASE_URL`. Zmienne bez prefiksu `VITE_` NIE są dostępne w przeglądarce.

## Sekrety specyficzne per kurs

Dla każdego kursu generowany jest **osobny sekret** (`integrationSecretHash`), używany do podpisywania JWT-linków do treści kursu na zewnętrznej domenie. Przechowywany w tabeli `Course.integrationSecretHash`.

| Sekret | Cel | Konsekwencje rotacji |
|---|---|---|
| `Course.integrationSecretHash` | Podpisuje JWT-linki `?ch_token=...` dla tego kursu | Unieważnia wszystkie niewykorzystane linki do TEGO kursu. Wymaga aktualizacji sekretu w weryfikatorze na hoście kursu. |

> **Nigdy nie myl `SESSION_JWT_SECRET` (backend, jeden dla całej instancji) z `Course.integrationSecretHash` (per kurs, trzymany w bazie). To są dwa zupełnie różne sekrety w dwóch różnych celach.**

## Co NIGDY nie powinno trafić do repo ani do frontendu

- `DATABASE_URL` (zawiera hasło do bazy)
- `SESSION_JWT_SECRET` (pozwala podrobić sesję dowolnego użytkownika)
- `STRIPE_SECRET_KEY` (pozwala przyjmować płatności w twoim imieniu)
- `STRIPE_WEBHOOK_SECRET` (pozwala sfałszować webhooki)
- `ADMIN_PASSWORD` (dostęp do panelu admina)
- `Course.integrationSecretHash` (pozwala sfałszować dostęp do kursu)

Wszystkie powyższe są w pliku `.env` na VPS, plik ten jest w `.gitignore`. Nigdy nie commituj `.env` do repozytorium.

## Rotacja sekretów

### Rotacja `SESSION_JWT_SECRET`

```bash
# 1. wygeneruj nowy sekret
NEW_SECRET=$(openssl rand -hex 32)
echo "Nowy sekret: $NEW_SECRET"

# 2. edytuj .env
nano /opt/hrl-course-hub/server/.env
# zamień SESSION_JWT_SECRET=$NEW_SECRET

# 3. restart
pm2 restart hrl-course-hub-api
```

> **Efekt:** wszyscy użytkownicy zostaną wylogowani (sesje unieważnione). Muszą się zalogować ponownie.

### Rotacja `integrationSecretHash` dla kursu

1. W panelu admina (lub bezpośrednio w bazie) ustaw nowy `integrationSecretHash` dla wybranego kursu
2. Zaktualizuj ten sam sekret w weryfikatorze wdrożonym na hoście kursu (Cloudflare Worker / WP plugin / Node snippet)
3. Wszystkie dotąd wygenerowane linki `?ch_token=...` do tego kursu przestaną działać
