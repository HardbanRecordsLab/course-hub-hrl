# Stripe — konfiguracja i obsługa płatności

HRL Course Hub używa Stripe do jednorazowych płatności za dostęp do kursu. **Nigdy subskrypcji** — to świadoma decyzja architektoniczna.

## 1. Zasady

- **Zawsze `mode: "payment"`** w sesjach Checkout. Nigdy `"subscription"`.
- **Nigdy** `recurring` w produktach/cenach Stripe.
- **Nigdy** `billing_interval` w modelu danych ani UI.
- Jeden kurs = jedna jednorazowa opłata = dostęp bezterminowy lub na określoną liczbę dni (per `Course.accessType`).

## 2. Konfiguracja konta Stripe

1. Zaloguj się na [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Tryb testowy** — do pierwszego wdrożenia produkcyjnego pracuj w trybie testowym (przełącznik w prawym górnym rogu). Klucze testowe zaczynają się od `sk_test_` i `pk_test_`.
3. **Tryb live** — po pełnym teście end-to-end przełącz na `sk_live_` i `pk_live_`.

> **Możesz użyć tego samego konta Stripe co CMLP** — wystarczy utworzyć nowe webhook dla HRL Course Hub pod innym URL-em.

## 3. Klucze API

Pobierz z panelu Stripe: **Developers → API keys**.

| Klucz | Gdzie | Uwagi |
|---|---|---|
| `sk_test_...` / `sk_live_...` | `STRIPE_SECRET_KEY` w `.env` backendu | **Sekret** — tylko backend, nigdy frontend |
| `pk_test_...` / `pk_live_...` | opcjonalnie frontend | Publiczny, ale HRL Course Hub go nie używa (redirect do Stripe Hosted Checkout) |

## 4. Konfiguracja webhooka

1. W panelu Stripe: **Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** `https://api.course-hub.hardbanrecordslab.online/api/webhooks/stripe`
3. **Events to send:** zaznacz dokładnie te dwa:
   - `checkout.session.completed`
   - `charge.refunded`
4. Kliknij **Add endpoint**
5. Kliknij w nowo utworzony endpoint → **Reveal** przy **Signing secret** → skopiuj wartość
6. Wstaw jako `STRIPE_WEBHOOK_SECRET` w `.env` backendu
7. Restart backendu: `pm2 restart hrl-course-hub-api`

> **Testowanie webhooka lokalnie:** użyj [Stripe CLI](https://stripe.com/docs/stripe-cli) → `stripe listen --forward-to localhost:3001/api/webhooks/stripe`. Wygeneruje tymczasowy `whsec_...` który wstaw do `.env` na czas testów.

## 5. Przebieg zakupu (krok po kroku)

```
1. Student klika "Kup kurs" w portalu
         │
         ▼
2. Frontend → POST /api/checkout { courseId }
         │
         ▼
3. Backend tworzy Order (status=PENDING)
         │
         ▼
4. Backend → stripe.checkout.sessions.create({
       mode: "payment",          ← ZAWSZE
       line_items: [{
         price_data: {
           currency: course.currency.toLowerCase(),
           unit_amount: course.priceCents,
           product_data: { name: course.title }
         },
         quantity: 1
       }],
       metadata: { orderId, courseId, userId },
       success_url: FRONTEND_URL + "/portal?success=true",
       cancel_url:  FRONTEND_URL + "/portal?canceled=true"
     })
         │
         ▼
5. Backend zwraca { sessionId, url } do frontendu
         │
         ▼
6. Frontend → window.location = url (redirect do Stripe)
         │
         ▼
7. Student płaci na stronie Stripe
         │
         ▼
8. Stripe → redirect na success_url (frontend /portal?success=true)
   Równolegle Stripe wysyła webhook:
   POST api.course-hub.hardbanrecordslab.online/api/webhooks/stripe
   z event.type = "checkout.session.completed"
         │
         ▼
9. Backend weryfikuje podpis (stripe.webhooks.constructEvent)
         │
         ▼
10. Backend: Order.status = PAID, paidAt = now()
            │
            ▼
11. Backend tworzy/aktualizuje Enrollment:
      - status = ACTIVE
      - accessStartsAt = now()
      - accessEndsAt = (jeśli course.accessType === FIXED_DAYS → +accessDays dni; w przeciwnym razie null = LIFETIME)
      - source = "purchase"
      - orderId = order.id
         │
         ▼
12. Jeśli course.certificateEnabled && course.certificateIssueMode === "on_purchase"
    → tworzy Certificate
         │
         ▼
13. AccessLog: action="granted", meta={ source: "purchase", orderId }
```

## 6. Testowanie w trybie testowym

1. Upewnij się, że w `.env` masz `STRIPE_SECRET_KEY=sk_test_...`
2. W panelu Stripe przełącznik w prawym górnym rogu na **"Test mode"**
3. Użyj testowej karty: `4242 4242 4242 4242` (dowolna przyszła data, dowolny CVC, dowolny ZIP)
4. Inne testowe karty: [docs.stripe.com/testing](https://docs.stripe.com/testing#cards)
5. Po kliknięciu "Kup kurs" w portalu, sprawdź w panelu Stripe → **Payments**, czy pojawiła się transakcja
6. Sprawdź `AccessLog` — powinien pojawić się wpis `action=granted, meta.source=purchase`
7. Sprawdź Enrollment — status ACTIVE
8. Sprawdź Certificate (jeśli kurs ma `certificateEnabled` i `certificateIssueMode=on_purchase`)

## 7. Przełączenie na produkcję (Live)

1. W panelu Stripe przełącz się na **Live mode**
2. **Developers → API keys** → skopiuj `sk_live_...`
3. **Developers → Webhooks** → dodaj nowy endpoint z URL-em produkcyjnym (jeśli jeszcze nie masz) → skopiuj nowy `whsec_...`
4. Na VPS: `nano /opt/hrl-course-hub/server/.env`
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (nowy z live mode!)
5. `pm2 restart hrl-course-hub-api`
6. **Ważne:** NIE zapomnij o migracji webhooka — klucze test/live to **osobne** webhooki.

## 8. Zwroty

1. W panelu Stripe → **Payments** → znajdź płatność → **Refund**
2. Stripe automatycznie wysyła event `charge.refunded` na webhook
3. Backend automatycznie:
   - Ustawia `Order.status = REFUNDED`
   - Zmienia `Enrollment.status = REVOKED`
   - Loguje `AccessLog` z `action=revoked, meta.reason=refund`
4. Jeśli certyfikat został wystawiony automatycznie (`on_purchase`), student traci dostęp i certyfikat (certyfikat NIE jest automatycznie unieważniany — patrz `docs/CERTYFIKATY.md`)

## 9. Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---|---|
| `Webhook signature verification failed` | `STRIPE_WEBHOOK_SECRET` w `.env` nie zgadza się z tym w panelu Stripe. Sprawdź oba. |
| Brak eventu `checkout.session.completed` | Sprawdź czy webhook w panelu Stripe ma zaznaczony ten event. Sprawdź logi backendu (`pm2 logs`). |
| `Order exists, but status is already PAID` | Webhook został wysłany dwukrotnie — backend jest idempotentny (pomija). OK. |
| `Cannot find module 'stripe'` | `cd server && npm install` (zależność powinna już być). |
| Płatność przeszła, ale student nie ma dostępu | Sprawdź `pm2 logs` pod kątem błędów w handlerze webhooka. Sprawdź czy `Order.stripeCheckoutSessionId` pasuje do `metadata.orderId`. |

## 10. Checkout dla kursów darmowych

Kursy z `priceCents = 0` NIE idą przez Stripe. Student dostaje dostęp przez:
- **Ręczne nadanie** przez admina (`POST /api/access` z `source=free` lub `admin`)
- **Nie** przez `POST /api/checkout` (zwróci 400 dla `priceCents=0`)

To celowe — darmowe kursy nie wymagają integracji płatności.
