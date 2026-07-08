# Instrukcja dla agenta AI (builder) — scalenie HRL Course Hub w jedną aplikację

## Nazwa aplikacji — jedna, wiążąca

Finalna aplikacja nazywa się **HRL Course Hub** i tak ma się nazywać wszędzie: tytuł strony (`<title>`), `package.json` (`name`), nagłówki w UI, treść e-maili, pole `iss` w payloadzie JWT, nazwa repo docelowego, stopka itd.

`plugin-hub-builder` i `course-hub` to wyłącznie nazwy dwóch **istniejących repozytoriów źródłowych**, z których czerpiesz kod — nie są to nazwy produktu i nie mogą się nigdzie pojawić w finalnej aplikacji (UI, komunikaty, metadane, nazwa paczki). Jeśli natrafisz w kodzie źródłowym na napisy typu "CourseHub", "Plugin Hub Builder" czy podobne — podmień je na **HRL Course Hub**.

---

## 0. Infrastruktura docelowa (przeczytaj przed wszystkim innym)

- **Baza danych**: Postgres na moim VPS (nie Supabase, nie żadna zewnętrzna usługa BaaS).
- **Backend/API**: Node.js na tym samym VPS (proces przez PM2 albo Docker — do ustalenia w trakcie, ale ma to być zwykły Express, nie Edge Functions/serverless).
- **Frontend**: statyczny build (Vite) wdrażany na **Vercel**, komunikujący się z backendem na VPS wyłącznie przez REST API po HTTPS.

To ma bezpośrednią konsekwencję dla wyboru bazy projektu (patrz sekcja 1) — architektura Supabase (RLS, Edge Functions, `auth.uid()`) **odpada w całości**. Zamiast tego: własna autoryzacja JWT (bcrypt + jsonwebtoken), własne middleware sprawdzające rolę, własne endpointy REST zamiast edge functions.

---

## 1. Kontekst wejściowy i wybór bazy projektu

Masz do dyspozycji dwa istniejące projekty:

1. **`plugin-hub-builder`** — React 18 + TypeScript + Vite + Tailwind + shadcn/ui. Ma gotową strukturę stron i nawigacji dokładnie pod ten scenariusz: panel admina (Dashboard, Kursy, Użytkownicy, Dostępy, Aktywność, Ustawienia), portal ucznia. **Backend tego projektu (Supabase) nie jest używany — bierzemy z niego tylko frontend: layout, strony, komponenty, design tokeny.**
2. **`course-hub`** — Express + Prisma (Postgres) + bcryptjs + jsonwebtoken + Stripe + jsPDF/html2canvas do certyfikatów. **To jest architektura dużo bliższa temu, co ma działać na VPS** — własny serwer Node, własna autoryzacja JWT, własny schemat Prisma pod Postgres. Bierzemy z niego: backend jako punkt startowy, model danych (Prisma), generator certyfikatów, wzorzec Stripe.

### Podział pracy:
- **Backend (VPS)** — buduj na bazie `course-hub/server.ts` + `prisma/schema.prisma`, mocno przycięte (patrz sekcja 3 — usuń wszystko związane z tworzeniem treści kursów).
- **Frontend (Vercel)** — buduj na bazie `plugin-hub-builder/src` (strony, `AdminLayout`, komponenty, `index.css` z design tokenami), ale **podmień całą warstwę danych**: żadnych wywołań `supabase.from(...)`, żadnego klienta Supabase (`src/integrations/supabase/*` do usunięcia). Zamiast tego zwykły klient REST (`fetch`/`axios`) gadający z API na VPS, adres API w zmiennej środowiskowej `VITE_API_BASE_URL`.

---

## 2. Cel aplikacji (zakres — to jest najważniejsze, nie odchodź od tego)

Buduję **prywatne narzędzie do zarządzania dostępem do MOICH WŁASNYCH, już istniejących kursów**, hostowanych pod różnymi domenami. To NIE jest LMS ani kreator kursów.

### Aplikacja MA robić:
- Rejestrować kursy jako metadane: tytuł, opis, miniatura, **zewnętrzny URL** treści, cena, sekret JWT per kurs.
- Zarządzać użytkownikami i macierzą dostępów (user × kurs, z opcjonalną datą wygaśnięcia).
- Generować podpisane JWT-linki wpuszczające użytkownika do konkretnego kursu na danej domenie (bez zakładania kont po stronie hosta kursu).
- Przyjmować **jednorazowe** płatności Stripe za dostęp do kursu i automatycznie nadawać dostęp po opłaceniu.
- **Generować certyfikaty ukończenia w PDF** i umożliwiać ich publiczną weryfikację po unikalnym kodzie.
- Logować całą aktywność (nadanie/odebranie dostępu, wygenerowanie/użycie linku, wystawienie certyfikatu) do audytu.

