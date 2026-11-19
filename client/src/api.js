const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshing = null;
function refreshSession() {
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function api(path, { method = 'GET', body } = {}, retry = true) {
  const isForm = body instanceof FormData;

  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  // Jeton expiré : renouvellement silencieux, puis on rejoue la requête une fois
  if (res.status === 401 && retry && !NO_RETRY.includes(path)) {
    if (await refreshSession()) return api(path, { method, body }, false);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(data?.error || `Erreur ${res.status}`);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}