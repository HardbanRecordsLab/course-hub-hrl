/**
 * HRL Course Hub — Cloudflare Worker Verifier
 *
 * Weryfikuje JWT-link (?ch_token=...) dla kursu hostowanego za Cloudflare.
 * Sprawdza podpis HS256 i datę wygaśnięcia LOKALNIE (bez zapytania do VPS).
 *
 * Wymagana zmienna środowiskowa Cloudflare Worker:
 *   COURSE_JWT_SECRET — ten sam sekret co Course.integrationSecretHash w HRL Course Hub
 *
 * Wdrożenie:
 *   1. Utwórz Worker w panelu Cloudflare
 *   2. Wklej ten kod
 *   3. Settings → Variables → dodaj COURSE_JWT_SECRET
 *   4. Settings → Triggers → Routes → dodaj route "<twoja-domena-kursu>/*"
 *   5. Zapisz i wdróż
 */

interface Env {
  COURSE_JWT_SECRET: string;
}

function base64UrlDecode(input: string): Uint8Array {
  // base64url → base64
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const base64 = padded + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeToString(input: string): string {
  return new TextDecoder().decode(base64UrlDecode(input));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

async function verifyHmacSha256(
  secret: string,
  data: string,
  signature: Uint8Array
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const computed = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  );
  return timingSafeEqual(computed, signature);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const token = url.searchParams.get("ch_token");

    if (!token) {
      return new Response("Brak tokenu dostępu. Skontaktuj się z administratorem HRL Course Hub.", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return new Response("Nieprawidłowy format tokenu.", { status: 403 });
    }

    let payload: any;
    try {
      payload = JSON.parse(base64UrlDecodeToString(parts[1]));
    } catch {
      return new Response("Nie można odczytać tokenu.", { status: 403 });
    }

    // Weryfikacja podpisu
    const signature = base64UrlDecode(parts[2]);
    const valid = await verifyHmacSha256(
      env.COURSE_JWT_SECRET,
      `${parts[0]}.${parts[1]}`,
      signature
    );
    if (!valid) {
      return new Response("Nieprawidłowy podpis tokenu.", { status: 403 });
    }

    // Weryfikacja daty wygaśnięcia
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return new Response("Token wygasł. Wygeneruj nowy link w portalu HRL Course Hub.", {
        status: 403,
      });
    }

    // Weryfikacja issuer
    if (payload.iss && payload.iss !== "HRL Course Hub") {
      return new Response("Nieprawidłowy wystawca tokenu.", { status: 403 });
    }

    // Token OK — przepuść request dalej, dodając nagłówki z info o użytkowniku
    const headers = new Headers(request.headers);
    if (payload.email) headers.set("X-CH-User-Email", String(payload.email));
    if (payload.sub) headers.set("X-CH-User-Id", String(payload.sub));
    if (payload.courseId) headers.set("X-CH-Course-Id", String(payload.courseId));

    // Usuń ?ch_token z URL przed forwardem (opcjonalne, ale czyste)
    url.searchParams.delete("ch_token");
    const cleanRequest = new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: request.redirect,
    });

    return fetch(cleanRequest);
  },
};
