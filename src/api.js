// Thin fetch wrapper for the control plane. Cookies carry the session (HttpOnly);
// every write echoes the readable sbai_csrf cookie in a header (double-submit CSRF).

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function csrfToken() {
  const m = document.cookie.match(/(?:^|; )sbai_csrf=([^;]*)/)
  return m ? decodeURIComponent(m[1]) : ''
}

let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken()
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const detail = data && typeof data.detail === 'string' ? data.detail : res.statusText || 'Request failed'
    if (res.status === 401 && path !== '/auth/login') onUnauthorized()
    throw new ApiError(res.status, detail)
  }
  return data
}
