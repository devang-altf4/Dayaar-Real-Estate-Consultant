const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dayaar-real-estate-consultant-5ahf.onrender.com/api';

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  details?: any;
}

function isAuthPath(path: string): boolean {
  return path.includes('/auth/login') || path.includes('/auth/refresh');
}

class ApiClient {
  private refreshPromise: Promise<string> | null = null;

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('dayaar_access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('dayaar_refresh_token');
  }

  private clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('dayaar_access_token');
    localStorage.removeItem('dayaar_refresh_token');
    localStorage.removeItem('dayaar_user');
  }

  private redirectToLogin() {
    if (typeof window === 'undefined') return;
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  /** Single-flight refresh: concurrent 401s share one POST /auth/refresh. */
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshPromise) {
      const rt = this.getRefreshToken();
      if (!rt) {
        const err: any = new Error('No refresh token available');
        err.status = 401;
        err.code = 'NO_REFRESH_TOKEN';
        throw err;
      }
      this.refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
        .then(async (r) => {
          let data: any = null;
          try {
            data = await r.json();
          } catch {
            data = null;
          }
          if (!r.ok) {
            const msg =
              (data && typeof data === 'object' && (data.message || data.error)) ||
              'Session expired. Please log in again.';
            const err: any = new Error(Array.isArray(msg) ? msg[0] : msg);
            err.status = r.status;
            err.code = (data && data.code) || 'INVALID_REFRESH_TOKEN';
            throw err;
          }
          const t = data?.data ?? data;
          if (!t?.accessToken) throw Object.assign(new Error('Invalid refresh response'), { status: 401 });
          localStorage.setItem('dayaar_access_token', t.accessToken);
          // Rotation: backend may issue a new refresh token
          if (t.refreshToken) localStorage.setItem('dayaar_refresh_token', t.refreshToken);
          try {
            window.dispatchEvent(new CustomEvent('dayaar:token-refreshed', { detail: t.accessToken }));
          } catch {
            /* noop */
          }
          return t.accessToken as string;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  private async handleResponse<T>(res: Response, retry?: () => Promise<Response>): Promise<T> {
    const contentType = res.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      // Attempt silent refresh once for expired access tokens (not for auth endpoints themselves)
      const retryable = res.status === 401 && retry && !(retry as any)._retry;
      if (retryable) {
        (retry as any)._retry = true;
        try {
          await this.refreshAccessToken();
          const retryRes = await retry!();
          return this.handleResponse<T>(retryRes);
        } catch (refreshErr: any) {
          // Refresh failed (expired/revoked) — hard logout with full cleanup
          this.clearSession();
          this.redirectToLogin();
          throw refreshErr;
        }
      }

      // Non-retryable 401 (e.g. refresh endpoint itself, or second failure) — logout
      if (res.status === 401) {
        // Don't redirect-loop when already handling refresh/login failure; still clear session
        if (!(retry as any)?._isAuthCall) {
          this.clearSession();
          this.redirectToLogin();
        }
      }

      const errorMsg =
        (data && typeof data === 'object' && (data.message || data.error)) ||
        `Request failed with status ${res.status}`;
      const errorCode = (data && typeof data === 'object' && data.code) || 'API_ERROR';
      const error = new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg) as any;
      error.code = errorCode;
      error.status = res.status;
      error.details = data?.details;
      throw error;
    }

    // Unwrap { success: true, data: T } if present
    if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
      return data.data as T;
    }

    return data as T;
  }

  private authHeaders(extra: Record<string, string> = {}, tokenOverride?: string): Record<string, string> {
    const token = tokenOverride ?? this.getAccessToken();
    const headers: Record<string, string> = { ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }

    const doFetch = (token?: string) =>
      fetch(url.toString(), {
        method: 'GET',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }, token),
      });

    const token = this.getAccessToken();
    const res = await doFetch(token ?? undefined);
    if (res.status === 401 && !isAuthPath(path)) {
      return this.handleResponse<T>(res, () => doFetch(this.getAccessToken() ?? undefined));
    }
    const fn: any = () => doFetch(this.getAccessToken() ?? undefined);
    fn._isAuthCall = isAuthPath(path);
    return this.handleResponse<T>(res, isAuthPath(path) ? undefined : fn);
  }

  /**
   * Fetches a binary body with the bearer token attached. An <audio src> or a
   * plain link cannot send an Authorization header, so protected media has to
   * be pulled as a blob and played from an object URL.
   */
  async getBlob(path: string): Promise<Blob> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const doFetch = (token?: string) => {
      const headers: Record<string, string> = {};
      const t = token ?? this.getAccessToken();
      if (t) headers['Authorization'] = `Bearer ${t}`;
      return fetch(url, { method: 'GET', headers });
    };

    let res = await doFetch();
    if (res.status === 401 && !isAuthPath(path)) {
      try {
        const fresh = await this.refreshAccessToken();
        res = await doFetch(fresh);
      } catch {
        this.clearSession();
        this.redirectToLogin();
        throw new Error('Session expired. Please log in again.');
      }
    }
    if (!res.ok) {
      if (res.status === 401) {
        this.clearSession();
        this.redirectToLogin();
      }
      throw new Error(`Request failed with status ${res.status}`);
    }
    return res.blob();
  }

  async post<T>(
    path: string,
    body?: any,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const isFormData = body instanceof FormData;

    const doFetch = (token?: string) => {
      const headers: Record<string, string> = { ...extraHeaders };
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      const t = token ?? this.getAccessToken();
      if (t) headers['Authorization'] = `Bearer ${t}`;
      return fetch(url, {
        method: 'POST',
        headers,
        body: isFormData ? body : JSON.stringify(body || {}),
      });
    };

    const res = await doFetch();
    if (res.status === 401 && !isAuthPath(path)) {
      return this.handleResponse<T>(res, () => doFetch(this.getAccessToken() ?? undefined));
    }
    const fn: any = () => doFetch(this.getAccessToken() ?? undefined);
    fn._isAuthCall = isAuthPath(path);
    return this.handleResponse<T>(res, isAuthPath(path) ? undefined : fn);
  }

  async patch<T>(path: string, body?: any): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

    const doFetch = (token?: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const t = token ?? this.getAccessToken();
      if (t) headers['Authorization'] = `Bearer ${t}`;
      return fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body || {}),
      });
    };

    const res = await doFetch();
    if (res.status === 401 && !isAuthPath(path)) {
      return this.handleResponse<T>(res, () => doFetch(this.getAccessToken() ?? undefined));
    }
    return this.handleResponse<T>(res, undefined);
  }

  async put<T>(path: string, body?: any): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const doFetch = (token?: string) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const t = token ?? this.getAccessToken();
      if (t) headers['Authorization'] = `Bearer ${t}`;
      return fetch(url, { method: 'PUT', headers, body: JSON.stringify(body || {}) });
    };
    const res = await doFetch();
    if (res.status === 401 && !isAuthPath(path)) {
      return this.handleResponse<T>(res, () => doFetch(this.getAccessToken() ?? undefined));
    }
    return this.handleResponse<T>(res, undefined);
  }

  async delete<T>(path: string): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

    const doFetch = (token?: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const t = token ?? this.getAccessToken();
      if (t) headers['Authorization'] = `Bearer ${t}`;
      return fetch(url, {
        method: 'DELETE',
        headers,
      });
    };

    const res = await doFetch();
    if (res.status === 401 && !isAuthPath(path)) {
      return this.handleResponse<T>(res, () => doFetch(this.getAccessToken() ?? undefined));
    }
    return this.handleResponse<T>(res, undefined);
  }

  logoutLocal() {
    this.clearSession();
    this.refreshPromise = null;
  }
}

export const api = new ApiClient();
