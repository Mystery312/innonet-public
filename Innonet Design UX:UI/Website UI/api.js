/* api.js — InnoNet auth API client
   Mirrors backend at /api/v1/auth/*
   Handles token storage, refresh, and OAuth redirects. */
(function () {
  const API_BASE = (window.__INNONET_API_BASE__ || 'http://localhost:8000/api/v1').replace(/\/$/, '');

  const TOKEN_KEY   = 'access_token';
  const REFRESH_KEY = 'refreshToken';

  const getAccess  = () => localStorage.getItem(TOKEN_KEY);
  const getRefresh = () => localStorage.getItem(REFRESH_KEY);
  const setTokens  = (a, r) => {
    if (a) localStorage.setItem(TOKEN_KEY, a);
    if (r) localStorage.setItem(REFRESH_KEY, r);
  };
  const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  };

  async function request(path, { method = 'GET', body, auth = false, retried = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && getAccess()) headers.Authorization = `Bearer ${getAccess()}`;

    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      const e = new Error('Network error — is the backend running at ' + API_BASE + '?');
      e.code = 'NETWORK';
      throw e;
    }

    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch { data = { detail: text }; } }

    if (res.ok) return data;

    // Try refresh on 401, once
    if (res.status === 401 && auth && !retried && getRefresh()) {
      try {
        const r = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refresh_token: getRefresh() }),
        });
        if (r.ok) {
          const json = await r.json();
          setTokens(json.access_token, json.refresh_token);
          return request(path, { method, body, auth, retried: true });
        }
      } catch {}
      clearTokens();
    }

    const err = new Error(data?.detail || `Request failed (${res.status})`);
    err.status = res.status;
    err.detail = data?.detail;
    err.data = data;
    throw err;
  }

  window.innonetApi = {
    base: API_BASE,
    getAccess, getRefresh, setTokens, clearTokens,

    // Auth
    register: (payload) =>
      // payload: { username, password, email? | phone? }
      request('/auth/register', { method: 'POST', body: payload }),

    login: async ({ identifier, password }) => {
      const data = await request('/auth/login', {
        method: 'POST',
        body: { identifier, password },
      });
      if (data?.access_token) setTokens(data.access_token, data.refresh_token);
      return data;
    },

    logout: async () => {
      const refresh_token = getRefresh();
      try { await request('/auth/logout', { method: 'POST', auth: true, body: { refresh_token } }); }
      catch {}
      clearTokens();
    },

    me: () => request('/auth/me', { auth: true }),

    forgotPassword: (email) =>
      request('/auth/forgot-password', { method: 'POST', body: { email } }),

    resetPassword: (token, new_password) =>
      request('/auth/reset-password', { method: 'POST', body: { token, new_password } }),

    verifyEmail: (token) =>
      request(`/auth/verify-email?token=${encodeURIComponent(token)}`),

    resendVerification: (email) =>
      request('/auth/resend-verification-email', { method: 'POST', body: { email } }),

    // OAuth — full-page redirect
    oauthAuthorize: (provider) => {
      window.location.href = `${API_BASE}/auth/oauth/${provider}/authorize`;
    },

    // ───────── Discover ─────────
    discoverFeed: ({ limit = 20, offset = 0, location, minSimilarity = 0.5, strategy = 'mixed' } = {}) => {
      const q = new URLSearchParams({ limit, offset, min_similarity: minSimilarity, strategy });
      if (location) q.set('location', location);
      return request(`/discover/feed?${q.toString()}`, { auth: true });
    },

    discoverSwipe: ({ target_user_id, action, message }) =>
      request('/discover/swipe', {
        method: 'POST', auth: true,
        body: { target_user_id, action, ...(message ? { message } : {}) },
      }),

    discoverStats: () => request('/discover/stats', { auth: true }),
  };
})();
