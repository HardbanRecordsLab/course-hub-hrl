# Architektura systemu

## Diagram przepływu

```
┌──────────────────────────────────────────────────────────────────┐
│                         PRZEGLĄDARKA UŻYTKOWNIKA                  │
│                                                                  │
│  app-course-hub.hardbanrecordslab.online  (Vercel — frontend)   │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTPS (CORS)
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    VPS — API (Express + Prisma)                  │
│                                                                  │
│  api.course-hub.hardbanrecordslab.online                         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │ Express    │  │  Prisma      │  │  PostgreSQL 15          │   │
│  │ + routes   │─▶│  Client      │─▶│  (lokalnie na VPS)      │   │
│  └────────────┘  └──────────────┘  └─────────────────────────┘   │
│                                                                  │
│  Zmienne środowiskowe:                                            │
│  • SESSION_JWT_SECRET — do auth użytkowników                     │
│  • integrationSecretHash (per kurs) — do linków do kursów        │
│  • STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET                       │
└──────────────┬───────────────────────────────────────┬────────────┘
               │                                       │
               ▼                                       ▼
┌──────────────────────────┐           ┌──────────────────────────────┐
│      Stripe (external)   │           │  Kurs hostowany na zewnętrznej │
│  • płatności jednorazowe │           │  domenie (np. WordPress,      │
│  • webhook do VPS        │           │  Cloudflare Worker, Node.js)  │
│                          │           │                               │
│  Weryfikuje: integration  │           │  Weryfikator sprawdza         │
│  token per-kurs           │           │  podpis JWT kluczem kursu     │
└──────────────────────────┘           └──────────────────────────────┘
```

## Co gdzie działa i dlaczego

### Frontend (Vercel)
- Adres: `https://app-course-hub.hardbanrecordslab.online`
- Technologia: React + Vite + Tailwind CSS
- Odpowiada za interfejs: panel admina, portal ucznia, logowanie, płatności, certyfikaty
- Komunikuje się wyłącznie z API przez HTTPS
- Najlepiej współpracuje z Vercel dzięki automatycznemu wdrażaniu z Git i CDN

### Backend (VPS)
- Adres: `https://api.course-hub.hardbanrecordslab.online`
- Technologia: Node.js + Express + Prisma + PostgreSQL
- Cała logika biznesowa: auth, zarządzanie kursami, płatności, dostęp, certyfikaty
- Przechowuje dane w lokalnej bazie PostgreSQL
- Wysyła webhooki do Stripe i generuje linki JWT do kursów

### Baza danych (PostgreSQL na VPS)
- Cała trwała pamięć: użytkownicy, kursy, zamówienia, zapisy, certyfikaty, logi
- Managed przez Prisma ORM — migracje są wersjonowane w kodzie

### Kursy zewnętrzne
- Kursy hostowane na dowolnych domenach (WordPress, aplikacje, Cloudflare Workers itp.)
- Dostęp do nich kontrolowany przez **JWT-link** — krótkoterminowy token podpisany specjalnym kluczem dla danego kursu
- Weryfikator po stronie kursu decyduje, czy wpuścić użytkownika

## Dwa rodzaje sekretów JWT

System używa **dwóch całkowicie oddzielnych kluczy JWT**, które nigdy nie powinny być używane zamiennie:

### 1. SESSION_JWT_SECRET (sessions użytkowników)
- Jeden wspólny klucz dla całej aplikacji
- Używany do logowania użytkowników do platformy (rejestracja, login, tokeny sesji)
- Ważność tokenu: 7 dni
- Token przechowywany w przeglądarce (localStorage) jako `Authorization: Bearer ...`
- Używany przez backend do weryfikacji każdego chronionego zapytania API

### 2. integrationSecretHash (per kurs)
- Każdy kurs może mieć SWÓJ własny, unikalny sekret
- Używany do podpisywania tokenów dostępowych do konkretnego kursu
- Token generowany przez admina w panelu (przycisk „Generuj link")
- Wysyłany użytkownikowi w linku jako parametr `?ch_token=...`
- Sprawdzany przez weryfikator po stronie hosta kursu
- **Nigdy nie dotykany przez frontend** — przechowywany tylko na backendzie i w weryfikatorze

**Dlaczego dwa?**
- Jeśli `SESSION_JWT_SECRET} wycieknie, atakujący może podszywać się pod użytkowników w całej platformie, ale NIE uzyska dostępu do poszczególnych kursów.
- Jeśli `integrationSecretHash` jednego kursu wycieknie, atakujący może generować linki tylko do TEGO kursa, a nie do całego systemu.

## Przykładowe przepływy danych

### 1. Logowanie użytkownika
1. Użytkownik wpisuje email i hasło w formularzu logowania
2. Frontend wysyła `POST /api/auth/login`
3. Backend porównuje hasło (bcrypt), generuje token JWT podpisany `SESSION_JWT_SECRET`
4. Frontend zapisuje token i używa go we wszystkich kolejnych zapytaniach jako `Authorization: Bearer ...`

### 2. Zakup kursu przez Stripe
1. Student klikna „Kup teraz" w widoku kursu
2. Frontend wysyła `POST /api/checkout {courseId}`
3. Backend tworzy zamówienie w bazie, następnie sesję checkout w Stripe (zawsze `mode: "payment"`)
4. Stripe prowadzi płatność na swojej stronie
5. Po zapłaceniu Stripe wysyła webhook `checkout.session.completed` do VPS
6. Backend aktualizuje zamówienie i tworzy wpis w `Enrollment` (dostęp do kursu)
7. Jeśli certyfikaty są włączone i tryb to `on_purchase`, certyfikat wystawiany jest automatycznie

### 3. Wystawienie certyfikatu
- **Ręcznie**: Admin w panelu klika „Oznacz jako ukończony" → backend tworzy wpis w `Certificate` → student widzi go w portalu
- **Automatycznie po zakupie**: Webhook Stripe utworzy wpis w `Certificate` automatycznie, jeśli kurs ma włączony ten tryb

### 4. Dostęp do kursu zewnętrznego
1. Student w portalu kursów klika „Otwórz kurs"
2. Frontend wywołuje `POST /api/access/:id/generate-link`
3. Backend tworzy podpisany JWT (klucz: `integrationSecretHash` kursu) z:
   - identyfikatorem użytkownika
   - identyfikatorem kursu
   - adresatem URL kursu
   - czasem wygaśnięcia (domyślnie 24 godziny)
4. Backend zwraca pełny URL: `https://kurs-external.pl?ch_token=eyJ...`
5. Student otwiera link w nowej karcie
6. Weryfikator na stronie kursu:
   - odczytuje `ch_token` z URL
   - dekoduje payload, sprawdza podpis i wygaśnięcie
   - jeśli OK → wpuszcza; jeśli NIE → odsyła do platformy

## Bezpieczeństwo

- Wszystkie połączenia przez HTTPS
- CORS ograniczony do frontendowego origin
- Hasła użytkowników hashowane bcrypt (12 rund)
- Tokeny sesji wygasają po 7 dniach
- Integracyjne tokeny wygasają po 24 godzinach
- Każda operacja na dostępach logowana w `AccessLog`
