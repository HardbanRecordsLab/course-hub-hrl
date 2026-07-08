# Dokumentacja API HRL Course Hub

Pełna specyfikacja wszystkich endpointów REST API.

**Base URL:** `https://api.course-hub.hardbanrecordslab.online`

**Auth:** Wszystkie endpointy oprócz `/api/auth/register`, `/api/auth/login`, `/api/certificates/verify/:code` i `/api/webhooks/stripe` wymagają nagłówka `Authorization: Bearer <jwt_token>`.

**Role:**
- `ADMIN` — pełny dostęp do panelu admina
- `STUDENT` — dostęp tylko do portalu ucznia i swoich zasobów

---

## 1. Health

### `GET /api/health`
Publiczny health check.

**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-07-08T15:30:00.000Z" }
```

---

## 2. Auth

### `POST /api/auth/register`
Rejestracja nowego studenta.

**Body:**
```json
{ "name": "Jan Kowalski", "email": "jan@example.com", "password": "mojehaslo123" }
```

**Response 201:**
```json
{ "id": "clx...", "email": "jan@example.com", "name": "Jan Kowalski", "role": "STUDENT" }
```

**Błędy:**
- `409` — email już zajęty
- `400` — brak emaila lub hasła

---

### `POST /api/auth/login`
Logowanie.

**Body:**
```json
{ "email": "jan@example.com", "password": "mojehaslo123" }
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "clx...", "email": "jan@example.com", "name": "Jan", "role": "STUDENT" }
}
```

**Błędy:**
- `401` — nieprawidłowy email lub hasło
- `403` — konto zdezaktywowane

Token ważny 7 dni. Przechowuj w `localStorage` (frontend używa `hrl_token`).

---

### `GET /api/auth/me`
Aktualnie zalogowany użytkownik.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{ "id": "clx...", "email": "jan@example.com", "name": "Jan", "role": "STUDENT" }
```

---

## 3. Kursy

### `GET /api/courses/admin` (admin)
Lista wszystkich kursów (również szkice i archiwalne).

**Response 200:**
```json
[
  {
    "id": "clx...",
    "title": "Cyfrowy Zen",
    "description": "...",
    "imageUrl": "https://...",
    "status": "PUBLISHED",
    "externalUrl": "https://cyfrowy-zen.example.com",
    "priceCents": 19900,
    "currency": "PLN",
    "certificateEnabled": true,
    "certificateIssueMode": "manual",
    "_count": { "enrollments": 12 }
  }
]
```

---

### `GET /api/courses` (zalogowany)
Lista opublikowanych kursów (dostępna dla studentów, np. przed zakupem).

**Response 200:** — podzbiór pól j.w., bez `_count`.

---

### `POST /api/courses` (admin)
Utworzenie nowego kursu.

**Body:**
```json
{
  "title": "Nowy kurs",
  "description": "Opis",
  "imageUrl": "https://...",
  "externalUrl": "https://kurs.example.com",
  "priceCents": 19900,
  "currency": "PLN",
  "status": "DRAFT",
  "certificateEnabled": true,
  "certificateIssueMode": "manual"
}
```

**Wymagane:** `title`, `externalUrl`.

---

### `PATCH /api/courses/:id` (admin)
Aktualizacja kursu. Body jak w POST (bez wymaganych pól).

---

### `DELETE /api/courses/:id` (admin)
Usuwa kurs wraz z powiązanymi dostępami i certyfikatami.

---

## 4. Dostępy (Enrollment)

### `GET /api/access` (admin)
Lista wszystkich dostępów (enrollments).

**Response 200:**
```json
[
  {
    "id": "clx...",
    "userId": "clx...",
    "courseId": "clx...",
    "status": "ACTIVE",
    "source": "purchase",
    "accessStartsAt": "2026-07-01T10:00:00Z",
    "accessEndsAt": null,
    "user": { "id": "clx...", "email": "jan@example.com", "name": "Jan" },
    "course": { "id": "clx...", "title": "Cyfrowy Zen", "externalUrl": "...", "certificateEnabled": true, "certificateIssueMode": "manual" }
  }
]
```

---

### `GET /api/access/mine` (zalogowany)
Aktywne dostępy zalogowanego użytkownika (nie wygasłe).

---

### `POST /api/access` (admin)
Ręczne nadanie dostępu.

**Body:**
```json
{ "userId": "clx...", "courseId": "clx...", "expiresAt": "2026-12-31T23:59:59Z", "source": "admin" }
```

`expiresAt` opcjonalne. `source`: `"admin"` | `"purchase"` | `"free"`.

**Log:** `AccessLog` z `action = "granted"`.

---

### `DELETE /api/access/:id` (admin)
Odebranie dostępu (ustawia `status = "REVOKED"`, nie usuwa rekordu).

**Log:** `AccessLog` z `action = "revoked"`.

