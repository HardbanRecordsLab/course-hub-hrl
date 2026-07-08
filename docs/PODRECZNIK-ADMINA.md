# Podręcznik administratora

Przewodnik po panelu administracyjnym HRL Course Hub — ekran po ekranie, dla osoby nietechnicznej.

## Logowanie

1. Otwórz `https://app-course-hub.hardbanrecordslab.online`
2. Wpisz email i hasło (otrzymane od dewelopera)
3. Po zalogowaniu zobaczysz Dashboard

> **Pierwsze logowanie:** zmień hasło w **Settings → Profil** (lub skontaktuj się z deweloperem, jeśli taka opcja jeszcze nie istnieje — wtedy reset hasła odbywa się przez seed).

## Dashboard (strona główna)

4 kafelki statystyk na górze:

- **Użytkownicy** — ile kont w systemie
- **Aktywne kursy** — ile kursów ma status PUBLISHED
- **Aktywne dostępy** — ile enrollment jest w statusie ACTIVE
- **Kursy płatne** — ile kursów ma `priceCents > 0`

Poniżej:

- **Ostatnie zdarzenia** — najnowsze wpisy z `AccessLog` (kto co zrobił)
- **Integracje** — status połączeń z systemami zewnętrznymi (Stripe, webhooki, itd.)

## Kursy

**Ścieżka:** menu boczne → **Kursy**

### Dodawanie nowego kursu

1. Klik **"Dodaj kurs"** (prawy górny róg)
2. Wypełnij formularz:
   - **Tytuł** — wyświetlana nazwa kursu
   - **URL kursu** — pełny adres URL, pod którym żyje treść kursu (np. `https://cyfrowy-zen.example.com`)
   - **Opis** — krótki opis (opcjonalny)
   - **Miniaturka** — URL obrazka (opcjonalny)
   - **Cena (w groszach)** — `0` = darmowy, `19900` = 199.00 PLN
   - **Waluta** — PLN / EUR / USD (3-literowy kod ISO)
   - **Status**:
     - **Szkic** (DRAFT) — niewidoczny dla studentów
     - **Opublikowany** (PUBLISHED) — widoczny, dostępny do zakupu
     - **Zarchiwizowany** (ARCHIVED) — nie sprzedajemy, ale istniejące dostępy działają
   - **Certyfikaty** — przełącz ON, jeśli chcesz wystawiać certyfikaty
   - **Tryb wystawiania** (gdy certyfikaty ON):
     - **Ręcznie** — admin sam oznacza ukończenie w zakładce Certyfikaty
     - **Automatycznie po zakupie** — certyfikat wystawiany natychmiast po zaksięgowaniu płatności
3. Klik **"Dodaj kurs"**

> **Po dodaniu kursu:** ustaw `integrationSecretHash` (patrz `docs/DODAWANIE-NOWEJ-DOMENY-KURSU.md`, krok 2) — potrzebne do generowania linków dostępowych do treści kursu.

### Edycja / usunięcie kursu

- Najedź na kartę kursu → pojawią się ikony ołówka (edycja) i kosza (usunięcie)
- Usunięcie **jest nieodwracalne** — usuwa też wszystkie powiązane dostępy i certyfikaty

## Użytkownicy

**Ścieżka:** menu boczne → **Użytkownicy**

- Lista wszystkich zarejestrowanych użytkowników
- Kolumny: email, imię, rola, data rejestracji, liczba dostępów
- Edycja: klik na użytkownika → zmień `name`, `role`, `isActive`
- **Deaktywacja** (`isActive=false`) uniemożliwia logowanie, ale nie usuwa konta

## Dostępy

**Ścieżka:** menu boczne → **Dostępy**

### Ręczne nadanie dostępu

1. Klik **"Nadaj dostęp"**
2. Wybierz **Użytkownika**
3. Wybierz **Kurs**
4. Opcjonalnie: **Data wygaśnięcia** (puste = bezterminowy)
5. **Źródło**:
   - `admin` — ręczne nadanie
   - `purchase` — przez Stripe (zazwyczaj wybierane automatycznie, nie ręcznie)
   - `free` — darmowy kurs
6. Zapisz

### Odbieranie dostępu

- W tabeli dostępów → ikona kosza przy wierszu
- Status zmieni się na REVOKED, student natychmiast traci dostęp

### Generowanie linku do kursu (z portalu studenta)