### Aplikacja MA NIE robić (świadomie wykluczone):
- **Nie tworzy** kursów, lekcji, modułów, quizów, treści — żadnego edytora treści.
- **Nie hostuje** wideo ani plików — treść zawsze leży na zewnętrznej domenie.
- **Nie ma subskrypcji** — zero cyklicznych płatności, zero pól typu "billing interval". Stripe Checkout zawsze w trybie `payment`, nigdy `subscription`.
- Nie ma multi-tenant / white-label / marketplace / kont dla innych twórców — do panelu admina wchodzę tylko ja.
- Nie ma forum, komentarzy, gamifikacji, śledzenia postępu w lekcjach — appka zna tylko "ma dostęp / nie ma dostępu" i opcjonalnie "ukończył / nie ukończył" (potrzebne wyłącznie do certyfikatu).

Jeśli w kodzie `course-hub` natrafisz na coś związanego z tworzeniem lekcji, quizów, streaków nauki, minut nauki (`StudentProfile.streakCurrent`, `totalLearningMinutes`, `lessonCountEstimate`) — **zignoruj, nie przenoś**.

---

## 3. Backend na VPS — architektura

### 3.1 Baza danych
- Postgres uruchomiony na VPS (kontener Docker albo natywna instalacja — cokolwiek już masz skonfigurowane).
- Prisma jako ORM i narzędzie migracji (`prisma migrate deploy` na VPS przy wdrożeniu).
- Punkt startowy: `course-hub/prisma/schema.prisma`, ale mocno przycięty — patrz 3.2.

### 3.2 Model danych (docelowy, po przycięciu)

Zostaw i dostosuj:
- `User` (usuń pola niezwiązane z zarządzaniem dostępem, zostaw: `id`, `email`, `name`, `passwordHash`, `role`, `isActive`, `createdAt`).
- `Course` — usuń pola dotyczące treści/lekcji (`lessonCountEstimate`, `softPreviewPercent`, `freeLessonCount`, `level`, `estimatedHours`), zostaw metadane + `externalUrl` + `integrationSecretHash` (sekret JWT per kurs) + pola dostępu (`accessType`, `accessDays`) + **nowe pola certyfikatów**:
  ```prisma
  certificateEnabled     Boolean @default(false)
  certificateIssueMode   String  @default("manual") // 'manual' | 'on_purchase'
  ```
- `Price` — **usuń w ogóle enum `PriceType`** albo zostaw tylko `ONE_TIME` jako jedyną dopuszczalną wartość (najlepiej w ogóle skasować kolumnę `type` i `billingInterval`, skoro zawsze jest jednorazowa — mniej pól, mniej okazji do pomyłki).
- `Order`, `OrderItem` — zostaw, to już jest wzorzec jednorazowego zamówienia, dobrze pasuje.
- `Enrollment` — to jest odpowiednik `course_access`, zostaw, dodaj pole:
  ```prisma
  completedAt DateTime? // do ręcznego oznaczania ukończenia pod certyfikat
  ```
- **Usuń całkowicie**: `StudentProfile` (streaki, minuty nauki, bio publiczne), `AdminProfile.publicSlug` (niepotrzebne bez publicznego profilu twórcy), wszelkie modele lekcji/modułów/quizów jeśli gdzieś się pojawią.

Dodaj nowy model:
```prisma
model Certificate {
  id                  String    @id @default(cuid())
  userId              String
  courseId            String
  verificationCode    String    @unique @default(cuid())
  studentDisplayName  String
  courseTitleSnapshot String
  issuedAt            DateTime  @default(now())
  issuedByUserId       String?   // null = wystawione automatycznie po zakupie
  revokedAt           DateTime?

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
}
```

Dodaj też prosty model logów, jeśli `course-hub` go nie ma w tej formie:
```prisma
model AccessLog {
  id        String   @id @default(cuid())
  userId    String
  courseId  String
  action    String   // 'granted' | 'revoked' | 'link_generated' | 'link_used' | 'certificate_issued'
  meta      Json?
  createdAt DateTime @default(now())
}
```

