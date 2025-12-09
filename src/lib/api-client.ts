import { ApiResponse } from "../../shared/types"

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Read token from localStorage if available
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null

  // Build headers starting with default Content-Type
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (init && init.headers) {
    // Merge any existing headers from init into our headers
    const initHeaders = new Headers(init.headers as HeadersInit)
    initHeaders.forEach((value, key) => headers.set(key, value))
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(path, { ...init, headers })

  // Handle unauthorized consistently: redirect and throw
  if (res.status === 401) {
    try {
      if (typeof window !== 'undefined') window.location.href = '/login'
    } catch (e) {
      // ignore redirect errors
    }
    throw new Error('Unauthorized')
  }

  // Safe JSON parsing: surface useful error if parsing fails and guard null
  let json: ApiResponse<T> | null = null
  try {
    json = (await res.json()) as ApiResponse<T> | null
  } catch (e) {
    throw new Error('Invalid JSON response')
  }

  // In case server returned literal `null` or no JSON object
  if (json == null) throw new Error('Invalid JSON response')

  if (!res.ok || !json.success || json.data === undefined) throw new Error(json.error || 'Request failed')
  return json.data
}

export { api }