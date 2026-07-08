# Certyfikaty ukończenia

HRL Course Hub pozwala wystawiać certyfikaty ukończenia kursu w formacie PDF z publiczną weryfikacją.

## 1. Dwa tryby wystawiania (per kurs)

### Tryb `manual` (ręczny)

Admin sam decyduje, kiedy student ukończył kurs:

1. Student ma aktywny dostęp do kursu
2. W panelu admina: **Certyfikaty** → sekcja "Oznacz ukończenie (ręcznie)"
3. Klik **"Oznacz jako ukończony"** przy wybranym studencie
4. Backend (`PATCH /api/access/:id/complete`):
   - ustawia `Enrollment.completedAt = now()`
   - tworzy `Certificate` (jeśli jeszcze nie istnieje)
   - loguje `AccessLog` z `action=certificate_issued`

**Wymaga:** `Course.certificateEnabled = true` (wtedy w Courses → Edytuj → przełącz "Certyfikaty" na ON, tryb "Ręcznie").

### Tryb `on_purchase` (automatyczny)

Certyfikat wystawiany **automatycznie** w momencie zaksięgowania płatności:

1. Student kupuje kurs przez Stripe
2. Webhook `checkout.session.completed` → tworzy Enrollment
3. Jeśli `course.certificateEnabled && course.certificateIssueMode === "on_purchase"`:
   - tworzony jest `Certificate` natychmiast
   - logowany `AccessLog` z `action=certificate_issued, meta.mode=on_purchase`

**Wymaga:** `Course.certificateEnabled = true` i `Course.certificateIssueMode = "on_purchase"`.

## 2. Struktura certyfikatu

Każdy certyfikat zawiera:

| Pole | Skąd | Opis |
|---|---|---|
| `studentDisplayName` | Snapshot z `User.name` lub `User.email` | Imię na certyfikacie |
| `courseTitleSnapshot` | Snapshot z `Course.title` | Tytuł kursu (nie zmieni się, nawet jeśli kurs zostanie przemianowany) |
| `issuedAt` | Data wystawienia | |
| `issuedByUserId` | Kto wystawił (admin) lub null (auto) | |
| `verificationCode` | Unikalny cuid | Kod do publicznej weryfikacji |

> **Snapshoty** — zapisujemy imię i tytuł kursu w momencie wystawienia. Dzięki temu, nawet jeśli student zmieni imię lub kurs zostanie przemianowany, certyfikat wygląda tak jak w dniu wystawienia.

## 3. Pobieranie certyfikatu PDF

### Przez admina (`CertificatesPage`)
- Lista → klik "PDF" przy wybranym certyfikacie
- Frontend generuje PDF w przeglądarce (jsPDF + html2canvas) i pobiera

### Przez studenta (`StudentPortal`)
- Przy kursie, dla którego jest certyfikat → przycisk "Pobierz certyfikat"
- Ten sam generator PDF

PDF zawiera:
- Branding "HRL COURSE HUB" (górny lewy róg)
- "CERTYFIKAT UKOŃCZENIA" (napis)
- Imię studenta (duża czcionka)
- Tytuł kursu
- Data wystawienia
- Kod weryfikacyjny
- URL do publicznej weryfikacji: `https://app-course-hub.hardbanrecordslab.online/verify/{code}`

## 4. Publiczna weryfikacja (`/verify/:code`)

Każdy może sprawdzić autentyczność certyfikatu, bez logowania:

- URL: `https://app-course-hub.hardbanrecordslab.online/verify/{code}`
- Backend: `GET /api/certificates/verify/:code` (endpoint publiczny)
- Zwraca **minimalny** zestaw danych:
  ```json
  { "isValid": true, "studentName": "Jan Kowalski", "courseTitle": "Cyfrowy Zen", "issuedAt": "2026-07-01T..." }
  ```
- Dla nieznanego kodu: `404 { isValid: false, message: "Certyfikat nie znaleziony" }`
- Dla unieważnionego: `200 { isValid: false, message: "Certyfikat został unieważniony" }`

> **Prywatność:** Endpoint celowo NIE zwraca e-maila studenta, jego ID ani innych danych wrażliwych. Weryfikacja jest publiczna, więc traktuj ją jak potwierdzenie "ten certyfikat istnieje i jest ważny", a nie "oto pełne dane właściciela".

## 5. Unieważnienie certyfikatu

W obecnej wersji unieważnienie odbywa się **ręcznie** w bazie danych lub przez przyszły endpoint admina. Aby unieważnić:

```sql
UPDATE "Certificate" SET "revokedAt" = NOW() WHERE id = 'clx...';
```

Po unieważnieniu:
- `GET /api/certificates/verify/:code` zwróci `isValid: false`
- `GET /api/certificates/mine` (dla studenta) **nie zwróci** unieważnionego certyfikatu (filtruje `revokedAt: null`)

## 6. Endpointy związane z certyfikatami

| Endpoint | Auth | Opis |
|---|---|---|
| `GET /api/certificates` | admin | Lista wszystkich |
| `GET /api/certificates/mine` | zalogowany | Twoje |
| `GET /api/certificates/verify/:code` | **publiczny** | Weryfikacja |
| `PATCH /api/access/:id/complete` | admin | Wystawienie (tryb manual) |
| *(webhook)* `POST /api/webhooks/stripe` | Stripe | Wystawienie (tryb on_purchase) |

## 7. Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---|---|
| Certyfikat nie pojawia się w portalu studenta | Sprawdź czy `Certificate.revokedAt` jest null. Sprawdź czy endpoint `/api/certificates/mine` zwraca dane (curl z tokenem studenta). |
| Weryfikacja publiczna nie działa | Sprawdź czy `verificationCode` jest poprawny (pełny cuid, nie obcięty). Sprawdź logi backendu. |
| PDF się nie generuje | Sprawdź konsolę przeglądarki (F12). Czy `jspdf` i `html2canvas` są w `frontend/package.json`. |
| Certyfikat ma złe imię | Pole `studentDisplayName` to snapshot z momentu wystawienia — popraw bezpośrednio w bazie lub wystaw ponownie. |