### 3.3 Autoryzacja (JWT, bez Supabase Auth)
- Rejestracja/logowanie: `bcryptjs` do hashowania haseł (wzorzec już jest w `server.ts`), `jsonwebtoken` do wydawania tokenu sesji użytkownika (osobny sekret od `jwt_secret` per-kurs! nie myl tych dwóch rzeczy).
- Middleware `requireAuth` (weryfikuje token sesji z nagłówka `Authorization: Bearer`) i `requireAdmin` (sprawdza `role === 'ADMIN'`) — to jest odpowiednik RLS + `has_role()` z podejścia Supabase, tylko realizowany w kodzie backendu zamiast w bazie.
- **CORS**: skonfiguruj Express tak, żeby akceptował requesty wyłącznie z `https://app-course-hub.hardbanrecordslab.online` (domena frontendu na Vercelu) — nie zostawiaj `*` w CORS na produkcji.
- Zmienne środowiskowe na VPS (`.env`, nigdy w repo): `DATABASE_URL`, `SESSION_JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CORS_ORIGIN`.

### 3.4 Endpointy REST do zbudowania (zamiast Supabase Edge Functions)
- `POST /api/auth/login`, `POST /api/auth/register` — sesja JWT.
- `GET /api/courses`, `POST /api/courses`, `PATCH /api/courses/:id` (admin) — CRUD metadanych kursu.
- `GET /api/access`, `POST /api/access` (nadanie ręczne), `DELETE /api/access/:id` (odebranie) — admin.
- `PATCH /api/access/:id/complete` — oznaczenie ukończenia (patrz 5.3), tworzy certyfikat gdy `certificateIssueMode = 'manual'`.
- `POST /api/access/:id/generate-link` — generuje podpisany JWT-link do kursu, loguje `link_generated`.
- `POST /api/checkout` — tworzy sesję Stripe Checkout, **zawsze `mode: "payment"`**.
- `POST /api/webhooks/stripe` — nasłuchuje `checkout.session.completed` (+ opcjonalnie `charge.refunded`), nadaje dostęp, ewentualnie wystawia certyfikat automatycznie.
- `GET /api/certificates` (admin, lista), `GET /api/certificates/mine` (student, portal ucznia).
- `GET /api/certificates/verify/:code` — **publiczny, bez auth**, zwraca tylko: imię studenta, tytuł kursu, data wystawienia, `isValid`. Żadnych innych danych (bez e-maila, bez ID).
- `GET /api/logs` — admin, log aktywności.

---

## 4. Stripe — płatność jednorazowa (bez wyjątków)

1. W `POST /api/checkout` ustaw **zawsze**:
   ```ts
   mode: "payment", // NIGDY "subscription"
   line_items: [{
     price_data: {
       currency: course.currency.toLowerCase(),
       unit_amount: course.priceCents,
       product_data: { name: course.title },
     },
     quantity: 1,
   }],
   metadata: { courseId: course.id, userEmail },
   ```
2. Nie twórz w Stripe żadnych obiektów `Price` z `recurring`. Zawsze `type: "one_time"`, jeśli tworzysz produkty programowo.
3. `POST /api/webhooks/stripe` nasłuchuje **wyłącznie** na `checkout.session.completed` (opcjonalnie `charge.refunded` do zwrotów). Nie implementuj obsługi zdarzeń subskrypcyjnych.
4. Po `checkout.session.completed`:
   - utwórz `Enrollment` (`source = 'purchase'`), `expiresAt` policzone z `accessType`/`accessDays` kursu (NULL = bezterminowo),
   - jeśli `course.certificateEnabled && course.certificateIssueMode === 'on_purchase'` → wystaw `Certificate` od razu,
   - zapisz `AccessLog` (`action = 'granted'`).
5. Endpoint webhooka musi weryfikować podpis Stripe (`STRIPE_WEBHOOK_SECRET`) — to publiczny endpoint, więc to jedyna linia obrony.

---

## 5. Certyfikaty — generator PDF (frontend, bez zmian architektonicznych)

Ta część jest niezależna od tego, gdzie stoi backend — logika działa w przeglądarce.

### 5.1 Plik do przeniesienia niemal 1:1
`course-hub/src/utils/CertificateGenerator.ts` → `plugin-hub-builder/src/utils/CertificateGenerator.ts` bez większych zmian (jsPDF + html2canvas, renderuje DOM-element do PDF A4 poziomo). Doinstaluj `jspdf` i `html2canvas` we froncie, jeśli ich nie ma.