Gdy student ma aktywny dostęp, w portalu (`/portal`) klika "Otwórz kurs" — backend automatycznie generuje JWT-link z `?ch_token=...` i przekierowuje na `Course.externalUrl`.

W panelu admina nie ma osobnego przycisku "generuj link" — generowanie odbywa się po stronie studenta.

## Certyfikaty

**Ścieżka:** menu boczne → **Certyfikaty**

### Lista wystawionych certyfikatów

- Tabela: student, kurs, kod weryfikacji, data wystawienia
- Przycisk **"PDF"** przy każdym → pobiera certyfikat w PDF

### Ręczne wystawienie certyfikatu (tryb `manual`)

1. W dolnej sekcji **"Oznacz ukończenie (ręcznie)"** widoczne są enrollmenty dla kursów z `certificateEnabled=true` i `certificateIssueMode=manual`
2. Klik **"Oznacz jako ukończony"** przy wybranym studencie
3. Potwierdź
4. Certyfikat zostaje wystawiony automatycznie (pojawia się w górnej tabeli)

## Aktywność (Logi)

**Ścieżka:** menu boczne → **Aktywność**

- Pełny log audytowy — kto, co, kiedy
- Akcje:
  - `granted` — nadanie dostępu
  - `revoked` — odebranie dostępu
  - `link_generated` — wygenerowanie JWT-linku
  - `certificate_issued` — wystawienie certyfikatu
  - `login` — logowanie użytkownika
- Wyszukiwanie i filtrowanie po akcji / dacie

## Ustawienia

**Ścieżka:** menu boczne → **Ustawienia**

- Konfiguracja globalna (wkrótce rozbudowane)
- Obecnie: zmiana danych profilu admina

## Portal ucznia (widok studenta)

**Ścieżka:** jako student → `https://app-course-hub.hardbanrecordslab.online/portal`

- Lista kursów, do których student ma aktywny dostęp
- Przycisk **"Otwórz kurs"** → przekierowuje na `Course.externalUrl` z JWT-linkiem
- Przycisk **"Pobierz certyfikat"** (jeśli jest certyfikat) → generuje PDF

## Scenariusze typowe

### "Student zapomniał hasła"

1. Na stronie logowania klik **"Nie pamiętam hasła"** (jeśli zaimplementowane) lub skontaktuj się z deweloperem
2. W obecnej wersji: reset hasła wymaga bezpośredniej edycji bazy (`User.passwordHash`)

### "Student nie widzi kursu, który kupił"

1. Sprawdź **Dostępy** w panelu admina — czy enrollment istnieje i ma status ACTIVE
2. Sprawdź **Logi aktywności** — czy było `granted` po zakupie
3. Jeśli brak: sprawdź Stripe (czy płatność przeszła) i webhook (czy event `checkout.session.completed` dotarł do backendu)
4. Jeśli jest `REVOKED`: ręcznie nadaj ponownie (przycisk "Nadaj dostęp")

### "Student płacił, ale nie ma certyfikatu (tryb on_purchase)"

1. Sprawdź **Certyfikaty** w panelu — czy jest na liście
2. Sprawdź czy kurs ma `certificateEnabled=true` i `certificateIssueMode=on_purchase`
3. Jeśli tak, ale brak certyfikatu: sprawdź **Logi** pod kątem błędów w handlerze webhooka Stripe

### "Chcę cofnąć dostęp studentowi"

1. **Dostępy** → ikona kosza przy wierszu studenta
2. Status zmieni się na REVOKED — student traci dostęp natychmiast
3. Jeśli student miał certyfikat — NIE jest on automatycznie unieważniany (certyfikat to potwierdzenie ukończenia, nie aktywnego dostępu). Aby unieważnić certyfikat, edytuj `Certificate.revokedAt` w bazie.

### "Chcę dodać nową domenę kursu"

Patrz: `docs/DODAWANIE-NOWEJ-DOMENY-KURSU.md` (krok po kroku).

## Kiedy zadzwonić do dewelopera

- Brak nowych wpisów w logach (backend nie odpowiada)
- Webhook Stripe nie działa (po kilku godzinach)
- Certyfikaty się nie generują
- Studenci nie mogą się zalogować, mimo poprawnego hasła
- Cokolwiek niespodziewanego — lepiej zapytać

## Kontakt

Deweloper prowadzący: sprawdź dane kontaktowe w panelu Vercel lub w notatkach projektu.
