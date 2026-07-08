# HRL Course Hub — Frontend

Panel administracyjny i portal ucznia aplikacji HRL Course Hub. Statyczny build Vite wdrażany na Vercel.

## Stos technologiczny

- **React 18** + **TypeScript** + **Vite 5**
- **Tailwind CSS v3** + komponenty shadcn/ui
- **TanStack Query** (cache + zarządzanie stanem serwera)
- **React Router v6** (routing SPA)
- **Framer Motion** (animacje)
- **jsPDF** + **html2canvas** (generowanie certyfikatów PDF w przeglądarce)

## Struktura katalogów

```
src/
├── pages/             # Strony (Dashboard, Courses, Access, Certificates, …)
├── components/        # Komponenty współdzielone (AdminLayout, ProtectedRoute, …)
│   └── ui/            # Komponenty shadcn/ui (Button, Card, Dialog, …)
├── contexts/          # React contexts (AuthContext)
├── hooks/             # Custom hooks (useToast, useMobile)
├── lib/               # Klient API (api.ts), mockData, utils
├── utils/             # Narzędzia (CertificateGenerator)
└── main.tsx           # Punkt wejścia
```

## Zmienne środowiskowe

| Zmienna | Opis | Przykład |
|---|---|---|
| `VITE_API_BASE_URL` | URL backendu API | `https://api.course-hub.hardbanrecordslab.online` |

Zmienna musi zaczynać się od `VITE_`, żeby była dostępna w kodzie (`import.meta.env.VITE_*`). Wszystkie zmienne `VITE_*` są publiczne (wbudowane w bundle) — **nie umieszczaj tu sekretów**.

## Development

```bash
# instalacja zależności
npm install

# serwer dev (port 8080)
npm run dev

# build produkcyjny
npm run build

# podgląd buildu lokalnie
npm run preview

# lint
npm run lint

# testy jednostkowe (Vitest)
npm run test
```

## Backend

Frontend nie ma własnego backendu — cała logika jest w osobnym repo/serwisie (`server/`) na VPS pod adresem `https://api.course-hub.hardbanrecordslab.online`. Wszystkie wywołania idą przez klienta `src/lib/api.ts` (`apiGet`, `apiPost`, `apiPatch`, `apiDelete`).

## Routing (SPA)

| Ścieżka | Komponent | Wymaga auth |
|---|---|---|
| `/login` | LoginPage | ❌ |
| `/register` | RegisterPage | ❌ |
| `/` | Dashboard | ✅ admin |
| `/courses` | Courses | ✅ admin |
| `/users` | UsersPage | ✅ admin |
| `/access` | AccessPage | ✅ admin |
| `/certificates` | CertificatesPage | ✅ admin |
| `/activity` | ActivityPage | ✅ admin |
| `/settings` | SettingsPage | ✅ admin |
| `/portal` | StudentPortal | ✅ student lub admin |
| `/verify/:code` | VerifyCertificatePage | ❌ publiczny |
| `*` | NotFound | ❌ |

Wszystkie ścieżki po stronie klienta są obsługiwane przez `BrowserRouter` (React Router). Plik `404.html` w `dist/` zapewnia fallback na `index.html` dla nieznanych URL-i (Vercel serwuje go automatycznie).

## Certyfikaty PDF

Komponent `src/utils/CertificateGenerator.ts` generuje PDF-y w przeglądarce bez udziału backendu. Używa `html2canvas` do renderowania DOM do canvas, potem `jsPDF` do eksportu A4 landscape. Wywoływany z:

- `CertificatesPage.tsx` (admin) — przycisk "PDF" przy każdym certyfikacie
- `StudentPortal.tsx` (student) — przycisk "Pobierz certyfikat" przy kursach z certyfikatem

## Build i deploy

Build generuje statyczne pliki w `dist/`. Vercel automatycznie wykrywa zmiany w branchu `main` i robi redeploy. Konfiguracja w `vercel.json` (root directory = `frontend/`).

## Konwencje

- **Ścieżki importu**: alias `@/` wskazuje na `src/` (vite.config.ts + tsconfig)
- **Typy**: TypeScript strict mode, każdy API call ma typowany response
- **Styl**: Tailwind utility classes, design tokeny w `src/index.css` (motyw dark + zielony akcent)
- **Komponenty**: shadcn/ui dla podstawowych elementów UI
- **Nie duplikuj logiki** — komponenty współdzielone w `components/`
- **Nie hardcoduj URL-i** — zawsze przez `VITE_API_BASE_URL` z `lib/api.ts`

## Bezpieczeństwo

- Token JWT przechowywany w `localStorage` (klucz `hrl_token`)
- Wszystkie requesty API z tokenem w nagłówku `Authorization: Bearer ...`
- `protected routes` przez `ProtectedRoute` + `AuthContext`
- Żadnych sekretów w frontendzie — `VITE_*` zmienne są z definicji publiczne
