# Dodawanie nowej domeny kursu

Instrukcja krok po kroku, jak podpiąć nowy zewnętrzny host kursu (np. kurs na WordPressie, na własnej domenie, za Cloudflare) do HRL Course Hub.

## Przegląd

```
HRL Course Hub (admin)                  Host kursu (np. WordPress)
┌────────────────────────┐              ┌─────────────────────────────┐
│  1. Dodaj kurs         │              │                             │
│  2. Wygeneruj sekret   │              │                             │
│  3. Wygeneruj link     │ ────────────►│  4. Weryfikator (snippet)  │
│     z JWT              │  ?ch_token=  │     weryfikuje JWT lokalnie │
│                        │              │     → wpuszcza lub odmawia  │
└────────────────────────┘              └─────────────────────────────┘
```

**Kluczowa cecha:** weryfikator na hoście kursu sprawdza JWT **lokalnie** — nie odpytuje synchronicznie HRL Course Hub. Dzięki temu dostępność kursu nie zależy od dostępności HRL Course Hub.

## Krok 1: Dodaj kurs w panelu admina

1. Zaloguj się: `https://app-course-hub.hardbanrecordslab.online`
2. **Kursy** → **Dodaj kurs**
3. Wypełnij:
   - **Tytuł** — np. "Cyfrowy Zen"
   - **URL kursu** — pełny URL hosta kursu, np. `https://cyfrowy-zen.example.com`
   - **Opis** (opcjonalnie)
   - **Miniaturka** (URL obrazu)
   - **Cena** w groszach (np. 19900 = 199.00 PLN; 0 = darmowy)
   - **Waluta** (PLN / EUR / USD)
   - **Status**: DRAFT (na czas testów) → PUBLISHED (gdy gotowe)
   - **Certyfikaty**: ON/OFF + tryb (ręczny / automatyczny)
4. Zapisz.

## Krok 2: Wygeneruj sekret JWT per kurs

Każdy kurs ma **własny sekret** (`Course.integrationSecretHash`) — inny niż globalny `SESSION_JWT_SECRET` backendu. Tym sekretem podpisujemy JWT-linki do tego kursu.

Wygeneruj sekret (32 losowe bajty, hex):

```bash
openssl rand -hex 32
# np. 3f8a1b9c2d4e5f6a7b8c9d0e1f2a3b4c...
```

Zapisz go w bazie (np. przez Prisma Studio):

```bash
cd /opt/hrl-course-hub/server
npx prisma studio
```

W Prisma Studio:
- Otwórz tabelę `Course` → klik w kurs → edytuj pole `integrationSecretHash` → wklej wygenerowany sekret → Save

Ten sam sekret **musisz** znać w kroku 4, bo weryfikator na hoście kursu go potrzebuje.

## Krok 3: Przetestuj wygenerowanie linku

Tymczasowo nadaj sobie dostęp do kursu (np. w panelu **Dostępy**), potem w konsoli SQL:

```sql
-- znajdź swój enrollment ID
SELECT id, "userId", "courseId" FROM "Enrollment" WHERE "courseId" = 'ID_KURSU' LIMIT 1;
```

Lub dodaj tymczasowy endpoint — ale najprościej: w panelu admina → **Dostępy** → dodaj siebie → skopiuj ID.

Wygeneruj link (curl):

```bash
TOKEN="twoj_JWT_z_logowania_admin"
ENROLLMENT_ID="clx..."
curl -X POST "https://api.course-hub.hardbanrecordslab.online/api/access/${ENROLLMENT_ID}/generate-link" \
  -H "Authorization: Bearer ${TOKEN}"
```

Otrzymasz:

```json
{
  "url": "https://cyfrowy-zen.example.com/?ch_token=eyJhbGciOiJIUzI1NiIs...",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Zdekoduj token (wklej do [jwt.io](https://jwt.io)) — zobaczysz payload:

```json
{
  "v": 1,
  "iss": "HRL Course Hub",
  "sub": "user-id-...",
  "aud": "https://cyfrowy-zen.example.com",
  "iat": 1752000000,
  "exp": 1752086400,
  "jti": "enrollment-id-...-timestamp",
  "email": "you@example.com",
  "courseId": "clx..."
}
```

## Krok 4: Wdróż weryfikator na hoście kursu

Masz trzy gotowe wzorce w `docs/verifiers/`:

### A) Cloudflare Worker (domena za Cloudflare)

Plik: `docs/verifiers/cloudflare-worker.ts`

1. W panelu Cloudflare: **Workers & Pages** → **Create Worker**
2. Wklej kod z `docs/verifiers/cloudflare-worker.ts`
3. W **Settings → Variables**: dodaj `COURSE_JWT_SECRET` = ten sam sekret co w kroku 2
4. **Settings → Triggers**: dodaj route `cyfrowy-zen.example.com/*` (lub `*/*` dla wszystkich)
5. Zapisz i wdróż

### B) WordPress plugin (kurs na WP)

Plik: `docs/verifiers/wordpress-plugin.php`

1. Spakuj plik do ZIP: `wordpress-plugin.zip` (zawierający folder `hrl-course-hub-verifier/` z `hrl-course-hub-verifier.php`)
2. WP Admin → **Wtyczki → Dodaj nową → Wyślij wtyczkę** → wybierz ZIP → Zainstaluj → Aktywuj
3. WP Admin → **Ustawienia → HRL Course Hub Verifier**:
   - **JWT Secret** — wklej ten sam sekret co w kroku 2
4. Gotowe — wtyczka sprawdza `?ch_token=...` przy każdym wejściu na stronę

### C) Node.js / Express (własna aplikacja)

Plik: `docs/verifiers/node-snippet.ts`

1. Skopiuj middleware do swojej aplikacji Express
2. Podłącz: `app.use(verifyHrlCourseHubToken('TUTAJ_TEN_SAM_SEKRET'))`
3. Middleware weryfikuje `?ch_token=...`, parsuje payload, dodaje `req.chUser`

## Krok 5: Test end-to-end

1. Wygeneruj link (krok 3) — skopiuj URL
2. **Wyloguj się** z HRL Course Hub (ważne, żeby przetestować "świeżą" sesję)
3. Otwórz URL w nowej karcie prywatnej (incognito)
4. Weryfikator powinien:
   - ✅ Wpuścić na stronę kursu (jeśli token ważny)
   - ❌ Przekierować z powrotem do `FRONTEND_URL` lub wyświetlić 403 (jeśli nieważny)
5. Sprawdź `AccessLog` w HRL Course Hub: powinien pojawić się wpis `action=link_generated` (logowany po stronie HRL Course Hub) i opcjonalnie `link_used` (logowany przez weryfikator, jeśli skonfigurowany callback do HRL)

## Krok 6: Test z różnych urządzeń / sieci

Otwórz ten sam link na telefonie, w innej sieci — jeśli działa, weryfikacja działa.

## Krok 7: Publikacja

1. W panelu admina HRL Course Hub: **Kursy** → zmień status z DRAFT na **PUBLISHED**
2. Gotowe — kurs można sprzedawać

## Checklist bezpieczeństwa

- [ ] Sekrety kursu **NIGDY** nie trafiają do repozytorium kursu
- [ ] `integrationSecretHash` jest unikalny per kurs
- [ ] `exp` tokenu to 24h (domyślne) — wystarczająco krótko, żeby zminimalizować ryzyko przechwycenia
- [ ] Weryfikator NIE zwraca szczegółów błędu (np. "token wygasł" vs "zły podpis") użytkownikowi końcowemu — tylko generyczny 403
- [ ] Jeśli kurs przechodzi z DRAFT na ARCHIVED — istniejące dostępy nadal działają, ale nowi nie mogą kupić

## Rotacja sekretu

Jeśli podejrzewasz wyciek sekretu kursu (np. weryfikator na WP był źle skonfigurowany):

1. Wygeneruj nowy sekret: `openssl rand -hex 32`
2. W Prisma Studio → `Course.integrationSecretHash` → nowy sekret
3. Zaktualizuj sekret w weryfikatorze (Cloudflare Worker / WP / Node)
4. Wszystkie dotąd wygenerowane `?ch_token=...` przestaną działać — studenci muszą wygenerować nowy link (co się stanie automatycznie przy następnym kliknięciu "Otwórz kurs" w portalu)
