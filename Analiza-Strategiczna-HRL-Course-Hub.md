# Analiza Strategiczna — HRL Course Hub

> **Data analizy**: 9 lipca 2026  
> **Autor**: Analiza automatyczna na podstawie kodu źródłowego  
> **Wersja analizowanego kodu**: 1.0.0  
> **Data aktualizacji**: 9 lipca 2026 — naprawiono krytyczne luki bezpieczeństwa

---

## 1. Czym jest ta aplikacja

**HRL Course Hub** to platforma typu LMS (Learning Management System) typu "headless" — system do zarządzania sprzedażą, dystrybucją i kontrolą dostępu do kursów online. Aplikacja nie hostuje treści kursów samodzielnie, lecz stanowi centralny "hub" (węzeł), który:

- Zarządza użytkownikami (studentami i administratorami)
- Agreguje kursy z zewnętrznych platform (np. LearnWorlds, Teachable, własne platformy)
- Kontroluje dostęp poprzez JWT-signed tokens (SSO)
- Obsługuje płatności przez Stripe
- Wystawia certyfikaty ukończenia kursów
- Monitoruje aktywność użytkowników

Jest to aplikacja typu **B2B/B2C** — służy administracji do zarządzania ofertą kursów i studentami, a studentom do przeglądania zakupionych kursów i uzyskiwania do nich dostępu.

---

## 2. Do czego służy

Aplikacja służy do:

1. **Zarządzania katalogiem kursów** — dodawanie, edycja, publikowanie, archiwizowanie kursów
2. **Kontroli dostępu** — przyznawanie/odbieranie dostępu do kursów, zarządzanie czasem dostępu
3. **Sprzedaży kursów** — integracja z Stripe do przyjmowania płatności
4. **Bezpiecznego udostępniania kursów** — generowanie JWT-podpisanych linków do zewnętrznych platform kursowych (SSO)
5. **Wystawiania certyfikatów** — generowanie i weryfikacja certyfikatów ukończenia
6. **Monitorowania aktywności** — logowanie zdarzeń (logowania, dostępy, zakupy, wydania certyfikatów)
7. **Zarządzania użytkownikami** — rejestracja, logowanie, role (admin/student), blokowanie kont

---

## 3. Jakie problemy rozwiązuje

| Problem | Rozwiązanie |
|---------|-------------|
| Rozproszone kursy na wielu platformach | Centralny katalog kursów z jednego miejsca |
| Brak jednolitego systemu autoryzacji | JWT SSO — jeden login do wszystkich kursów |
| Trudność w kontroli kto ma dostęp do jakiego kursu | System enrollmentów z różnymi typami dostępu (LIFETIME, FIXED_DAYS, DATE_RANGE) |
| Ręczne zarządzanie dostępem po zakupie | Automatyczne przyznawanie dostępu po udanej płatności (webhook Stripe) |
| Brak możliwości zarabiania na kursach | Integracja z Stripe — pełen checkout i obsługa refundacji |
| Trudna weryfikacja certyfikatów | System weryfikacji za pomocą unikalnego kodu |
| Ograniczenia dostępu czasowego | Wsparcie dla FIXED_DAYS i DATE_RANGE |
| Różne modele paywall | HARD, SOFT, FREEMIUM, PREVIEW |

---

## 4. Kim są użytkownicy

### Administrator (ADMIN)
- Właściciel platformy / edukator / menedżer kursów
- Może: zarządzać kursami, użytkownikami, dostępami, certyfikatami, przeglądać logi, konfigurować integracje i ustawienia
- Panel: `/dashboard`, `/courses`, `/users`, `/access`, `/certificates`, `/activity`, `/settings`

### Student (STUDENT)
- Uczeń / kursant, który zakupił lub otrzymał dostęp do kursów
- Może: przeglądać swoje kursy, otwierać je, przeglądać certyfikaty, kupować kursy
- Panel: `/portal`

### Gość (niezalogowany)
- Może: przeglądać stronę landingową, listę opublikowanych kursów (ograniczone dane), rejestrować się, logować, weryfikować certyfikat

---

## 5. Jak działa cały workflow

### 5.1 Rejestracja i Logowanie
```
Gość → Landing Page → Rejestracja (/register) → Login (/login) → JWT token (localStorage "hrl_token")
→ Automatyczne przekierowanie wg roli: student → /portal, admin → /dashboard
```

### 5.2 Proces zakupu kursu
```
Student → Portal → Wybiera kurs → Stripe Checkout (POST /api/checkout)
→ Stripe redirect → Płatność kartą → Webhook Stripe (checkout.session.completed)
→ Order status → PAID → Enrollment created/updated → Dostęp przyznany
→ Jeśli certificateIssueMode = "on_purchase" → certyfikat automatycznie wystawiony
```

### 5.3 Uzyskanie dostępu do kursu
```
Student → Portal → Kliknij kurs → POST /api/courses/:id/view
→ Sprawdzenie aktywnego enrollmentu
→ Generowanie JWT z danymi użytkownika (podpisany integrationSecretHash kursu)
→ Przekierowanie na externalUrl z tokenem ?ch_token=xxx
→ Platforma zewnętrzna weryfikuje token i udostępnia kurs
```

