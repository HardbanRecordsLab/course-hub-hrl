# Dokumentacja HRL Course Hub

## Co to jest HRL Course Hub?

**HRL Course Hub** to platforma dystrybucji dostępu do kursów zewnętrznych. Jest to rejestr użytkowników, płatności (Stripe), system generowania linków JWT do kursów oraz panel administracyjny — wszystko w jednym miejscu.

### Czego NIE jest HRL Course Hub?

- **Nie jest to LMS** — nie hostuje treści kursów, nie ma lekcji, quizów ani materiałów edukacyjnych wewnątrz platformy.
- **Nie jest kreatorem kursów** — kursy żyją na zewnętrznych domenach (np. WordPress, Cloudflare, dedykowany serwer). HRL Course Hub tylko sprzedaje dostęp i generuje bezpieczne linki do nich.
- **Nie zastępuje Stripe** — Stripe obsługuje płatności. HRL Course Hub odbiera webhooki od Stripe i automatycznie nadaje dostęp.

## Co robi HRL Course Hub?

1. Sprzedaż dostępu do kursów płatnych i darmowych
2. Rejestracja i logowanie użytkowników
3. Automatyczne nadawanie dostępu po płatności (Stripe webhook)
4. Generowanie linków JWT z limitem czasowym dla kursów zewnętrznych
5. Wystawianie certyfikatów ukończenia kursu
6. Publiczna weryfikacja certyfikatów
7. Panel administracyjny do zarządzania użytkownikami, dostępami i kursami
8. Logowanie wszystkich zdarzeń

## Wymagania wstępne

Przed rozpoczęciem pracy przygotuj:

| Komponent | Wersja / Szczegóły |
|-----------|-------------------|
| Node.js | 20+ (zalecane użycie nvm lub NodeSource) |
| PostgreSQL | 15+ |
| Stripe | Konto w trybie test lub live |
| VPS | Serwer z SSH (np. Ubuntu 22.04/24.04) |
| Vercel | Konto do hostowania frontendu |
| Domena | `hardbanrecordslab.online` (lub własna) |

## Spis treści

| Dokument | Opis |
|----------|------|
| [ARCHITEKTURA.md](ARCHITEKTURA.md) | Diagram architektury, podział VPS/Vercel, przepływ danych |
| [INSTALACJA-VPS.md](INSTALACJA-VPS.md) | Konfiguracja serwera VPS krok po kroku |
| [INSTALACJA-VERCEL.md](INSTALACJA-VERCEL.md) | Wdrożenie frontendu na Vercel |
| [API.md](API.md) | Pełna specyfikacja API — wszystkie endpointy z przykładami |
| [ZMIENNE-SRODOWISKOWE.md](ZMIENNE-SRODOWISKOWE.md) | Wszystkie zmienne środowiskowe z opisem |
| [MODEL-DANYCH.md](MODEL-DANYCH.md) | Opis modelu danych (tabele, relacje, enumy) |
| [STRIPE.md](STRIPE.md) | Konfiguracja Stripe, webhooki, tryby test/live |
| [CERTYFIKATY.md](CERTYFIKATY.md) | Wystawianie, pobieranie i weryfikacja certyfikatów |
| [DODAWANIE-NOWEJ-DOMENY-KURSU.md](DODAWANIE-NOWEJ-DOMENY-KURSU.md) | Jak podłączyć nową domenę kursu z weryfikatorem JWT |
| [PODRECZNIK-ADMINA.md](PODRECZNIK-ADMINA.md) | Przewodnik po panelu administracyjnym |

## Szybki start — co trzeba zrobić, żeby platforma działała?

### Krok 1 — VPS
Zlokalizujyny serwer VPS, zainstaluj Node.js 20+, PostgreSQL 15+, sklonuj repozytorium i skonfiguruj plik `.env` (patrz [ZMIENNE-SRODOWISKOWE.md](ZMIENNE-SRODOWISKOWE.md)). Następnie uruchom migracje bazy, seed administratora i wykonaj deploy.

Szczegółowa instrukcja: [INSTALACJA-VPS.md](INSTALACJA-VPS.md)

### Krok 2 — Vercel
Podłącz repozytorium GitHub do Vercel, wskazuj root `frontend/`, ustaw zmienną `VITE_API_BASE_URL` i włącz własną domenę `app-course-hub.hardbanrecordslab.online`.

Szczegółowa instrukcja: [INSTALACJA-VERCEL.md](INSTALACJA-VERCEL.md)

### Krok 3 — Stripe
Stwórz produkt/kurs w panelu Stripe lub konfiguruj dynamiczne ceny, ustaw webhook URL na `https://api.course-hub.hardbanrecordslab.online/api/webhooks/stripe` i wybierz wersję testową.

Szczegółowa instrukcja: [STRIPE.md](STRIPE.md)

### Krok 4 — Kurs zewnętrzny
Dodaj kurs w panelu admin, wygeneruj JWT secret dla kursu, wdroż weryfikator na domenie kursu.

Szczegółowa instrukcja: [DODAWANIE-NOWEJ-DOMENY-KURSU.md](DODAWANIE-NOWEJ-DOMENY-KURSU.md)
