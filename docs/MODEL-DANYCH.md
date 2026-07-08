# Model danych

HRL Course Hub używa PostgreSQL + Prisma ORM. Poniżej opis wszystkich modeli (tabel) i ich relacji.

## Diagram relacji

```
┌──────────┐         ┌──────────────┐         ┌──────────┐
│   User   │◄────────┤ Enrollment   ├────────►│  Course  │
│          │  1   N  │              │  N   1  │          │
└──────────┘         └──────┬───────┘         └────┬─────┘
     │                      │                      │
     │ 1                  N │ 1                  N │ 1
     │                      ▼                      ▼
     │               ┌──────────┐           ┌──────────────┐
     │               │  Order   │           │ Certificate  │
     │               │          │           │              │
     │               └────┬─────┘           └──────────────┘
     │                    │ 1
     │                    │ N
     │                    ▼
     │               ┌──────────┐
     │               │OrderItem │──► Course (N:1)
     │               └──────────┘
     │
     │ 1
     ▼ N
┌──────────┐
│AccessLog │──► Course (N:1)
└──────────┘
```

## Tabele

### `User`
Użytkownicy systemu (admin + studenci).

| Pole | Typ | Opis |
|---|---|---|
| `id` | `String` (cuid) | Unikalne ID |
| `email` | `String` (unique) | Email (login) |
| `name` | `String?` | Imię i nazwisko (opcjonalne) |
| `passwordHash` | `String?` | Hasło bcrypt (null = konto tylko z OAuth / tymczasowe) |
| `role` | `UserRole` enum | `ADMIN` \| `STUDENT` |
| `isActive` | `Boolean` | Czy konto aktywne (deaktywowany nie może się logować) |
| `createdAt` | `DateTime` | Data utworzenia |
| `updatedAt` | `DateTime` | Data ostatniej modyfikacji |

**Relacje:** 1:N do `Enrollment`, `Order`, `Certificate`, `AccessLog`.

---

### `Course`
Metadane kursu. HRL Course Hub **nie przechowuje treści** — kurs żyje pod `externalUrl`.

