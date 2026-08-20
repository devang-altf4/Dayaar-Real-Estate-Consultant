const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  details?: any;
}

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('dayaar_access_token');
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const contentType = res.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('dayaar_access_token');
        localStorage.removeItem('dayaar_user');
        window.location.href = '/login';
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

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }

    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(res);
  }

  /**
   * Fetches a binary body with the bearer token attached. An <audio src> or a
   * plain link cannot send an Authorization header, so protected media has to
   * be pulled as a blob and played from an object URL.
   */
  async getBlob(path: string): Promise<Blob> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const token = this.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('dayaar_access_token');
        localStorage.removeItem('dayaar_user');
        window.location.href = '/login';
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
    const token = this.getAccessToken();
    const isFormData = body instanceof FormData;

    const headers: Record<string, string> = { ...extraHeaders };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body || {}),
    });

    return this.handleResponse<T>(res);
  }

  async patch<T>(path: string, body?: any): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body || {}),
    });

    return this.handleResponse<T>(res);
  }

  async delete<T>(path: string): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    return this.handleResponse<T>(res);
  }
}

export const api = new ApiClient();
