import { NativeModules } from 'react-native';

const { DayaarDevice } = NativeModules;

export const AZURE_API_BASE_URL = 'https://devang-server-acf8g4e8hrftbgec.centralindia-01.azurewebsites.net/api';
export const RENDER_API_BASE_URL = 'https://dayaar-real-estate-consultant-2.onrender.com/api';
export const DEFAULT_API_BASE_URL = AZURE_API_BASE_URL;

class ApiClient {
  private baseUrl: string = DEFAULT_API_BASE_URL;
  private token: string | null = null;

  setBaseUrl(url: string) {
    this.baseUrl = url.trim().replace(/\/$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async initSession(): Promise<{ token: string | null; user: any | null }> {
    try {
      if (DayaarDevice?.getUserSession) {
        const session = await DayaarDevice.getUserSession();
        if (session?.token) {
          this.token = session.token;
          const user = session.user ? JSON.parse(session.user) : null;
          return { token: session.token, user };
        }
      }
    } catch {
      // ignore
    }
    return { token: null, user: null };
  }

  async saveSession(token: string, user: any): Promise<void> {
    this.token = token;
    if (DayaarDevice?.saveUserSession) {
      await DayaarDevice.saveUserSession(token, JSON.stringify(user));
    }
  }

  async clearSession(): Promise<void> {
    this.token = null;
    if (DayaarDevice?.clearUserSession) {
      await DayaarDevice.clearUserSession();
    }
  }

  private getBackupUrl(targetUrl: string): string | null {
    if (targetUrl.startsWith(AZURE_API_BASE_URL)) {
      return targetUrl.replace(AZURE_API_BASE_URL, RENDER_API_BASE_URL);
    }
    if (targetUrl.startsWith(RENDER_API_BASE_URL)) {
      return targetUrl.replace(RENDER_API_BASE_URL, AZURE_API_BASE_URL);
    }
    return null;
  }

  async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any,
  ): Promise<T> {
    const primaryUrl = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    return this.executeRequest<T>(primaryUrl, path, method, body, true);
  }

  private async executeRequest<T>(
    url: string,
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body: any,
    allowBackupRetry: boolean,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body !== undefined && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      clearTimeout(timer);
      const contentType = response.headers.get('content-type') || '';
      let json: any = {};

      if (contentType.includes('application/json')) {
        json = await response.json().catch(() => ({}));
      } else {
        const text = await response.text();
        try {
          json = JSON.parse(text);
        } catch {
          json = { message: text };
        }
      }

      // If service is suspended or unavailable (503), try backup server
      if ((response.status === 503 || response.status === 502 || response.status === 504) && allowBackupRetry) {
        const backupUrl = this.getBackupUrl(url);
        if (backupUrl) {
          const fallbackBase = backupUrl.startsWith(AZURE_API_BASE_URL) ? AZURE_API_BASE_URL : RENDER_API_BASE_URL;
          this.baseUrl = fallbackBase;
          return this.executeRequest<T>(backupUrl, path, method, body, false);
        }
      }

      if (!response.ok) {
        const errorMsg =
          json?.error?.message ||
          json?.message ||
          (Array.isArray(json?.errors) ? json.errors.join(', ') : null) ||
          `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      // Return data property if standard envelope exists, else return raw
      return (json?.data !== undefined ? json.data : json) as T;
    } catch (err: any) {
      clearTimeout(timer);
      if (allowBackupRetry) {
        const backupUrl = this.getBackupUrl(url);
        if (backupUrl) {
          const fallbackBase = backupUrl.startsWith(AZURE_API_BASE_URL) ? AZURE_API_BASE_URL : RENDER_API_BASE_URL;
          this.baseUrl = fallbackBase;
          return this.executeRequest<T>(backupUrl, path, method, body, false);
        }
      }
      throw err;
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, 'GET');
  }

  post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, 'POST', body);
  }

  patch<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, 'PATCH', body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, 'DELETE');
  }
}

export const api = new ApiClient();