| Pole | Typ | Opis |
|---|---|---|
| `id` | `String` (cuid) | Unikalne ID |
| `title` | `String` | Tytuł kursu |
| `description` | `String?` | Opis |
| `imageUrl` | `String?` | URL miniatury |
| `status` | `CourseStatus` enum | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` |
| `externalUrl` | `String` | URL, pod którym żyje treść kursu (inna domena) |
| `integrationSecretHash` | `String?` | **Sekret per-kurs** do podpisywania JWT-linków. NIGDY nie eksportuj. |
| `accessType` | `AccessType` enum | `LIFETIME` \| `FIXED_DAYS` \| `DATE_RANGE` |
| `accessDays` | `Int?` | Liczba dni dostępu (dla `FIXED_DAYS`) |
| `accessStartAt` | `DateTime?` | Początek okna dostępu (dla `DATE_RANGE`) |
| `accessEndAt` | `DateTime?` | Koniec okna dostępu (dla `DATE_RANGE`) |
| `studentLimit` | `Int?` | Limit studentów (opcjonalny) |
| `publishedAt` | `DateTime?` | Kiedy opublikowano |
| `currency` | `String` (default `"PLN"`) | Waluta ceny |
| `priceCents` | `Int` (default `0`) | Cena w najmniejszej jednostce waluty (np. 19900 = 199.00 PLN). 0 = darmowy. |
| `certificateEnabled` | `Boolean` | Czy wystawiamy certyfikaty |
| `certificateIssueMode` | `String` (default `"manual"`) | `"manual"` \| `"on_purchase"` |

**Relacje:** 1:N do `Enrollment`, `OrderItem`, `Certificate`, `AccessLog`.

---

### `Order`
Zamówienie (jednorazowe, ze Stripe).

| Pole | Typ | Opis |
|---|---|---|
| `id` | `String` (cuid) | Unikalne ID |
| `userId` | `String` (FK) | Kto kupuje |
| `status` | `OrderStatus` enum | `PENDING` \| `PAID` \| `FAILED` \| `REFUNDED` \| `CANCELED` |
| `currency` | `String` | Waluta |
| `subtotal` | `Int` | Suma (w groszach) |
| `discountTotal` | `Int` | Zniżka |
| `total` | `Int` | Łącznie do zapłaty |
| `stripeCheckoutSessionId` | `String?` (unique) | ID sesji Checkout |
| `stripePaymentIntentId` | `String?` (unique) | ID PaymentIntent |
| `stripeCustomerId` | `String?` | ID klienta w Stripe |
| `createdAt` | `DateTime` | |
| `paidAt` | `DateTime?` | Kiedy opłacono |

---

### `OrderItem`
Pozycja zamówienia (1 kurs = 1 pozycja).

| Pole | Typ | Opis |
|---|---|---|
| `id` | `String` (cuid) | |
| `orderId` | `String` (FK) | |
| `courseId` | `String` (FK) | |
| `unitAmount` | `Int` | Cena jednostkowa |
| `quantity` | `Int` (default `1`) | Zawsze 1 (kursy jednorazowe) |

---

### `Enrollment`
Dostęp studenta do kursu (macierz user × course).

| Pole | Typ | Opis |
|---|---|---|
| `id` | `String` (cuid) | |
| `userId` | `String` (FK) | |
| `courseId` | `String` (FK) | |
| `orderId` | `String?` (FK) | W przypadku zakupu — referencja do zamówienia |
| `source` | `String` | `"admin"` \| `"purchase"` \| `"free"` |
| `status` | `EnrollmentStatus` enum | `PENDING` \| `ACTIVE` \| `EXPIRED` \| `REVOKED` |
| `accessStartsAt` | `DateTime` | Kiedy dostęp zaczął obowiązywać |
| `accessEndsAt` | `DateTime?` | Kiedy wygasa (null = bezterminowo) |
| `lastLaunchedAt` | `DateTime?` | Kiedy ostatnio student wszedł do kursu |
| `completedAt` | `DateTime?` | Kiedy oznaczono ukończenie (wymagane do certyfikatu w trybie `manual`) |

**Unique:** `(userId, courseId)` — student może mieć tylko 1 enrollment na kurs.

---

### `Certificate`
Wystawiony certyfikat ukończenia.

| Pole | Typ | Opis |
|---|---|---|
| `id` | `String` (cuid) | |
| `userId` | `String` (FK) | |
| `courseId` | `String` (FK) | |
| `verificationCode` | `String` (unique, default cuid) | Kod do publicznej weryfikacji `/verify/:code` |
| `studentDisplayName` | `String` | Imię do wyświetlenia na certyfikacie (snapshot) |
| `courseTitleSnapshot` | `String` | Tytuł kursu w momencie wystawienia (snapshot — nie zmieni się, nawet jeśli kurs zostanie przemianowany) |
| `issuedAt` | `DateTime` | Kiedy wystawiony |
| `issuedByUserId` | `String?` (FK) | Kto wystawił (null = automatycznie po zakupie) |
| `revokedAt` | `DateTime?` | Kiedy unieważniony (null = aktywny) |

**Unique:** `(userId, courseId)` — jeden certyfikat per student per kurs.

---

### `AccessLog`
Log audytowy (kto/co/kiedy).

| Pole | Typ | Opis |
|---|---|---|
| `id` | `String` (cuid) | |
| `userId` | `String` (FK) | Kogo dotyczy |
| `courseId` | `String` (FK) | Jakiego kursu |
| `action` | `String` | `"granted"` \| `"revoked"` \| `"link_generated"` \| `"link_used"` \| `"certificate_issued"` \| `"login"` |
| `meta` | `Json?` | Dodatkowe dane (np. orderId, source) |
| `createdAt` | `DateTime` | Kiedy |

---

## Enums

### `UserRole`
- `ADMIN` — pełen dostęp do panelu
- `STUDENT` — dostęp tylko do portalu ucznia

### `CourseStatus`
- `DRAFT` — w przygotowaniu, niewidoczny publicznie
- `PUBLISHED` — opublikowany, dostępny
- `ARCHIVED` — archiwalny (nie sprzedajemy, ale istniejące dostępy działają)

### `AccessType`
- `LIFETIME` — bezterminowy
- `FIXED_DAYS` — na określoną liczbę dni (`accessDays`)
- `DATE_RANGE` — od `accessStartAt` do `accessEndAt`

### `EnrollmentStatus`
- `PENDING` — utworzony, ale jeszcze nieaktywny (np. czeka na płatność)
- `ACTIVE` — aktywny dostęp
- `EXPIRED` — wygasł (data minęła)
- `REVOKED` — ręcznie odebrany

### `OrderStatus`
- `PENDING` — utworzony, czeka na płatność
- `PAID` — opłacony
- `FAILED` — płatność się nie powiodła
- `REFUNDED` — zwrot
- `CANCELED` — anulowany

---

## Co **nie** jest w modelu (świadome wykluczenia)

- ❌ `Lesson` / `Module` — HRL Course Hub nie hostuje treści kursów
- ❌ `Quiz` / `QuizAttempt` — brak testów
- ❌ `LessonProgress` — brak śledzenia postępu
- ❌ `StudentProfile` (streaki, minuty nauki) — niepotrzebne
- ❌ `Subscription` / `PriceType` enum subskrypcyjny — **zero subskrypcji**, tylko jednorazowe
- ❌ Forum, komentarze, wiadomości — poza zakresem
