# HRL Course Hub — dokument projektowy

> Prywatne narzędzie do zarządzania dostępem do kursów hostowanych pod różnymi domenami.
> Status: produkcja (VPS + Vercel). Charakter: narzędzie wewnętrzne (single-tenant).

---

## 1. Streszczenie

**HRL Course Hub** to cienka warstwa zarządzania dostępem do kursów online hostowanych pod różnymi domenami. Kursy już istnieją — HRL Course Hub **nie tworzy treści**, **nie hostuje wideo**, **nie jest LMS-em**. Służy do:

1. **Rejestrowania kursów** jako metadane (tytuł, opis, zewnętrzny URL, cena, sekret JWT per kurs).
2. **Zarządzania użytkownikami i dostępami** (user × kurs, opcjonalna data wygaśnięcia).
3. **Generowania podpisanych JWT-linków** wpuszczających użytkownika do konkretnego kursu na konkretnej domenie.
4. **Przyjmowania jednorazowych płatności Stripe** i automatycznego nadawania dostępu.
5. **Wystawiania certyfikatów PDF** z publiczną weryfikacją.
6. **Logowania aktywności** (audyt: kto, co, kiedy).

Aplikacja **świadomie NIE robi**: nie tworzy treści, nie hostuje plików, nie obsługuje subskrypcji, nie jest multi-tenantem, nie ma forum/gamifikacji/śledzenia postępu w lekcjach.

## 2. Architektura

```
┌────────────────────┐     HTTPS/REST     ┌─────────────────────────┐
│  Vercel (frontend) │ ─────────────────► │  VPS (Express API)      │
│  app-course-hub.   │                    │  api.course-hub.        │
│  hardbanrecordslab │                    │  hardbanrecordslab.     │
│  .online           │                    │  online :443            │
│  React + Vite SPA  │                    │  (Nginx reverse proxy)  │
└────────────────────┘                    └────────────┬────────────┘
                                                      │
                                         ┌────────────▼────────────┐
                                         │  PostgreSQL (VPS)        │
                                         │  hrl_course_hub @ :5433  │
                                         └─────────────────────────┘

Zewnętrzne:
  Stripe       — płatności jednorazowe (mode: "payment")
  Host kursu   — zewnętrzna domena z weryfikatorem JWT (lokalna weryfikacja)
```

Pełen opis: patrz `docs/ARCHITEKTURA.md`.

## 3. Stos technologiczny

| Warstwa | Technologia | Gdzie |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind + shadcn/ui | Vercel (`app-course-hub.hardbanrecordslab.online`) |
| Backend | Node.js 20 + Express 4 + TypeScript | VPS (`api.course-hub.hardbanrecordslab.online`) |
| ORM | Prisma 6 | Backend |
| Baza danych | PostgreSQL 16 | VPS (port 5433) |
| Auth | JWT (bcrypt + jsonwebtoken) | Backend |
| Płatności | Stripe Checkout (mode: `payment`) | Stripe API |
| Certyfikaty | jsPDF + html2canvas (frontend) | Przeglądarka |
| Weryfikacja linków | Custom JWT verifier | Host kursu (Cloudflare Worker / WP / Node) |
| Process manager | PM2 | VPS |

## 4. Model danych (Prisma)

| Model | Rola |
|---|---|
| `User` | Konta (ADMIN \| STUDENT) |
| `Course` | Metadane kursu + `externalUrl` + `integrationSecretHash` (sekret per kurs) |
| `Enrollment` | Dostęp user × kurs, `status`, `accessEndsAt`, `completedAt` |
| `Order` + `OrderItem` | Jednorazowe zamówienia Stripe |
| `Certificate` | Wystawiony certyfikat, `verificationCode`, snapshot imienia i tytułu |
| `AccessLog` | Audyt: `granted` \| `revoked` \| `link_generated` \| `certificate_issued` \| `login` |

Pełen opis: patrz `docs/MODEL-DANYCH.md`.

## 5. Endpointy API

- `POST /api/auth/register` | `POST /api/auth/login` | `GET /api/auth/me`
- `GET /api/courses` | `GET /api/courses/admin` (admin) | `POST /api/courses` | `PATCH /api/courses/:id` | `DELETE /api/courses/:id`
- `GET /api/access` (admin) | `GET /api/access/mine` | `POST /api/access` | `DELETE /api/access/:id`
- `PATCH /api/access/:id/complete` (admin) | `POST /api/access/:id/generate-link`
- `GET /api/certificates` (admin) | `GET /api/certificates/mine` | `GET /api/certificates/verify/:code` (publiczny)
- `POST /api/checkout` | `POST /api/webhooks/stripe`
- `GET /api/users` (admin) | `PATCH /api/users/:id`
- `GET /api/logs` (admin) | `GET /api/health`

