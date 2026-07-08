# CourseHub — Dokument projektowy

> Prywatna aplikacja do zarządzania dostępem do własnych kursów hostowanych pod różnymi domenami.
> Wersja: 2.0 · Data: lipiec 2026 · Status: MVP w budowie · Charakter: narzędzie wewnętrzne (single-user / single-tenant)

---

## 1. Streszczenie wykonawcze

**CourseHub** to **prywatne narzędzie** zbudowane wyłącznie na moje potrzeby. Nie jest to produkt SaaS, nie będzie sprzedawany innym twórcom kursów i nie ma modelu wieloklientowego. Służy do jednego celu:

> **Zarządzanie dostępem do moich własnych, już istniejących kursów online, które są hostowane pod różnymi domenami i w różnych technologiach.**

Aplikacja **świadomie NIE robi**:

- nie tworzy kursów, lekcji, modułów ani quizów,
- nie hostuje treści (wideo, PDF, tekst) — treść leży tam, gdzie już jest,
- nie jest LMS-em ani platformą e-learningową w klasycznym rozumieniu,
- nie obsługuje wielu twórców, workspace'ów ani white-labelu,
- nie jest publicznie sprzedawana.

Aplikacja **robi dokładnie**:

1. **Rejestruje moje kursy** — każdy kurs to wpis w bazie z metadanymi (tytuł, opis, miniatura), zewnętrznym URL-em pod którym leży treść, ceną oraz sekretem JWT.
2. **Zarządza użytkownikami i ich dostępami** — komu, do którego kursu, na jak długo. Ręcznie, po zakupie jednorazowym lub przez webhook.
3. **Generuje podpisany JWT-link** wpuszczający konkretnego użytkownika do konkretnego kursu na określony czas — bez zakładania kont po stronie hosta kursu.
4. **Loguje wszystko** — nadania, odebrania, wygenerowane linki, użycia — do prostego audytu.

Model płatności dla użytkownika końcowego (kupującego kurs): **jednorazowa opłata**, bez subskrypcji. Dostęp: dożywotni albo czasowy — konfigurowany per kurs.

---

## 2. Po co mi to (kontekst i problem)

Mam kilka kursów rozrzuconych po różnych domenach i stackach — część na WordPressie, część jako aplikacje webowe, część jako materiały w Notion / Google Drive / Vimeo unlisted. Każdy z tych hostów ma inny (albo żaden) mechanizm kontroli dostępu:

- WordPress ma pluginy członkowskie (PMPro), ale utrzymanie WP i pluginów kosztuje czas.
- Notion / Drive / Vimeo unlisted w praktyce nie mają kontroli dostępu — link „unlisted" jest równoznaczny z linkiem publicznym po pierwszym udostępnieniu.
- Aplikacje webowe wymagałyby zaimplementowania własnego auth w każdej z osobna.

Nie chcę migrować treści na jedną platformę (LMS), bo:

- treść jest już przygotowana w odpowiednim formacie dla danego hosta,
- migracja to duży koszt, a zysk zerowy (kursy działają),
- LMS-y (Teachable, Kajabi, Thinkific) są drogie, biorą prowizję i wymuszają swój branding.

Potrzebuję **jednej, cienkiej warstwy**, która:

- trzyma spis moich kursów,
- trzyma spis użytkowników i ich uprawnień,
- generuje krótkoterminowe podpisane linki wpuszczające do właściwego kursu,
- pokazuje mi log tego, co się dzieje.

To jest CourseHub. Nic więcej.

---

## 3. Zakres funkcjonalny

### 3.1 W zakresie

- CRUD moich kursów (metadane + zewnętrzny URL + cena + sekret JWT).
- Zarządzanie użytkownikami (rola `admin` = ja; rola `student` = kupujący/zaproszeni).
- Macierz dostępów użytkownik × kurs, z opcjonalną datą wygaśnięcia.
- Generowanie podpisanych JWT-linków przez edge function.
- Log aktywności (nadanie/odebranie dostępu, wygenerowanie/użycie linku).
- Portal ucznia (`/portal`) z listą kursów, do których użytkownik ma aktywny dostęp.
- Integracje wychodzące z narzędziami komunikacji i automatyzacji, których i tak używam (email, Slack, Telegram, n8n, Google Sheets).
- Konfigurowalny czas ważności linku (domyślnie 24 h).

### 3.2 Poza zakresem (świadomie)

- Edytor treści kursów.
- Odtwarzacz i hosting wideo.
- Forum, komentarze, gamifikacja, certyfikaty.
- Subskrypcje cykliczne dla końcowego kupującego.
- Wieloklientowość / multi-tenant / workspace'y innych twórców.
- White-label, subdomeny klientów, marketplace.
- Publiczna rejestracja innych „twórców kursów" — dostęp do panelu admina mam tylko ja.

---

## 4. Architektura

### 4.1 Stos technologiczny

