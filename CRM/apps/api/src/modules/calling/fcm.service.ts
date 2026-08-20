import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createSign } from 'crypto';

interface CachedToken {
  value: string;
  expiresAt: number;
}

@Injectable()
export class FcmService {
  private cachedToken: CachedToken | null = null;

  async sendDialCommand(
    registrationToken: string,
    data: Record<string, string>,
  ): Promise<void> {
    const projectId = process.env.FCM_PROJECT_ID;
    if (!projectId) {
      throw new ServiceUnavailableException({
        code: 'FCM_NOT_CONFIGURED',
        message: 'FCM credentials are required for web-initiated calling.',
      });
    }
    const accessToken = await this.getAccessToken();
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: registrationToken,
            data,
            android: {
              priority: 'high',
              ttl: '60s',
              collapseKey: `dayaar-call-${data.commandId}`,
            },
          },
        }),
      },
    );
    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException({
        code: 'FCM_DELIVERY_FAILED',
        message: `FCM rejected the call command (${response.status}).`,
        detail: detail.slice(0, 1000),
      });
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.value;
    }
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!clientEmail || !privateKey) {
      throw new ServiceUnavailableException({
        code: 'FCM_NOT_CONFIGURED',
        message: 'FCM service-account credentials are missing.',
      });
    }
    const now = Math.floor(Date.now() / 1000);
    const header = this.base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = this.base64Url(
      JSON.stringify({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    );
    const unsigned = `${header}.${claims}`;
    const signer = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const assertion = `${unsigned}.${signer.sign(privateKey).toString('base64url')}`;
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException('Unable to obtain an FCM access token.');
    }
    const token = (await response.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      value: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000,
    };
    return token.access_token;
  }

  private base64Url(value: string): string {
    return Buffer.from(value).toString('base64url');
  }
}