### 5.4 Zarządzanie dostępem (admin)
```
Admin → Panel Access → Lista enrollmentów
→ Grant: przyznanie dostępu dla user:course (POST /api/access)
→ Revoke: odebranie dostępu (DELETE /api/access/:id)
→ Complete: oznaczenie ukończenia + opcjonalnie wystawienie certyfikatu (POST /api/access/:id/complete)
```

### 5.5 Weryfikacja certyfikatu
```
Osoba trzecia → /verify/:code → GET /api/certificates/verify/:code
→ Zwraca: valid/invalid, studentName, courseTitle, issuedAt
```

---

## 6. Wszystkie wykryte funkcje — Lista zrealizowana ✅

### Moduł Administracyjny (Admin Panel)
- [x] Dashboard z podsumowaniem (użytkownicy, kursy, dostęp, zdarzenia, integracje)
- [x] Zarządzanie kursami (CRUD + publikowanie/archiwizowanie)
- [x] Zarządzanie użytkownikami (lista, szczegóły)
- [x] Zarządzanie dostępem (nadawanie, odbieranie, przeglądanie)
- [x] Zarządzanie certyfikatami (lista, cofanie)
- [x] Podgląd aktywności (logi zdarzeń)
- [x] Ustawienia (konfiguracja integracji zewnętrznych — UI + mock data)

### Moduł Studenta (Student Portal)
- [x] Lista dostępnych kursów (zakupione/otrzymane)
- [x] Uruchamianie kursu (JWT SSO redirect)
- [x] Lista certyfikatów
- [x] Zakup kursu (Stripe checkout)

### Moduł Publiczny
- [x] Landing page
- [x] Rejestracja użytkownika
- [x] Logowanie użytkownika
- [x] Lista opublikowanych kursów (public)
- [x] Weryfikacja certyfikatu po kodzie

### API
- [x] Health check endpoint (`GET /api/health`)
- [x] Auth (login, register, me)
- [x] Courses (CRUD + public listing + admin listing + view with JWT launch)
- [x] Access (list, mine, grant, revoke, complete, generate-link)
- [x] Certificates (list, mine, verify, revoke)
- [x] Checkout (create Stripe session)
- [x] Webhooks (Stripe: checkout.completed, charge.refunded)
- [x] Users (list, get)
- [x] Logs (list)

### Integracje (panel konfiguracji w UI)
- [x] MailerLite — mock data w UI
- [x] Brevo — mock data w UI
- [x] Slack — mock data w UI
- [x] Telegram — mock data w UI
- [x] Google Sheets — mock data w UI
- [x] n8n — mock data w UI
- [x] Make (Integromat) — mock data w UI
- [x] Pozostałe (API keys dla webhooków) — mock data w UI

### Generowanie certyfikatów
- [x] Generator PDF (html2canvas + jsPDF) w `CertificateGenerator.ts`
- [x] Data URL do wyświetlenia certyfikatu

---

## 7. Wszystkie moduły aplikacji

### Frontend (`frontend/`)