---

### `PATCH /api/access/:id/complete` (admin)
Oznaczenie ukończenia kursu. Jeśli kurs ma `certificateEnabled = true`, wystawia certyfikat.

**Log:** `AccessLog` z `action = "certificate_issued"` (jeśli certyfikat wystawiony).

---

### `POST /api/access/:id/generate-link` (zalogowany)
Generuje podpisany JWT-link do treści kursu na zewnętrznej domenie.

**Response 200:**
```json
{ "url": "https://kurs.example.com/?ch_token=eyJhbGciOi...", "token": "eyJhbGciOi..." }
```

JWT podpisany kluczem `Course.integrationSecretHash` (osobny sekret per kurs, inny niż `SESSION_JWT_SECRET`).

**Log:** `AccessLog` z `action = "link_generated"`.

---

## 5. Certyfikaty

### `GET /api/certificates` (admin)
Lista wszystkich certyfikatów.

---

### `GET /api/certificates/mine` (zalogowany)
Twoje (niezunieważnione) certyfikaty.

---

### `GET /api/certificates/verify/:code` (PUBLICZNY)
Weryfikacja autentyczności certyfikatu. **Bez auth!**

**Response 200 (ważny):**
```json
{
  "isValid": true,
  "studentName": "Jan Kowalski",
  "courseTitle": "Cyfrowy Zen",
  "issuedAt": "2026-07-01T10:00:00.000Z"
}
```

**Response 200 (unieważniony):**
```json
{ "isValid": false, "message": "Certyfikat został unieważniony" }
```

**Response 404 (nie istnieje):**
```json
{ "isValid": false, "message": "Certyfikat nie znaleziony" }
```

> **Uwaga:** Endpoint celowo zwraca **minimum** danych (imię + tytuł + data). Nigdy nie zwraca e-maila, ID użytkownika ani innych danych wrażliwych.

---

## 6. Płatności (Stripe)

### `POST /api/checkout` (zalogowany)
Tworzy sesję Stripe Checkout.

**Body:**
```json
{ "courseId": "clx..." }
```

**Response 200:**
```json
{ "sessionId": "cs_test_a1...", "url": "https://checkout.stripe.com/..." }
```

> **Zawsze `mode: "payment"`** (jednorazowa płatność). Nigdy `subscription`.

**Błędy:**
- `404` — kurs nie istnieje
- `400` — kurs niepublikowany lub darmowy (dla darmowych użyj `POST /api/access`)
- `409` — już masz dostęp do tego kursu

---

### `POST /api/webhooks/stripe` (Stripe → backend, publiczny)
Webhook ze Stripe. Weryfikowany podpisem `STRIPE_WEBHOOK_SECRET`.

> **Ważne:** Endpoint ten NIE używa JSON-parse automatycznie — wymaga **raw body** do weryfikacji podpisu. Konfiguracja w `server.ts` wymusza `express.raw()` dla tej ścieżki.

**Obsługiwane eventy:**
- `checkout.session.completed` → tworzy/aktywuje Enrollment, ewentualnie wystawia certyfikat
- `charge.refunded` → ustawia Order.REFUNDED, odbiera Enrollment

---

## 7. Użytkownicy

### `GET /api/users` (admin)
Lista wszystkich użytkowników z liczbą dostępów.

### `PATCH /api/users/:id` (admin)
Aktualizacja `name`, `role`, `isActive`.

---

## 8. Logi aktywności

### `GET /api/logs?limit=100` (admin)
Ostatnie logi aktywności (domyślnie 100, max 500).

**Response 200:**
```json
[
  {
    "id": "clx...",
    "userId": "clx...",
    "courseId": "clx...",
    "action": "granted",
    "meta": { "source": "purchase", "orderId": "clx..." },
    "createdAt": "2026-07-08T15:30:00Z",
    "user": { "id": "clx...", "email": "jan@example.com", "name": "Jan" },
    "course": { "id": "clx...", "title": "Cyfrowy Zen" }
  }
]
```

**Możliwe `action`:**
- `granted` — nadanie dostępu
- `revoked` — odebranie dostępu
- `link_generated` — wygenerowanie JWT-linku
- `link_used` — użycie JWT-linku (logowane po stronie weryfikatora na hoście kursu)
- `certificate_issued` — wystawienie certyfikatu
- `login` — logowanie

---

## Kody błędów

| Status | Znaczenie |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Validation error (brak/nieprawidłowe pole) |
| `401` | Brak/nieprawidłowy JWT |
| `403` | Brak uprawnień (np. student próbuje admin endpoint) |
| `404` | Zasób nie istnieje |
| `409` | Konflikt (np. email zajęty, duplikat dostępu) |
| `500` | Wewnętrzny błąd serwera |

**Format odpowiedzi błędu:**
```json
{ "message": "Opis błędu po polsku" }
```
