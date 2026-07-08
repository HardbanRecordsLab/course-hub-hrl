## Cel
Przebudowa CourseHub z „menedżera kursów WP" na **uniwersalny panel zarządzania dostępem** do kursów hostowanych na dowolnych URL-ach. Brak tworzenia treści. Płatność jednorazowa lub kurs darmowy.

## Nowy model danych

Tabela `courses` (Supabase):
- `title`, `description`, `thumbnail_url`
- `course_url` — zewnętrzny URL kursu
- `price_cents` (0 = darmowy), `currency`
- `access_type` — na razie tylko `jwt_link`
- `jwt_secret` — klucz do podpisywania linków (per kurs)
- `is_active`

Tabela `course_access`:
- `user_id`, `course_id`
- `granted_at`, `expires_at` (nullable = bezterminowy)
- `granted_by` (admin lub `purchase`)
- `revoked_at`

Tabela `access_logs`:
- `user_id`, `course_id`, `action` (`granted` | `revoked` | `link_generated` | `link_used`), `meta`, `created_at`

## Zmiany w UI

### Usuwam / przebudowuję
- **Kursy** — z formularza tworzenia kursu (CRUD treści) na **rejestr kursów zewnętrznych**: tytuł, miniaturka, URL, cena, status. Akcje: dodaj/edytuj wpis (sam wpis, nie treść), aktywuj/dezaktywuj.
- **Tokeny** — pozostaje, ale w roli historii wygenerowanych linków JWT (per kurs / per user).
- **Ustawienia** — usuwam pola WP-specyficzne (Application Password, PMPro). Zostawiam ogólne ustawienia + integracje (mail, webhook).

### Dodaję
- **Dostępy** (nowa strona `/access`) — macierz `użytkownik × kurs`: nadaj dostęp, odbierz, ustaw datę wygaśnięcia, wygeneruj link JWT.
- W szczegółach kursu: lista użytkowników z dostępem + przycisk „Dodaj użytkownika".

### Zostaje bez zmian
- **Użytkownicy**, **Aktywność**, **Dashboard** (statystyki przeliczone na nowy model: aktywne dostępy, sprzedane miejsca, MRR → łączny przychód jednorazowy).
- **Portal ucznia** `/portal` — lista posiadanych kursów z przyciskiem „Otwórz kurs" (generuje JWT-link i przekierowuje).

## Etapy

1. **Migracja DB** — tabele `courses`, `course_access`, `access_logs` + RLS + GRANT-y.
2. **Refaktor `Courses.tsx`** — wymiana formularza tworzenia treści na rejestr kursów zewnętrznych (CRUD wpisu z URL + ceną).
3. **Nowa strona `/access`** — macierz dostępów + akcje nadaj/odbierz/wygeneruj link.
4. **`StudentPortal.tsx`** — pokazuje tylko kursy, do których użytkownik ma aktywny `course_access`, z przyciskiem otwierającym link.
5. **Generator JWT linków** — utility podpisujący payload `{ userId, courseId, exp }` sekretem kursu; weryfikacja po stronie kursu jest poza scope tej aplikacji (każdy host kursu musi mieć własny weryfikator — udokumentuję w README format payloadu).
6. **Sprzątanie WP** — `useWpData.ts`, `wpApi.ts`, `wpConfig.ts`, IntegrationConfigPanel pola PMPro → usunięte lub schowane za feature flagą.
7. **Dashboard** — przeliczenie metryk: aktywne dostępy, przychód jednorazowy, top kursy.

## Detale techniczne

- JWT podpis: `jose` (już w drzewie zależności Supabase) lub `jsonwebtoken` przez edge function — żeby `jwt_secret` nigdy nie trafił do bundle'a frontu, **generowanie linku musi iść przez Supabase Edge Function** `generate-access-link`.
- Weryfikacja dostępu przed wygenerowaniem linku: edge function sprawdza `course_access` użytkownika.
- Logowanie wyłączone (zwraca dev-admin) zostaje na czas budowy — wszystkie nowe widoki działają na realnych zapytaniach do Supabase z `service_role` po stronie edge functions, dla zapytań klienckich RLS wymaga `auth.uid()`, więc przed publikacją trzeba przywrócić Supabase Auth.
- Płatności jednorazowe — placeholder, integrację (Stripe checkout one-time) dodamy w kolejnym kroku jeśli potwierdzisz.

## Pytania, które jeszcze warto rozstrzygnąć później
- Czy admin nadaje dostępy ręcznie / przez import CSV / czy kupno automatycznie odblokowuje?
- Czy linki JWT mają być jednorazowe (one-time) czy ważne np. 24h i wielokrotnego użytku?
- Jaki provider płatności (Stripe one-time vs. Paddle vs. inny)?

Zacznę od kroku 1 (migracja) po Twojej akceptacji.