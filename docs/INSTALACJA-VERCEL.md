# Instalacja Frontend na Vercel

Kompletna instrukcja wdrożenia panelu HRL Course Hub (React + Vite) na Vercel pod domeną `app-course-hub.hardbanrecordslab.online`.

## 1. Wymagania wstępne

- Konto na [vercel.com](https://vercel.com)
- Repozytorium GitHub (GitLab / Bitbucket) z kodem frontendu
- Backend już wdrożony na VPS pod `https://api.course-hub.hardbanrecordslab.online` (patrz `docs/INSTALACJA-VPS.md`)
- Domena `app-course-hub.hardbanrecordslab.online` zarządzana w Cloudflare (rekord CNAME na `cname.vercel-dns.com`)

## 2. Połączenie repozytorium

1. Zaloguj się na [vercel.com](https://vercel.com)
2. Kliknij **"Add New Project"**
3. Wybierz **"Import Git Repository"** → wskaż repo `hrl-course-hub`
4. W sekcji **"Configure Project"** ustaw:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (powinno wykryć się automatycznie)
   - **Build Command**: `npm run build` (domyślne)
   - **Output Directory**: `dist` (domyślne dla Vite)
   - **Install Command**: `npm install` (domyślne)

## 3. Zmienne środowiskowe (Environment Variables)

Przed pierwszym deploymentem dodaj zmienną:

| Zmienna | Wartość | Środowisko |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.course-hub.hardbanrecordslab.online` | Production, Preview, Development |

Aby dodać zmienną:

1. W konfiguracji projektu wejdź w **Settings → Environment Variables**
2. Wpisz nazwę (`VITE_API_BASE_URL`) i wartość
3. Zaznacz wszystkie trzy środowiska (Production / Preview / Development)
4. Kliknij **"Save"**

> **Uwaga:** W Vite zmienne środowiskowe muszą zaczynać się od `VITE_`, żeby były dostępne w kodzie przez `import.meta.env.VITE_*`. Nie dodawaj tu sekretów serwerowych — to zmienne PUBLICZNE.

## 4. Pierwszy deployment

Kliknij **"Deploy"**. Vercel:
- zainstaluje zależności (`npm install`)
- zbuduje projekt (`npm run build`)
- wrzuci statyczny build na CDN
- przypisze tymczasowy URL typu `hrl-course-hub.vercel.app`

## 5. Podłączenie domeny niestandardowej

1. W projekcie Vercel: **Settings → Domains**
2. Wpisz `app-course-hub.hardbanrecordslab.online`
3. Vercel pokaże rekord DNS do dodania w Cloudflare:
   - Typ: `CNAME`
   - Nazwa: `app-course-hub`
   - Target: `cname.vercel-dns.com`
4. W panelu Cloudflare dodaj ten rekord
5. Poczekaj na propagację (zazwyczaj kilka minut, max 24h)
6. Vercel **automatycznie** wygeneruje certyfikat SSL (Let's Encrypt)

## 6. Konfiguracja DNS w Cloudflare (jeśli jeszcze nie masz)

```
app-course-hub.hardbanrecordslab.online.  CNAME  cname.vercel-dns.com
api.course-hub.hardbanrecordslab.online.  A      84.247.162.167
```

W Cloudflare dla rekordu `app-course-hub` ustaw proxy na **DNS only** (szara chmurka, nie pomarańczowa), bo Vercel sam terminuje SSL.

## 7. Automatyczne deploymenty

Każdy `git push` do brancha `main` triggeruje automatyczny redeploy na produkcję. Dla innych branchy Vercel tworzy **Preview Deployments** z unikalnymi URLami (przydatne do testów przed mergem).

Aby wyłączyć auto-deploy dla brancha:
- **Settings → Git → Production Branch** — ustaw na konkretny branch
- **Settings → Git → Ignored Build Step** — opcjonalna komenda blokująca build

## 8. Sprawdzanie logów builda

- **Deployments** → kliknij konkretny deployment → **"Building"** lub **"Runtime Logs"**
- W terminalu: `vercel logs` (wymaga Vercel CLI)

## 9. Wymuszenie nowego buildu bez zmian w kodzie

W zakładce **Deployments** → trzy kropki przy ostatnim udanym deployu → **"Redeploy"**.

## 10. Rollback do poprzedniej wersji

**Deployments** → wybierz poprzedni udany deployment → **"Promote to Production"**.

## 11. Diagnostyka problemów

| Problem | Rozwiązanie |
|---|---|
| Build fails: "Cannot find module" | Sprawdź `frontend/package.json` — czy `jspdf` i `html2canvas` są w `dependencies` (nie `devDependencies`). |
| Build fails: TypeScript errors | `cd frontend && npm run build` lokalnie, popraw błędy, wypchnij poprawkę. |
| Strona biała / pusty ekran | Sprawdź konsolę przeglądarki (F12). Często brak `VITE_API_BASE_URL` w env Vercel. |
| CORS error w konsoli | Sprawdź `CORS_ORIGIN` w `.env` backendu — musi być dokładnie `https://app-course-hub.hardbanrecordslab.online` (z `https`, bez trailing slash). |
| Stare dane w przeglądarce | Wyczyść cache / hard refresh (Ctrl+Shift+R). Vercel serwuje z CDN, więc może chwilę trwać propagacja. |

## 12. Następne kroki

Po udanym deployu:

1. Wejdź na `https://app-course-hub.hardbanrecordslab.online`
2. Zaloguj się kontem admina (credentials z `prisma/seed.ts` / zmienne `ADMIN_EMAIL` + `ADMIN_PASSWORD` z `.env`)
3. **Zmień hasło admina** (Settings lub przez seed na nowo)
4. Dodaj pierwszy kurs (patrz `docs/PODRECZNIK-ADMINA.md`)
5. Skonfiguruj Stripe (patrz `docs/STRIPE.md`)