**Frontend**
- React 18 + TypeScript, Vite 5
- Tailwind CSS v3, shadcn/ui, Framer Motion
- Tanstack Query, React Router 6
- Typografia: Space Grotesk (nagłówki) + JetBrains Mono (dane), Inter fallback
- Motyw: dark professional, zielony akcent — wszystkie kolory jako design tokeny w `src/index.css`

**Backend (Lovable Cloud)**
- Postgres z RLS na wszystkich tabelach domenowych
- Auth (email/password, docelowo Google OAuth) — używane głównie do ochrony portalu ucznia; do panelu admina wchodzę tylko ja
- Edge Functions (Deno) — generator linków JWT, webhook płatności
- Storage — miniaturki kursów, avatary

**Bezpieczeństwo**
- RLS włączone wszędzie, polityki per rola.
- Role trzymane w osobnej tabeli `user_roles` (enum `app_role`) — nigdy na profilach.
- Funkcja `has_role(uuid, app_role)` w SECURITY DEFINER.
- `jwt_secret` każdego kursu odczytywany wyłącznie z edge functions — frontend nie ma do niego dostępu.
- Widok `courses_public` bez pola `jwt_secret` do użytku portalu ucznia.
- Wszystkie `GRANT`-y jawne w migracjach.

### 4.2 Model danych

```text
auth.users
    ├── profiles (1:1) — display_name, avatar_url
    ├── user_roles (1:N) — 'admin' | 'student'
    └── course_access (N:N przez courses)
              │
              ▼
         courses ── access_logs (N:1)
```

**`courses`**: `id`, `title`, `description`, `thumbnail_url`, `course_url`, `price_cents`, `currency`, `access_type` (`jwt_link`), `jwt_secret`, `is_active`.
**`course_access`**: `user_id`, `course_id`, `granted_at`, `expires_at` (nullable = bezterminowo), `granted_by` (uuid admina lub `'purchase'` / `'import'` / `'webhook'`), `revoked_at`.
**`access_logs`**: `user_id`, `course_id`, `action` (`granted` | `revoked` | `link_generated` | `link_used`), `meta` (jsonb), `created_at`.

### 4.3 Przepływ „student otwiera kurs"

```text
Portal ucznia
   │  klik „Otwórz kurs"
   ▼
Edge Function `generate-access-link`
   │  1. odczytuje auth.uid()
   │  2. sprawdza aktywny wpis w course_access
   │  3. czyta jwt_secret kursu
   │  4. podpisuje payload { userId, courseId, exp, jti }
   │  5. INSERT do access_logs (action='link_generated')
   │  6. zwraca URL: {course_url}?ch_token={jwt}
   ▼
Redirect do hosta kursu (moja domena X, Y lub Z)
   │
   ▼
Weryfikator po stronie hosta
   │  sprawdza podpis sekretem
   │  OK → puszcza; źle → odsyła do CourseHub
```

**Kluczowe:** weryfikacja podpisu odbywa się **po stronie hosta kursu** (mały skrypt: WP plugin, Cloudflare Worker, snippet Node). CourseHub nigdy nie proxy-uje treści — jego dostępność jest niezależna od dostępności kursów.

---

## 5. Obecny stan wdrożenia

### 5.1 Co działa

- Routing panelu admina i portalu ucznia.
- `AdminLayout`: boczna nawigacja, header, breadcrumbs (shadcn, desktop + mobile z collapse), `Sheet` na małych ekranach.
- `ProtectedRoute` dla tras wymagających auth.
- Widoki: **Dashboard**, **Kursy**, **Użytkownicy**, **Dostępy**, **Aktywność**, **Ustawienia** (Ogólne / Bezpieczeństwo / Integracje: MailerLite, Brevo, Slack, Telegram, Google Sheets, n8n / Email), **Portal ucznia**.
- Migracje bazy: `courses`, `course_access`, `access_logs`, `profiles`, `user_roles`, enum `app_role`, funkcja `has_role`, widok `courses_public`, trigger auto-nadający rolę `student` przy rejestracji, kompletne RLS + GRANT-y.
- Design system: semantyczne tokeny, warianty shadcn spójne z motywem.

### 5.2 W trakcie

- **Generator JWT** — przycisk „Otwórz kurs" istnieje, ale odsyła surowy `course_url`; brak podpięcia do edge function.
- **Integracje w `SettingsPage`** — UI działa, brak trwałego zapisu do backendu.
- **Metryki Dashboardu** — renderują dane demo z `mockData.ts`, do podpięcia agregacje SQL.

### 5.3 Do zrobienia

