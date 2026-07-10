const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3001";

function getToken() {
  return localStorage.getItem("hrl_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { "Content-Type": "application/json", ...authHeaders() } });
  if (!res.ok) throw new Error((await res.json()).message || `GET ${path} failed`);
  const json = await res.json();
  return (json && typeof json.data !== "undefined") ? (json.data as T) : (json as T);
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).message || `POST ${path} failed`);
  return res.json();
}

export async function apiPatch<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).message || `PATCH ${path} failed`);
  return res.json();
}

export async function apiDelete(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers: { ...authHeaders() } });
  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.message || `DELETE ${path} failed`);
    } catch {
      throw new Error(text || `DELETE ${path} failed`);
    }
  }
}

export { API_BASE };