Pełen opis każdego endpointu: patrz `docs/API.md`.

## 6. Przepływ: student kupuje kurs

```
1. Student → POST /api/checkout { courseId }
2. Backend → Stripe Checkout Session (mode: "payment")
3. Student płaci na stronie Stripe
4. Stripe → POST /api/webhooks/stripe (event: checkout.session.completed)
5. Backend weryfikuje podpis (STRIPE_WEBHOOK_SECRET)
6. Backend: Order.status = PAID, tworzy Enrollment (status=ACTIVE, source="purchase")
7. Jeśli course.certificateEnabled && certificateIssueMode === "on_purchase"
   → wystawia Certificate natychmiast
8. AccessLog: action="granted"
9. Student w portalu klika "Otwórz kurs"
10. Frontend → POST /api/access/:id/generate-link
11. Backend podpisuje JWT sekretem integrationSecretHash kursu
12. Frontend otwiera {externalUrl}?ch_token={jwt}
13. Weryfikator na hoście kursu sprawdza podpis LOKALNIE → wpuszcza lub odmawia
```

## 7. Przepływ: student wchodzi do kursu (już ma dostęp)

```
1. Student loguje się → JWT sesyjny (SESSION_JWT_SECRET, 7 dni)
2. Portal → "Otwórz kurs" → POST /api/access/:id/generate-link (Authorization: Bearer <session>)
3. Backend sprawdza: enrollment ACTIVE, nie wygasł, course.integrationSecretHash istnieje
4. Backend podpisuje JWT kursu (HS256):
     { v, iss, sub, aud, iat, exp(+24h), jti, email, courseId }
5. AccessLog: action="link_generated"
6. Zwrócony URL: {externalUrl}?ch_token={jwt}
7. Frontend → window.location = url
8. Weryfikator na hoście kursu:
   - czyta ch_token z query
   - weryfikuje podpis sekretem kursu (HS256)
   - sprawdza exp (ważność)
   - jeśli OK → wpuszcza; jeśli nie → redirect 403
9. Zero synchronicznych zapytań do VPS HRL Course Hub
```

## 8. Sekrety — dwa różne, nigdy nie mylić

| Sekret | Używany do | Gdzie przechowywany |
|---|---|---|
| `SESSION_JWT_SECRET` | Sesja logowania (admin / student) | VPS `.env` |
| `Course.integrationSecretHash` | JWT-link do treści kursu na zewnętrznej domenie | DB (per kurs) |

Pełen opis: patrz `docs/ZMIENNE-SRODOWISKOWE.md`.

## 9. Certyfikaty

- Tryb `manual` — admin oznacza ukończenie w panelu (`PATCH /api/access/:id/complete`)
- Tryb `on_purchase` — certyfikat wystawiany automatycznie po `checkout.session.completed`
- PDF generowany w przeglądarce (jsPDF + html2canvas, A4 landscape)
- Publiczna weryfikacja: `https://app-course-hub.hardbanrecordslab.online/verify/:code`
- Endpoint `/api/certificates/verify/:code` zwraca minimum danych: imię, tytuł kursu, data, `isValid`

Pełen opis: patrz `docs/CERTYFIKATY.md`.

## 10. Wdrożenie

- **VPS**: `/opt/hrl-course-hub-server/` — Node + Prisma + PostgreSQL + Nginx reverse proxy + Let's Encrypt
- **Vercel**: auto-deploy z brancha `main` GitHub repo `HardbanRecordsLab/course-hub-hrl`
- **Baza**: `hrl_course_hub` na porcie 5433, osobna od innych usług
- **SSL**: Let's Encrypt przez Certbot, automatyczne odnawianie
- **PM2**: proces `hrl-course-hub-api`, logi: `pm2 logs hrl-course-hub-api`

Pełen opis krok po kroku: patrz `docs/INSTALACJA-VPS.md` i `docs/INSTALACJA-VERCEL.md`.

## 11. Operacja po wdrożeniu

- Logi aktywności: panel → **Aktywność** (admin)
- Logi backendu: `pm2 logs hrl-course-hub-api`
- Restart po zmianach: `pm2 restart hrl-course-hub-api`
- Migracja po zmianie schematu: `cd /opt/hrl-course-hub-server && npx prisma migrate deploy`
- Backup bazy: cron z `pg_dump` (do skonfigurowania, patrz `docs/INSTALACJA-VPS.md` § 14)

Pełen opis codziennej obsługi: patrz `docs/PODRECZNIK-ADMINA.md`.
