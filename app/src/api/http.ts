import { toastSuccess } from '../feedback/toast';

const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return p;
  }
  return `${base}${p}`;
}

export type StaffUser = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'assistant';
};

const TOKEN_KEY = 'jbs_staff_token';
const USER_KEY = 'jbs_staff_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStaffUser(): StaffUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffUser;
  } catch {
    return null;
  }
}

export function setStaffSession(token: string, user: StaffUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    clearStaffSession();
  }
}

export function clearStaffSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function parseApiError(err: unknown): string {
  if (!(err instanceof Error)) return 'Something went wrong';
  try {
    const body = JSON.parse(err.message) as { message?: string; errors?: Record<string, string[]> };
    if (body.message) return body.message;
    if (body.errors) {
      const first = Object.values(body.errors)[0]?.[0];
      if (first) return first;
    }
  } catch {
    /* plain text */
  }
  return err.message.length > 200 ? 'Request failed' : err.message;
}

type ApiInit = RequestInit & { json?: unknown };

export async function apiFetch(path: string, init: ApiInit = {}): Promise<Response> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const body = json !== undefined ? JSON.stringify(json) : rest.body;

  return fetch(apiUrl(path), { ...rest, headers, body });
}

export async function apiJson<T>(path: string, init: ApiInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

/** POST (or other) multipart form — do not set Content-Type; the browser adds the boundary. */
export async function apiFormDataJson<T>(
  path: string,
  formData: FormData,
  init: Omit<ApiInit, 'json' | 'body'> = {},
): Promise<T> {
  const res = await apiFetch(path, { ...init, method: init.method ?? 'POST', body: formData });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function downloadPdfGet(path: string, filename: string): Promise<void> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toastSuccess('Download started');
}

export async function downloadCsvGet(path: string, filename: string): Promise<void> {
  const res = await apiFetch(path, { headers: { Accept: 'text/csv' } });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toastSuccess('Export downloaded');
}

export async function downloadPdf(path: string, body: Record<string, string>, filename: string): Promise<void> {
  const res = await apiFetch(path, { method: 'POST', json: body });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toastSuccess('Download started');
}

export async function printPdf(path: string, body: Record<string, string>): Promise<void> {
  const res = await apiFetch(path, { method: 'POST', json: body });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 1000);
  };
}