### 5.2 Komponent wizualny certyfikatu
Przenieś i dostosuj `VisualCertificatePreview.tsx` do design tokenów `plugin-hub-builder` (dark professional + zielony akcent, Space Grotesk / JetBrains Mono).

### 5.3 Strona admina „Certyfikaty”
Nowa pozycja w `AdminLayout` + `src/pages/CertificatesPage.tsx`, dane pobierane z `GET /api/certificates` (nie z Supabase). Przy kursach z `certificateIssueMode = 'manual'` przycisk „Oznacz jako ukończony i wystaw certyfikat” w `AccessPage.tsx`, wywołujący `PATCH /api/access/:id/complete`.

### 5.4 Portal ucznia
W `StudentPortal.tsx`, dla kursów z wystawionym certyfikatem (dane z `GET /api/certificates/mine`), przycisk „Pobierz certyfikat” wywołujący `generateCertificatePDF`.

### 5.5 Publiczna strona weryfikacji
`src/pages/VerifyCertificatePage.tsx` pod route `/verify/:code`, poza `ProtectedRoute`, pobiera dane z `GET /api/certificates/verify/:code` na VPS (endpoint publiczny, patrz 3.4).

---

## 6. Weryfikatory po stronie hostów kursów (wielodomenowość)

- Endpoint `POST /api/access/:id/generate-link` na VPS: sprawdza aktywny `Enrollment`, podpisuje payload (`v`, `iss`, `sub`, `aud`, `iat`, `exp`, `jti`, `email`) sekretem `integrationSecretHash` **danego kursu** (HS256, inny sekret niż sesyjny JWT z sekcji 3.3!), loguje `link_generated`, zwraca `{course_url}?ch_token={jwt}`.
- Trzy gotowe wzorce weryfikatorów w `docs/verifiers/`:
  - `cloudflare-worker.ts` (~50 linii) — weryfikuje podpis, wpuszcza lub przekierowuje z powrotem.
  - `wordpress-plugin.php` (~150 linii) — to samo dla WP.
  - `node-snippet.ts` — do własnych aplikacji webowych.
- Weryfikator sprawdza wyłącznie podpis i `exp` lokalnie — nigdy nie kontaktuje się synchronicznie z VPS, żeby dostępność kursów nie zależała od dostępności HRL Course Hub/VPS.

---

## 7. Wdrożenie — konkrety pod tę infrastrukturę

- **VPS**: `docker-compose.yml` z dwoma usługami — Postgres + backend Node (albo backend jako proces PM2 obok natywnego Postgres, jeśli tak już masz). Reverse proxy (nginx albo Caddy) terminujący HTTPS pod domeną **`api.course-hub.hardbanrecordslab.online`** — to jest jedyny adres API, żadnych innych.
- **Vercel**: zwykły projekt Vite/React, podpięty pod domenę **`app-course-hub.hardbanrecordslab.online`**. Zmienna środowiskowa `VITE_API_BASE_URL=https://api.course-hub.hardbanrecordslab.online`. Bez żadnych `vercel.json` rewrite'ów do backendu — frontend woła API bezpośrednio przez `fetch`, CORS ogarnia dostęp.
- **Sekrety**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_JWT_SECRET`, `DATABASE_URL` — tylko w `.env` na VPS. Frontend na Vercelu dostaje wyłącznie `VITE_API_BASE_URL` (i ewentualnie `STRIPE_PUBLISHABLE_KEY`, który jest publiczny z natury).
- Migracje Prisma uruchamiane ręcznie/w CI przy wdrożeniu na VPS (`npx prisma migrate deploy`), nie automatycznie przy starcie serwera.

---

## 8. Dokumentacja — obowiązkowy element dostawy, nie opcja

Wdrożenie nie jest skończone bez kompletnej dokumentacji. Ma powstać jako pliki Markdown w folderze `docs/` w repo (nie jako jednorazowa odpowiedź na czacie) i ma być napisana **po polsku, w stylu dla amatora/nowicjusza** — zakładaj, że osoba wracająca do tego za pół roku nie pamięta żadnych szczegółów i musi się wszystkiego doczytać krok po kroku, bez domyślania się.

Wymagane dokumenty:

### 8.1 `docs/README.md` — punkt wejścia
Krótki opis czym jest HRL Course Hub (i czym świadomie nie jest — skopiuj zakres z sekcji 2), spis treści z linkami do pozostałych dokumentów, wymagania wstępne (Node w jakiej wersji, Postgres, konto Stripe).

### 8.2 `docs/ARCHITEKTURA.md`
- Diagram (tekstowy, w blokach ```) pokazujący przepływ: Vercel (frontend) → `api.course-hub.hardbanrecordslab.online` (VPS) → Postgres (VPS) → Stripe (zewnętrzne) → host kursu (zewnętrzna domena).
- Wyjaśnienie podziału: co stoi na Vercelu, co na VPS, dlaczego (zgodnie z sekcją 0 i 1 tej instrukcji).
- Dwa różne sekrety JWT (sesyjny vs per-kurs) — wyjaśnione wprost, żeby nikt tego kiedyś nie pomylił.

