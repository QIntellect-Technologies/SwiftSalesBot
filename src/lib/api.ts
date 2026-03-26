/**
 * Local API utility — thin fetch wrapper pointing at the swiftbot Express server.
 * Replaces all Supabase client calls in the admin panel.
 */

const BASE_URL = 'http://localhost:3005';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const apiGet  = <T>(path: string)                          => request<T>(path, { method: 'GET' });
export const apiPost = <T>(path: string, body: unknown)           => request<T>(path, { method: 'POST',   body: JSON.stringify(body) });
export const apiPut  = <T>(path: string, body: unknown)           => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) });
export const apiDelete = <T>(path: string, body?: unknown)        => request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });
export const apiFetch = <T>(path: string, options: RequestInit = {}) => request<T>(path, options);