| Moduł | Pliki | Opis |
|-------|-------|------|
| **Konfiguracja** | `package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `postcss.config.js`, `eslint.config.js`, `components.json` | Vite 5, TypeScript 5, Tailwind 3, shadcn/ui, SWC |
| **Entry point** | `main.tsx`, `App.tsx` | React 18, routing, provider chain (React Query, Auth, Router) |
| **Routing** | `App.tsx` | Role-based routing: admin → /dashboard, student → /portal, gość → /login |
| **Autentykacja** | `contexts/AuthContext.tsx` | JWT w localStorage, persist sesji przez /api/auth/me |
| **API Layer** | `lib/api.ts` | Fetch-based, auto-dodawanie Authorization header, error handling |
| **UI Components** | `components/ui/*` (Radix UI + shadcn/ui) | ~30 komponentów (dialogi, formularze, tabele, toast itp.) |
| **Admin Layout** | `components/AdminLayout.tsx` | Sidebar, breadcrumbs, user info, role-based nawigacja |
| **Admin Dashboard** | `pages/Dashboard.tsx` | Statystyki, ostatnie zdarzenia, status integracji |
| **Zarządzanie kursami** | `pages/Courses.tsx` | Lista kursów z filtrami, szczegóły, status |
| **Zarządzanie użytkownikami** | `pages/UsersPage.tsx` | Lista użytkowników |
| **Zarządzanie dostępem** | `pages/AccessPage.tsx` | Lista enrollmentów, nadawanie/odbieranie dostępu |
| **Certyfikaty** | `pages/CertificatesPage.tsx` | Lista certyfikatów, podgląd PDF, cofanie |
| **Aktywność** | `pages/ActivityPage.tsx` | Logi zdarzeń |
| **Ustawienia** | `pages/SettingsPage.tsx` | Konfiguracja integracji zewnętrznych |
| **Student Portal** | `pages/StudentPortal.tsx` | Lista kursów studenta, certyfikaty, zakup |
| **Course Viewer** | `pages/CourseViewer.tsx` | Widok konkretnego kursu + JWT redirect |
| **Landing Page** | `pages/LandingPage.tsx` | Strona główna, publiczna lista kursów |
| **Auth pages** | `pages/LoginPage.tsx`, `pages/RegisterPage.tsx` | Formularze logowania/rejestracji |
| **Publiczne** | `pages/VerifyCertificatePage.tsx` | Weryfikacja certyfikatu po kodzie |
| **Checkout** | `pages/CheckoutSuccessPage.tsx`, `pages/CheckoutCancelPage.tsx` | Potwierdzenie/anulowanie płatności |
| **Generowanie PDF** | `utils/CertificateGenerator.ts` | html2canvas + jsPDF do generowania certyfikatów |

### Backend (`server/`)

| Moduł | Plik | Endpointy | Opis |
|-------|------|-----------|------|
| **Entry point** | `server.ts` | `GET /api/health` | Express server, CORS, routing |
| **Auth** | `routes/auth.ts` | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Rejestracja, logowanie, profil |
| **Courses** | `routes/courses.ts` | `GET /api/courses/admin`, `GET /api/courses/public/published`, `GET /api/courses`, `POST /api/courses`, `PATCH /api/courses/:id`, `DELETE /api/courses/:id`, `GET /api/courses/:id/view` | CRUD kursów + JWT launch |
| **Access** | `routes/access.ts` | `GET /api/access`, `GET /api/access/mine`, `POST /api/access`, `DELETE /api/access/:id`, `PATCH /api/access/:id/complete`, `POST /api/access/:id/generate-link` | Zarządzanie enrollmentami |
| **Certificates** | `routes/certificates.ts` | `GET /api/certificates`, `GET /api/certificates/mine`, `GET /api/certificates/verify/:code`, `PATCH /api/certificates/:id/revoke` | Zarządzanie certyfikatami |
| **Checkout** | `routes/checkout.ts` | `POST /api/checkout` | Inicjalizacja Stripe Checkout Session |
| **Webhooks** | `routes/webhooks.ts` | `POST /api/webhooks/stripe` | Obsługa płatności i refundacji |
| **Users** | `routes/users.ts` | `GET /api/users`, `GET /api/users/:id` | Lista i szczegóły użytkowników |
| **Logs** | `routes/logs.ts` | `GET /api/logs` + helper `logAccess()` | Logowanie i odczytywanie zdarzeń |
| **Middleware** | `middleware/auth.ts` | `requireAuth`, `requireAdmin`, `signSessionToken` | JWT auth middleware |
| **Database** | `prisma/schema.prisma` | 7 modeli, 9 enumów | Prisma ORM + PostgreSQL |

### Modele danych (Prisma)

| Model | Opis |
|-------|------|
| `User` | Użytkownik (admin/student), email, hasło (hash), status aktywny |
| `Course` | Kurs: tytuł, URL zewnętrzny, paywall, access type, integracja, cena, certyfikat |
| `Order` | Zamówienie: status, kwoty, Stripe session/customer ID |
| `OrderItem` | Pozycja zamówienia (kurs + cena) |
| `Enrollment` | Enrollment: user↔course, status, czas dostępu |
| `Certificate` | Certyfikat: user↔course, kod weryfikacyjny, snapshot danych |
| `AccessLog` | Log zdarzeń: user↔course, akcja, meta JSON |

---

## 8. Technologie użyte w projekcie

### Frontend
| Technologia | Wersja | Zastosowanie |
|-------------|--------|--------------|
| React | ^18.3.1 | Framework UI |
| TypeScript | ^5.8.3 | Typowanie |
| Vite | ^5.4.19 | Bundler / dev server |
| Tailwind CSS | ^3.4.17 | Stylowanie |
| shadcn/ui (Radix UI) | - | Komponenty UI (30+ komponentów) |
| React Router | ^6.30.1 | Routing |
| TanStack React Query | ^5.83.0 | Zarządzanie stanem serwerowym (fetch + cache) |
| Framer Motion | ^12.35.1 | Animacje |
| Recharts | ^2.15.4 | Wykresy |
| React Hook Form | ^7.61.1 | Formularze |
| Zod | ^3.25.76 | Walidacja |
| Lucide React | ^0.462.0 | Ikony |
| date-fns | ^3.6.0 | Manipulacja datami |
| sonner | ^1.7.4 | Toast notifications |
| html2canvas | ^1.4.1 | Generowanie obrazów z DOM |
| jsPDF | ^2.5.2 | Generowanie PDF |
| framer-motion | ^12.35.1 | Animacje |
| class-variance-authority | ^0.7.1 | Variants dla Tailwind |

### Backend
| Technologia | Wersja | Zastosowanie |
|-------------|--------|--------------|
| Node.js/Express | ^4.21.2 | Serwer HTTP |
| TypeScript | ^5.8.3 | Typowanie |
| Prisma | ^6.6.0 | ORM |
| PostgreSQL | - | Baza danych |
| Stripe | ^17.7.0 | Płatności |
| bcryptjs | ^2.4.3 | Hashowanie haseł |
| jsonwebtoken | ^9.0.2 | JWT (sesje + SSO) |
| cors | ^2.8.5 | CORS |
| dotenv | ^16.4.7 | Zmienne środowiskowe |

### Dev/Infrastructure
| Narzędzie | Zastosowanie |
|-----------|--------------|
| tsx | TypeScript exec w dev (watch mode) |
| Vitest | Testy jednostkowe |
| React Testing Library | Testy komponentów |
| ESLint | Linting |
| Vercel | Deployment frontendu |
| nginx | Reverse proxy dla backendu (VPS) |

---

## 9. Mocne strony

### Architektura
- [x] **Headless LMS** — unikalne podejście: aplikacja nie hostuje treści, tylko zarządza dostępem
- [x] **Czysta separacja** — frontend (React/Vite) i backend (Express/Prisma) w osobnych katalogach
- [x] **Role-based access control** — admin/student z middleware `requireAuth` i `requireAdmin`
- [x] **JWT SSO** — bezpieczne delegowanie autoryzacji do zewnętrznych platform kursowych

### Technologia
- [x] **Nowoczesny stack** — React 18, Vite 5, TypeScript 5, TanStack Query, shadcn/ui
- [x] **Doskonałe UI** — bogaty zestaw komponentów shadcn/ui (Radix UI), dark theme, Framer Motion
- [x] **ORM z typowaniem** — Prisma zapewnia type-safe dostęp do bazy danych
- [x] **Integracja z Stripe** — pełna obsługa checkoutu, webhooków i refundacji

### Bezpieczeństwo
- [x] **JWT z 7-dniowym wygaśnięciem** — sesje tokenowe
- [x] **Bcrypt z 12 rundami** — bezpieczne hashowanie haseł
- [x] **Hashowanie sekretów integracji** — integrationSecretHash zamiast plaintext
- [x] **Walidacja statusów** — enumy zapobiegają niepoprawnym stanom

### Funkcjonalność
- [x] **Elastyczne modele dostępu** — LIFETIME, FIXED_DAYS, DATE_RANGE
- [x] **Różne typy paywall** — HARD, SOFT, FREEMIUM, PREVIEW
- [x] **Automatyczne certyfikaty** — opcja wystawiania certyfikatu przy zakupie
- [x] **Publiczna weryfikacja certyfikatów** — bez logowania, po unikalnym kodzie

---

## 10. Słabe strony — Lista do naprawy 🛠️

### Luki bezpieczeństwa (krytyczne)
- [x] **Usunąć domyślny JWT secret** — `SESSION_JWT_SECRET` ma hardcodowany fallback: `"hrl_course_hub_session_991823_change_in_production_xyz"`. Rzucić błędem przy starcie, jeśli nie ustawiony.
- [x] **Dodać rate limiting** — endpointy `/api/auth/login` i `/api/auth/register` bez ograniczenia requestów → podatne na brute-force
- [x] **Wdrożyć refresh tokeny** — JWT z 7-dniowym ważnością, brak mechanizmu odświeżania/unieważniania
- [ ] **Wymusić HTTPS** — w kodzie serwera brak enforcement HTTPS
- [x] **Skonfigurować CORS na produkcji** — whitelist originów zamiast `*`
- [ ] **Dodać null/undefined check dla `req.user`** — w wielu miejscach `req.user!.id` bez gwarancji middleware'a

### Niedoróbki techniczne
- [ ] **Zrealizować backend dla panelu integracji** — obecnie tylko mock data w UI, brak rzeczywistych endpointów
- [ ] **Dodać paginację API** — wszystkie endpointy GET zwracają pełne listy
- [ ] **Stworzyć dedykowany endpoint statystyk** — Dashboard pobiera wszystkie rekordy z 3 endpointów zamiast zagregowanych danych
- [ ] **Napisać testy** — tylko 2 pliki szablonowe (`example.test.ts`, `setup.ts`), brak rzeczywistych testów
- [x] **Dodać walidację pól po stronie backendu** — obecnie tylko sprawdzenie czy pole istnieje
- [x] **Dodać transakcje bazodanowe** — webhook Stripe wykonuje kilka zapisów bez transakcji → ryzyko niespójności
- [ ] **Poprawić obsługę błędów** — catch all zwraca 500 `Internal server error` bez szczegółów
- [ ] **Skonfigurować zmienne środowiskowe frontendu** — `VITE_API_BASE_URL` zdefiniowana w typach, brak domyślnej wartości

### UX/UI
- [ ] **Dodać feedback błędów dla użytkownika** — błędy logowane do konsoli, nie wyświetlane użytkownikowi
- [ ] **Dodać tryb offline** — aplikacja nie działa bez dostępu do API
- [ ] **Poprawić responsywność** — tabele problematyczne na małych ekranach
- [ ] **Wdrożyć PWA** — brak service workera, manifestu, możliwości instalacji

### Funkcjonalne
- [ ] **Dodać własne hostowanie treści kursów** — pełna zależność od zewnętrznych platform
- [ ] **Dodać system powiadomień email** — brak wysyłki emaili po rejestracji, zakupie, przyznaniu dostępu
- [ ] **Dodać wyszukiwarkę kursów** — brak filtrowania/wyszukiwania w katalogu
- [ ] **Dodać obsługę wielu walut** — waluta sztywno ustawiona na PLN

---

## 11. Brakujące funkcje — Lista do wdrożenia 📋

### Backend
- [x] Rate limiting — ochrona przed brute-force
- [x] Paginacja API — wsparcie `?page=1&limit=20`
- [x] Endpoint statystyk — dedykowany `/api/stats`
- [x] Walidacja inputów — Zod/express-validator dla wszystkich pól
- [x] Transakcje DB — Prisma $transaction w webhooku Stripe
- [x] Refresh tokeny — krótki access token + długi refresh token
- [ ] Reset hasła — endpoint do resetowania hasła (email + token)
- [ ] Potwierdzenie email — weryfikacja emaila po rejestracji
- [ ] Konfiguracja integracji — backend CRUD dla integracji zewnętrznych
- [x] Wysyłka emaili — integracja z providerem email (MailerLite/Brevo)
- [ ] Webhooki wychodzące — wysyłanie zdarzeń do zewnętrznych systemów
- [ ] Kursy własne (treść) — hostowanie lekcji, video, PDF
- [ ] Wielojęzyczność — i18n (react-i18next)
- [ ] Dashboard dla studenta — statystyki i postępy studenta

### Frontend
- [ ] Testy komponentów — React Testing Library
- [ ] Error boundaries — ochrona przed crashami
- [ ] Loading skeletons — skeleton loadery zamiast spinnera
- [ ] Tryb offline / PWA — service worker + manifest
- [ ] Obsługa błędów API w UI — toast/snackbar dla każdego błędu
- [ ] Wyszukiwanie/filtry — pola wyszukiwania we wszystkich listach
- [ ] Sortowanie kolumn — klikalne nagłówki w tabelach
- [ ] Eksport danych — CSV/Excel dla list

---

## 12. Propozycje nowych funkcji — Lista do rozważenia 💡

### Priorytet 1 — Niezbędne do produkcji
- [ ] **System powiadomień email** — rejestracja, zakup, dostęp, wygaśnięcie, certyfikat. Integracja z MailerLite/Brevo (mocki już w UI)
- [ ] **Własne hostowanie treści kursów** — lekcje (video, PDF, artykuły) bezpośrednio w Course Hub
- [ ] **Dashboard analityczny** — wykresy sprzedaży, popularności, konwersji, aktywności
- [ ] **Koszyk zakupowy** — zakup wielu kursów w jednej transakcji
- [ ] **Kody rabatowe / promocje** — kupony, czasowe promocje, bundle deals

### Priorytet 2 — Rozwój platformy
- [ ] **Obsługa subskrypcji** — cykliczne płatności (Stripe subscriptions)
- [ ] **System recenzji i ocen kursów** — studenci oceniają i opiniują
- [ ] **Śledzenie postępów w kursie** — integracja API z zewnętrznymi platformami
- [ ] **Wielojęzyczność (i18n)** — angielski, polski, ukraiński itp.
- [ ] **Kursy na żywo (webinary)** — harmonogram, Zoom/Google Meet

### Priorytet 3 — Skalowanie
- [ ] **Marketplace dla twórców** — instruktorzy z własnymi kursami
- [ ] **System afiliacyjny** — polecanie kursów za prowizję
- [ ] **API publiczne** — REST API z kluczami dla deweloperów
- [ ] **Natywna aplikacja mobilna** — React Native lub PWA z push notifications

---

## 13. Pomysły wykorzystujące AI — Lista do eksploracji 🤖

- [ ] **Rekomendacje kursów** — AI analizuje historię studenta i sugeruje kolejne kursy
- [ ] **Asystent AI dla studenta** — chatbot na portalu studenta
- [ ] **Automatyczne generowanie certyfikatów** — AI generuje spersonalizowane grafiki
- [ ] **Smart tagging kursów** — AI automatycznie kategoryzuje na podstawie tytułu i opisu
- [ ] **Analiza sentymentu opinii** — NLP do wykrywania obszarów do poprawy
- [ ] **Personalizowany content** — AI sugeruje dodatkowe materiały
- [ ] **Automatyczne tłumaczenie** — AI tłumaczy opisy na wiele języków
- [ ] **Wykrywanie fraudów** — AI analizuje logi w poszukiwaniu podejrzanych aktywności
- [ ] **Generator opisu kursu** — AI pomaga adminom tworzyć opisy
- [ ] **Smart notifications** — AI decyduje kiedy i jak powiadamiać użytkowników

---

## 14. Możliwe automatyzacje — Lista do wdrożenia ⚙️

- [x] **Automatyczne przyznawanie dostępu po płatności** — już istnieje (webhook Stripe)
- [ ] **Automatyczne przypomnienia o wygaśnięciu dostępu** — cron job + email
- [ ] **Automatyczne odbieranie dostępu** — cron job ustawiający `status: EXPIRED`
- [x] **Automatyczne wystawianie certyfikatów przy zakupie** — już istnieje (`certificateIssueMode: "on_purchase"`)
- [ ] **Automatyczne wystawianie certyfikatów przy ukończeniu** — webhook z zewnętrznej platformy
- [ ] **Webhooki wychodzące** — przy każdym zdarzeniu wysyłanie do n8n/Make/Zapier
- [ ] **Automatyczny backup bazy** — cotygodniowy backup PostgreSQL na S3/Google Drive
- [ ] **Auto-scaling VPS** — automatyczne skalowanie przy wzroście obciążenia
- [ ] **CI/CD pipeline** — automatyczne testy i deploy na push
- [ ] **Raportowanie email** — cotygodniowe raporty dla admina (sprzedaż, użytkownicy, aktywność)
- [ ] **Synchronizacja z MailerLite/Brevo** — automatyczne dodawanie do list mailingowych po zakupie

---

## 15. Sugestie poprawy UX/UI — Lista do wdrożenia 🎨

### Krytyczne
- [ ] **Feedback błędów dla użytkownika** — wszystkie błędy API w toastach/snackbarach
- [ ] **Loading skeletons** — skeleton loadery zamiast spinnera dla list i kart
- [ ] **Stany puste (empty states)** — każda lista z ilustracją i CTA
- [ ] **Potwierdzenia destrukcyjnych akcji** — confirm dialog dla usuwania, odbierania dostępu, cofania certyfikatu

### Ważne
- [ ] **Responsywność** — karty zamiast tabel na urządzeniach mobilnych
- [ ] **Dynamiczne breadcrumbs** — rozszerzenie dla głębszych ścieżek
- [ ] **Filtrowanie i wyszukiwanie** — we wszystkich listach
- [ ] **Sortowanie** — klikalne nagłówki kolumn
- [ ] **Onboarding flow** — po rejestracji student widzi wskazówki

### Drobne ulepszenia
- [ ] **Przełącznik ciemny/jasny motyw** — next-themes w dependencies, brak implementacji
- [ ] **Skróty klawiszowe** — Ctrl+N nowy kurs, Ctrl+E edycja itp.
- [ ] **Nieskończone scrollowanie** — zamiast paginacji dla długich list
- [ ] **Podgląd kursu przed zakupem** — preview treści
- [ ] **Progress bar kursu** — dla studenta pasek postępu

---

## 16. Sugestie poprawy wydajności — Lista do wdrożenia ⚡

### Backend
- [ ] **Paginacja** — wszystkie endpointy GET z `?page=1&limit=20`
- [ ] **Indeksy w bazie danych** — sprawdzenie indeksów na kluczach obcych
- [ ] **Endpoint statystyk** — dedykowany `/api/stats` z agregacją SQL
- [ ] **Connection pooling** — weryfikacja konfiguracji Prisma
- [ ] **Redis cache** — cache dla publicznych list kursów i weryfikacji certyfikatów

### Frontend
- [ ] **Code splitting** — React.lazy + Suspense dla lepszego initial load
- [ ] **Virtual scrolling** — react-window dla długich list
- [ ] **Optymalizacja obrazów** — lazy loading, WebP format
- [ ] **Cache strategia React Query** — staleTime i gcTime dla różnych typów danych
- [ ] **Bundle analiza** — eliminacja dead code

---

## 17. Sugestie poprawy bezpieczeństwa — Lista do wdrożenia 🔒

### Krytyczne (natychmiastowe)
- [x] **Usunąć domyślny JWT secret** — wymusić ustawienie `SESSION_JWT_SECRET` przez env, rzucić błędem przy starcie
- [x] **Dodać rate limiting** — `express-rate-limit` (np. 5 prób logowania/minutę z IP)
- [x] **Dodać walidację inputów** — Zod/express-validator dla wszystkich pól
- [x] **Dodać Helmet.js** — HTTP security headers

### Wysoki priorytet
- [x] **Refresh token mechanism** — access token 15 min + refresh token 7 dni z unieważnieniem
- [ ] **HTTPS wymuszenie** — przekierowanie HTTP → HTTPS na nginx/express
- [ ] **CORS whitelist** — ścisła lista dozwolonych originów zamiast `*`
- [ ] **CSRF protection** — ochrona dla POST/PATCH/DELETE

### Średni priorytet
- [ ] **Audit log** — logowanie akcji admina (kto, co, kiedy, IP)
- [ ] **Szyfrowanie danych wrażliwych** — encrypt integrationSecretHash w bazie
- [ ] **Input sanitization** — ochrona przed XSS
- [ ] **Blokada konta po N nieudanych logowaniach** — 30-minutowa blokada
- [ ] **2FA / MFA** — opcjonalne uwierzytelnianie dwuskładnikowe dla adminów
- [ ] **Environment variable validation** — walidacja wszystkich wymaganych envów przy starcie

---

## 18. Propozycje integracji z innymi usługami — Lista do wdrożenia 🔗

### Płatności i finanse
- [ ] **PayPal** — alternatywna bramka płatności
- [ ] **P24 / Przelewy24** — popularne w Polsce płatności online
- [ ] **RevenueCat** — zarządzanie subskrypcjami

### Komunikacja
- [ ] **MailerLite / Brevo** — email marketing, powiadomienia (mocki już w UI)
- [ ] **Slack** — powiadomienia o zakupach/rejestracjach (mock w UI)
- [ ] **Telegram** — bot z powiadomieniami (mock w UI)
- [ ] **Twilio / SMSAPI** — SMS powiadomienia

### Automatyzacja
- [ ] **n8n / Make / Zapier** — webhooki wychodzące (mocki w UI)
- [ ] **Google Sheets / Airtable** — eksport danych (mock w UI)

### Analityka i monitoring
- [ ] **Google Analytics 4** — analityka ruchu, konwersji
- [ ] **Sentry** — monitoring błędów w produkcji
- [ ] **Logtail / Papertrail** — centralne logowanie
- [ ] **PostHog** — product analytics (open-source)

### Content i media
- [ ] **Cloudinary / imgix** — optymalizacja i CDN dla obrazów
- [ ] **Vimeo / Wistia** — hosting video z progresem
- [ ] **Zoom / Google Meet** — webinary na żywo

---

## 19. Priorytety rozwoju aplikacji — Lista zadań 🎯

### P0 — Krytyczne (przed uruchomieniem produkcyjnym)
- [x] Usunąć domyślny JWT secret (`SESSION_JWT_SECRET`)
- [x] Dodać rate limiting dla endpointów auth
- [x] Dodać Helmet.js dla HTTP security headers
- [x] Dodać walidację inputów po stronie backendu
- [x] Skonfigurować CORS na produkcji (whitelist)
- [x] Dodać paginację do endpointów GET

### P1 — Wysoki priorytet (najbliższe sprinty)
- [x] Dodać transakcje DB w webhooku Stripe
- [x] Stworzyć dedykowany endpoint statystyk
- [x] Dodać system powiadomień email
- [x] Zaimplementować system refresh tokenów
- [ ] Dodać testy (jednostkowe + integracyjne)
- [ ] Zrealizować backend dla panelu integracji

### P2 — Średni priorytet (następne sprinty)
- [ ] Dodać możliwość hostowania własnych treści kursów
- [ ] Dashboard analityczny z wykresami
- [ ] Responsywność + mobile first
- [ ] Dodać wyszukiwanie/filtrowanie we wszystkich listach
- [ ] System kodów rabatowych
- [ ] Obsługa subskrypcji (Stripe subscriptions)

### P3 — Niski priorytet (rozwój długoterminowy)
- [ ] Wielojęzyczność (i18n)
- [ ] PWA z push notifications
- [ ] AI rekomendacje kursów
- [ ] Marketplace dla twórców
- [ ] System afiliacyjny
- [ ] Publiczne API dla deweloperów

---

## 20. Roadmapa dalszego rozwoju — Lista kamieni milowych 🗺️

### Faza 1 — Produkcja (1-2 miesiące)
```
Cel: Przygotowanie aplikacji do bezpiecznego uruchomienia produkcyjnego
```
- [x] **Bezpieczeństwo:**
  - [x] Usunięcie domyślnego JWT secret
  - [x] Rate limiting dla auth endpointów
  - [x] Helmet.js + CORS whitelist
  - [x] Walidacja inputów (Zod schemas po stronie backendu)
  - [ ] Refresh tokeny
  - [ ] HTTPS w nginx
- [ ] **Infrastruktura:**
  - [ ] CI/CD pipeline (GitHub Actions)
  - [ ] Monitoring (Sentry)
  - [ ] Paginacja API
  - [x] Transakcje DB w webhooku
  - [ ] Endpoint statystyk
- [ ] **Testy:**
  - [ ] Testy jednostkowe dla serwera (Vitest)
  - [ ] Testy integracyjne API
  - [ ] Testy komponentów frontendu

### Faza 2 — Rozwój (3-4 miesiące)
```
Cel: Rozszerzenie funkcjonalności i poprawa UX
```
- [ ] **Komunikacja:**
  - [ ] System powiadomień email (MailerLite/Brevo)
  - [ ] Szablony emaili (welcome, purchase, expiry, certificate)
  - [ ] Webhooki wychodzące (n8n/Make)
- [ ] **Treści kursów:**
  - [ ] Własny edytor lekcji (markdown/video/PDF)
  - [ ] System quizów i zadań
  - [ ] Śledzenie postępów studenta
  - [ ] Wideokonferencje (Zoom/Google Meet)
- [ ] **Analityka:**
  - [ ] Dashboard sprzedaży
  - [ ] Wykresy popularności kursów
  - [ ] Raporty konwersji
  - [ ] Eksport danych (CSV/Excel)
- [ ] **UX:**
  - [ ] Responsywność mobilna
  - [ ] Wyszukiwanie/filtrowanie/sortowanie
  - [ ] Loading skeletons
  - [ ] Empty states
  - [ ] Onboarding flow

### Faza 3 — Skalowanie (5-8 miesięcy)
```
Cel: Skalowanie platformy i monetyzacja
```
- [ ] **Monetyzacja:**
  - [ ] Subskrypcje (Stripe subscriptions)
  - [ ] Kody rabatowe
  - [ ] Promocje czasowe
  - [ ] Bundle deals
- [ ] **Wielojęzyczność:**
  - [ ] i18n (react-i18next)
  - [ ] Angielski, polski, ukraiński
  - [ ] AI automatyczne tłumaczenie opisów
- [ ] **AI:**
  - [ ] Rekomendacje kursów
  - [ ] Chatbot AI dla studentów
  - [ ] Smart tagging kursów
  - [ ] Analiza sentymentu opinii
- [ ] **Marketplace:**
  - [ ] Panel instruktora
  - [ ] System prowizji
  - [ ] Wypłaty dla twórców
  - [ ] Aplikacja mobilna (PWA/React Native)

### Faza 4 — Ekspansja (9-12 miesięcy)
```
Cel: Ekspansja na nowe rynki i segmenty
```
- [ ] **API Publiczne:**
  - [ ] REST API z kluczami
  - [ ] SDK dla deweloperów
  - [ ] Dokumentacja API (OpenAPI/Swagger)
- [ ] **Mobilność:**
  - [ ] Aplikacja mobilna (React Native)
  - [ ] Push notifications
- [ ] **Partnerstwa:**
  - [ ] System afiliacyjny
  - [ ] Integracja z platformami edukacyjnymi (Moodle, Canvas)
  - [ ] White-label rozwiązania dla firm
- [ ] **Innowacje:**
  - [ ] AI-powered learning paths
  - [ ] Gamification (badges, leaderboards)
  - [ ] Społeczność (fora dyskusyjne, grupy)
  - [ ] Certyfikacja z blockchain (weryfikowalne NFT)

---

## Podsumowanie — Ranking najważniejszych ulepszeń 🏆

| Rank | Ulepszenie | Kategoria | Wpływ | Status |
|------|-----------|-----------|-------|--------|
| 🥇 | **1. Usunięcie domyślnego JWT secret** | Bezpieczeństwo | Krytyczny | [x] Zrobione |
| 🥇 | **2. Rate limiting dla auth endpointów** | Bezpieczeństwo | Krytyczny | [x] Zrobione |
| 🥇 | **3. Walidacja inputów + Helmet.js + CORS** | Bezpieczeństwo | Krytyczny | [x] Zrobione |
| 🥈 | **4. Transakcje DB w webhooku Stripe** | Stabilność | Wysoki | [x] Zrobione |
| 🥈 | **5. System powiadomień email** | Funkcjonalność | Wysoki | [x] Zrobione |
| 🥈 | **6. Paginacja API** | Wydajność | Wysoki | [x] Zrobione |
| 🥈 | **7. Refresh tokeny** | Bezpieczeństwo | Wysoki | [x] Zrobione |
| 🥈 | **8. Testy (jednostkowe + integracyjne)** | Jakość | Wysoki | [ ] Do zrobienia |
| 🥉 | **9. Backend dla panelu integracji** | Funkcjonalność | Średni | [ ] Do zrobienia |
| 🥉 | **10. Endpoint statystyk** | Wydajność | Średni | [x] Zrobione |
| 🥉 | **11. Hostowanie własnych treści kursów** | Funkcjonalność | Średni | [ ] Do zrobienia |
| 🥉 | **12. Responsywność + mobile first** | UX | Średni | [ ] Do zrobienia |
| 🥉 | **13. Dashboard analityczny** | Funkcjonalność | Średni | [ ] Do zrobienia |
| 14. | Wyszukiwanie/filtrowanie/sortowanie | UX | Niski | [ ] Do zrobienia |
| 15. | System kodów rabatowych | Biznes | Niski | [ ] Do zrobienia |
| 16. | Obsługa subskrypcji | Biznes | Niski | [ ] Do zrobienia |
| 17. | Wielojęzyczność (i18n) | UX | Niski | [ ] Do zrobienia |
| 18. | PWA + push notifications | UX | Niski | [ ] Do zrobienia |
| 19. | AI rekomendacje | Innowacja | Niski | [ ] Do zrobienia |
| 20. | Marketplace / afiliacja | Biznes | Niski | [ ] Do zrobienia |

---

### Wnioski końcowe

**HRL Course Hub** to dobrze zaprojektowana, nowoczesna platforma LMS w architekturze headless. Kod jest czysty, dobrze zorganizowany i używa aktualnych technologii (React 18, Vite 5, TypeScript 5, Prisma 6, Stripe). 

**Największe ryzyko** — domyślny JWT secret i brak rate limitingu — zostały naprawione. Aplikacja nadal wymaga HTTPS enforcement i testów przed pełnym wdrożeniem produkcyjnym.

**Największy potencjał** leży w:
1. Dodaniu własnego hostowania treści kursów (uniezależnienie od zewnętrznych platform)
2. Systemie powiadomień email (kluczowy dla komunikacji z użytkownikami)
3. Dashboardzie analitycznym (podejmowanie decyzji biznesowych)
4. Integracjach zewnętrznych (webhooki, n8n, Make)

Aplikacja ma solidne fundamenty i przy odpowiednich inwestycjach w bezpieczeństwo, testy i rozszerzenie funkcjonalności może stać się kompleksową platformą edukacyjną.

---

*Raport wygenerowany automatycznie na podstawie analizy kodu źródłowego. Wszystkie checklisty odzwierciedlają rzeczywisty stan implementacji na dzień 9 lipca 2026.*