### 8.3 `docs/INSTALACJA-VPS.md` — krok po kroku, jak dla amatora
- Instalacja/konfiguracja Postgresa na VPS.
- Zmienne środowiskowe backendu — pełna lista z `docs/ZMIENNE-SRODOWISKOWE.md` (patrz 8.6), z przykładowym `.env.example`.
- Uruchomienie backendu (PM2 albo Docker — dokładne komendy, nie ogólniki).
- Konfiguracja reverse proxy (nginx/Caddy) pod `api.course-hub.hardbanrecordslab.online` + certyfikat HTTPS (np. Let's Encrypt/Certbot — konkretne komendy).
- Uruchomienie migracji Prisma (`npx prisma migrate deploy`) z wyjaśnieniem co to robi.
- Jak zrobić restart/redeploy po zmianach w kodzie.

### 8.4 `docs/INSTALACJA-VERCEL.md`
- Podłączenie repo frontendu do Vercela, ustawienie domeny `app-course-hub.hardbanrecordslab.online`.
- Ustawienie zmiennej `VITE_API_BASE_URL` w panelu Vercela.
- Jak wygląda proces deployu (auto-deploy z brancha, jak sprawdzić logi builda).

### 8.5 `docs/API.md` — pełna specyfikacja endpointów
Dla każdego endpointu z sekcji 3.4: metoda + ścieżka, czy wymaga auth (i jakiej roli), request body (przykładowy JSON), response (przykładowy JSON), możliwe kody błędów. Szczególnie dokładnie opisz `POST /api/checkout`, `POST /api/webhooks/stripe` i `GET /api/certificates/verify/:code`, bo to newralgiczne punkty (płatności i publiczny endpoint).

### 8.6 `docs/ZMIENNE-SRODOWISKOWE.md`
Tabela: nazwa zmiennej, gdzie ustawiana (VPS `.env` vs Vercel), czy to sekret, do czego służy, przykładowa wartość/format (bez prawdziwych kluczy). Uwzględnij wszystkie z sekcji 3.3 i 7.

### 8.7 `docs/MODEL-DANYCH.md`
Opis każdej tabeli/modelu z Prismy po przycięciu (sekcja 3.2): do czego służy, kluczowe pola, relacje. Diagram tekstowy relacji (User → Enrollment → Course, Course → Certificate, itd.).

### 8.8 `docs/STRIPE.md`
Jak skonfigurować produkt/checkout w Stripe pod nowy kurs, jak podpiąć webhook w panelu Stripe (dokładny URL: `https://api.course-hub.hardbanrecordslab.online/api/webhooks/stripe`), jak przetestować płatność na trybie testowym przed przełączeniem na produkcyjny, jak wygląda obsługa zwrotu.

### 8.9 `docs/CERTYFIKATY.md`
Różnica między trybem `manual` i `on_purchase`, jak oznaczyć ukończenie kursu, jak wygląda proces wystawienia i pobrania certyfikatu, jak działa i wygląda publiczna weryfikacja pod `/verify/:code`, jak unieważnić certyfikat.

### 8.10 `docs/DODAWANIE-NOWEJ-DOMENY-KURSU.md`
Instrukcja krok po kroku (jak dla amatora) jak podpiąć nowy host kursu: dodanie kursu w panelu admina, wygenerowanie sekretu JWT per kurs, wdrożenie odpowiedniego weryfikatora (Cloudflare Worker / plugin WP / snippet Node z sekcji 6) na docelowej domenie, test end-to-end.

### 8.11 `docs/PODRECZNIK-ADMINA.md`
Dla mnie jako użytkownika panelu — nie dewelopera. Ekran po ekranie: jak dodać kurs, jak nadać/odebrać dostęp ręcznie, jak przeczytać log aktywności, jak wystawić certyfikat ręcznie, gdzie sprawdzić status płatności.

---



- [ ] Nigdzie w repo nie ma już importów `@supabase/*` ani plików `src/integrations/supabase/*`.
- [ ] Cały panel admina i portal ucznia korzystają z REST API na VPS (`VITE_API_BASE_URL`), nie z Supabase.
- [ ] Żadne pole/enum związane z subskrypcją nie istnieje w schemacie Prisma ani w formularzu ceny kursu (formularz ma tylko: kwota + waluta).
- [ ] Nie przenosisz z `course-hub`: edytora kursów/lekcji, quizów, streaków nauki, importera treści (`AdminJSONImporter`), chyba że służy wyłącznie do importu metadanych kursów.
- [ ] Endpoint `GET /api/certificates/verify/:code` jest publiczny (bez auth) i zwraca tylko: imię, tytuł kursu, data, `isValid` — nic więcej.
- [ ] `POST /api/checkout` ma `mode: "payment"` — sprawdź to pole ręcznie przed zamknięciem zadania.
- [ ] Sekret sesyjny (auth użytkownika) i sekret per-kurs (JWT-link do treści) to **dwa różne sekrety** — nigdy nie używasz jednego do drugiego celu.
- [ ] `AccessLog` dostaje wpis przy każdej z akcji: nadanie dostępu, wygenerowanie linku, wystawienie certyfikatu.
- [ ] CORS na backendzie ograniczony do konkretnej domeny frontendu, nie `*`.
- [ ] Żadne sekrety (`STRIPE_SECRET_KEY`, `SESSION_JWT_SECRET`, `DATABASE_URL`) nie trafiają do kodu frontendowego ani do repo — tylko `.env` na VPS.
- [ ] Wszędzie w finalnej aplikacji widnieje nazwa **HRL Course Hub** — brak śladów "CourseHub", "Plugin Hub Builder" czy innych nazw z repo źródłowych w UI, `package.json`, tytule strony, mailach, `iss` w JWT.
- [ ] Frontend wdrożony pod `https://app-course-hub.hardbanrecordslab.online`, backend/API pod `https://api.course-hub.hardbanrecordslab.online` — dokładnie te dwie domeny, bez wariacji.
- [ ] Wszystkie 11 dokumentów z sekcji 8 istnieją w `docs/`, są w języku polskim, napisane krok po kroku (nie ogólnikowo) i faktycznie opisują to, co zostało zbudowane — nie szablon z placeholderami.

---

## 10. Kolejność wykonania (etapami, nie wszystko naraz)

1. Backend: przytnij `course-hub/prisma/schema.prisma` wg sekcji 3.2, ustaw Postgres i uruchom pierwszą migrację na VPS.
2. Backend: middleware auth (JWT sesyjny + `requireAdmin`), CORS pod domenę Vercela.
3. Backend: endpointy CRUD kursów, dostępów, generowania linku (sekcja 3.4 i 6).
4. Backend: checkout + webhook Stripe, wyłącznie tryb `payment` (sekcja 4).
5. Backend: endpointy certyfikatów (lista admina, „moje certyfikaty”, publiczna weryfikacja).
6. Frontend: usuń warstwę Supabase z `plugin-hub-builder`, podłącz klienta REST pod `VITE_API_BASE_URL`.
7. Frontend: port generatora certyfikatów + komponentu wizualnego (sekcja 5.1–5.2).
8. Frontend: strona „Certyfikaty” w adminie + przycisk „Pobierz certyfikat” w portalu ucznia + publiczna strona `/verify/:code`.
9. Wdrożenie: backend + Postgres na VPS za reverse proxy z HTTPS, frontend na Vercelu ze zmienną `VITE_API_BASE_URL`.
10. Dokumentacja: napisz wszystkie 11 dokumentów z sekcji 8 na podstawie tego, co faktycznie zbudowałeś (nie kopiuj tej instrukcji jeden do jednego — opisz rzeczywisty stan kodu, z prawdziwymi nazwami plików, endpointów i komend).
11. Test end-to-end: zakup testowy → dostęp nadany → certyfikat (ręcznie lub automatycznie) → pobranie PDF → weryfikacja pod publicznym linkiem z innego urządzenia/przeglądarki (bez logowania).

Pracuj etapami i po każdym etapie pokaż, co się zmieniło — nie generuj wszystkiego naraz w jednym wielkim commicie.
