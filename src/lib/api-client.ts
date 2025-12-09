import type { ApiResponse } from "@shared/types";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(path, { ...init, headers });
  if (response.status === 401 && window.location.pathname !== '/login') {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  // Handle empty response body for non-JSON responses (e.g., 204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    // Assuming a successful empty response should resolve to a specific type,
    // like an empty object or true. Adjust as needed.
    return {} as T;
  }
  const data: ApiResponse<T> = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'An API error occurred');
  }
  if (data.success === false) {
    throw new Error(data.error || 'An API error occurred');
  }
  // The API returns { success: true, data: ... }
  // We just want to return the data part.
  return data.data as T;
}