- Edge Function `generate-access-link` (podpis HS256, log w `access_logs`).
- Edge Function `webhook-payment` (Stripe `checkout.session.completed` → `INSERT INTO course_access`).
- Referencyjne weryfikatory dla moich hostów: wtyczka WordPress + Cloudflare Worker + snippet Node — po jednym dla każdej używanej domeny.
- Integracja Stripe (jednorazowe checkouty, produkty spięte z tabelą `courses`).
- Przywrócenie realnego Supabase Auth (obecny dev-admin bypass w `AuthContext` do wyłączenia przed publikacją).
- Trwały zapis konfiguracji integracji.
- Realne metryki Dashboardu.
- Powiadomienia email: potwierdzenie nadania dostępu, przypomnienie przed wygaśnięciem.
- (Opcjonalnie) Import CSV, jeśli będę musiał wgrać większą listę użytkowników z historycznych sprzedaży.

---

## 6. Roadmapa (moja, prywatna)

### Faza 1 — Doprowadzić do produkcji (T + 4 tyg.)

- [ ] Edge function `generate-access-link`.
- [ ] Webhook Stripe.
- [ ] Realny Supabase Auth, usunięcie dev-admin bypass.
- [ ] Metryki Dashboardu z realnych zapytań.
- [ ] Weryfikator: Cloudflare Worker (~50 linii TS) + WP plugin (~150 linii PHP) dla moich kursów.
- [ ] Emaile transakcyjne (potwierdzenie zakupu, przypomnienie o wygaśnięciu).
- [ ] Notatka w README: format payloadu JWT + jak wdrożyć weryfikator na nowej domenie.

### Faza 2 — Ułatwienia operacyjne (gdy zajdzie potrzeba)

- Import CSV użytkowników z historycznych sprzedaży.
- Kupony i kody rabatowe.
- Konfigurowalne szablony emaili.
- Ewentualnie Paddle jako MoR, gdy sprzedaż wyjdzie mocno poza PL.

### Faza 3 — Wygoda długoterminowa

- PWA portalu ucznia.
- Auto-mail „nie kliknąłeś linku 7 dni".
- Integracja Przelewy24 / Autopay, jeśli będzie sensowna.

**Świadomie NIE ma w roadmapie:** multi-tenant, białe etykiety, marketplace, sprzedaż CourseHub jako produktu, panel afiliacyjny dla innych. To pozostaje moim narzędziem.

---

## 7. Wizja (moja, nie produktowa)

CourseHub ma być dla mnie tym, czym Stripe Dashboard jest dla płatności — **cienką, niezawodną warstwą kontroli** nad czymś, co dzieje się gdzie indziej. Nie chcę budować kolejnego LMS-a, nie chcę konkurować z Teachable ani sprzedawać SaaS-a innym twórcom. Chcę mieć **jedno miejsce**, w którym:

- widzę wszystkie swoje kursy niezależnie od domeny,
- widzę wszystkich swoich użytkowników i ich stan dostępu,
- jednym kliknięciem nadaję / odbieram dostęp,
- mam pewność, że linki są krótkoterminowe i podpisane,
- mam historię do audytu (kto kupił, kto dostał, kto kliknął).

Sukces = przestaję martwić się o to, kto ma dostęp do czego, i mogę się skupić na tworzeniu nowych kursów, a nie na administrowaniu dostępami do starych.

---

## 8. Standardy techniczne

- RLS zawsze włączone; `GRANT` w tej samej migracji co `CREATE TABLE`.
- Role w osobnej tabeli, `has_role()` w SECURITY DEFINER.
- Sekrety kursów wyłącznie w bazie, dostępne tylko z edge functions.
- Design tokeny w `index.css` — żadnych hardkodowanych kolorów w komponentach.
- Wersjonowanie payloadu JWT polem `v` (rotacja bez psucia starych linków).
- Każda operacja na `course_access` → wpis w `access_logs`.

---

## 9. Załączniki

### 9.1 Format payloadu JWT

```json
{
  "v": 1,
  "iss": "coursehub",
  "sub": "<user_id uuid>",
  "aud": "<course_id uuid>",
  "iat": 1720000000,
  "exp": 1720086400,
  "jti": "<uuid v4>",
  "email": "user@example.com"
}
```

Algorytm: `HS256`, sekret per-kurs.

### 9.2 Kontrakt webhooka Stripe

- Zdarzenie: `checkout.session.completed`.
- Metadane sesji: `course_id`, `user_email`.
- Efekt: `INSERT INTO course_access (user_id, course_id, granted_by, expires_at)` z `granted_by = 'purchase'` i opcjonalnym `expires_at` z konfiguracji kursu.

### 9.3 Słownik

- **JWT-link** — link z tokenem podpisanym per-kurs, autoryzujący jedną sesję dostępu.
- **Host kursu** — dowolna moja domena / aplikacja, pod którą leży realna treść kursu.
- **Weryfikator** — mały skrypt po stronie hosta, sprawdzający podpis tokenu.
- **Dostęp** — wpis w `course_access` łączący usera z kursem (aktywny lub odebrany).

---

*Dokument prywatny. Aplikacja wyłącznie na moje potrzeby — nie jest produktem SaaS i nie będzie udostępniana innym twórcom.*
