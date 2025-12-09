import type { ApiResponse } from "@shared/types";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(init?.headers);
  const body = init?.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  // Do not set Content-Type for FormData; browser will add the correct multipart boundary
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, { ...init, headers });

  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  // Improved 401 handling: attempt to extract server message (json or text), clear token and redirect
  if (response.status === 401 && window.location.pathname !== '/login') {
    let msg = 'Unauthorized';
    try {
      if (contentType.includes('application/json')) {
        const errJson = await response.json();
        msg = errJson?.error || errJson?.message || msg;
      } else {
        const txt = await response.text();
        if (txt) msg = txt;
      }
    } catch (e) {
      // ignore parsing errors, fallback to generic msg
    }
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    throw new Error(msg);
  }

  // Handle No Content explicitly
  if (response.status === 204) {
    return {} as T;
  }

  // If response is not JSON, handle as text
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (!response.ok) {
      const errMsg = text || response.statusText || 'An API error occurred';
      throw new Error(errMsg);
    }
    if (!text) {
      return {} as T;
    }
    try {
      const maybe = JSON.parse(text);
      // If parsed JSON contains data, return it; otherwise return whole payload
      if (maybe && typeof maybe === 'object' && Object.prototype.hasOwnProperty.call(maybe, 'data')) {
        return maybe.data as T;
      }
      return maybe as T;
    } catch {
      // plain text success response
      return text as unknown as T;
    }
  }

  // Parse JSON responses
  let payload: any;
  try {
    payload = await response.json();
  } catch (e) {
    if (!response.ok) {
      throw new Error('An API error occurred');
    }
    return {} as T;
  }

  if (!response.ok) {
    const msg = payload?.error || payload?.message || 'An API error occurred';
    throw new Error(msg);
  }

  if (payload && payload.success === false) {
    const msg = payload?.error || payload?.message || 'An API error occurred';
    throw new Error(msg);
  }

  // Normalize: if payload has `data` return it; otherwise return entire payload (e.g., { success: true, token })
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data as T;
  }
  return payload as T;
}