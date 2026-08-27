import { NativeModules } from 'react-native';
import { api, DEFAULT_API_BASE_URL } from './client';

const { DayaarDevice } = NativeModules;

export interface PairingQrData {
  pairingCode: string;
  pairingToken: string;
  apiBaseUrl: string;
}

export function parsePairingQrData(scanned: string): PairingQrData | null {
  if (!scanned || typeof scanned !== 'string') return null;
  const raw = scanned.trim();

  // 1. Try parsing JSON if formatted as JSON object
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      const pairingCode = parsed.pairingCode || parsed.code || '';
      const pairingToken = parsed.pairingToken || parsed.token || '';
      const apiBaseUrl =
        parsed.apiBaseUrl || parsed.api || parsed.baseUrl || api.getBaseUrl() || DEFAULT_API_BASE_URL;
      if (pairingCode && pairingToken) {
        return {
          pairingCode: String(pairingCode).trim(),
          pairingToken: String(pairingToken).trim(),
          apiBaseUrl: String(apiBaseUrl).trim().replace(/\/$/, ''),
        };
      }
    } catch {
      // Ignore JSON parse errors and continue to query param / URL parsing
    }
  }

  // 2. Parse URI / Query Params (e.g. dayaarcrm://pair?code=...&token=...&api=... or https://...)
  try {
    const queryIndex = raw.indexOf('?');
    const queryString = queryIndex !== -1 ? raw.substring(queryIndex + 1) : raw;

    const pairs = queryString.split('&');
    const params: Record<string, string> = {};
    for (const pair of pairs) {
      if (!pair) continue;
      const [key, ...rest] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key.trim())] = decodeURIComponent(rest.join('='));
      }
    }

    let pairingCode = params['code'] || params['pairingCode'] || '';
    let pairingToken = params['token'] || params['pairingToken'] || '';
    let apiBaseUrl = params['api'] || params['apiBaseUrl'] || params['baseUrl'] || '';

    // Regex fallback if query format has edge cases
    if (!pairingCode) {
      const codeMatch = raw.match(/[?&](?:code|pairingCode)=([^&]+)/i);
      if (codeMatch) pairingCode = decodeURIComponent(codeMatch[1]);
    }
    if (!pairingToken) {
      const tokenMatch = raw.match(/[?&](?:token|pairingToken)=([^&]+)/i);
      if (tokenMatch) pairingToken = decodeURIComponent(tokenMatch[1]);
    }
    if (!apiBaseUrl) {
      const apiMatch = raw.match(/[?&](?:api|apiBaseUrl|baseUrl)=([^&]+)/i);
      if (apiMatch) apiBaseUrl = decodeURIComponent(apiMatch[1]);
    }

    if (!apiBaseUrl) {
      apiBaseUrl = api.getBaseUrl() || DEFAULT_API_BASE_URL;
    }

    if (pairingCode && pairingToken) {
      return {
        pairingCode: pairingCode.trim(),
        pairingToken: pairingToken.trim(),
        apiBaseUrl: apiBaseUrl.trim().replace(/\/$/, ''),
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function executeDevicePairing(): Promise<{ success: boolean; message?: string }> {
  if (!DayaarDevice?.scanPairingQr || !DayaarDevice?.pairDevice) {
    throw new Error('QR pairing is only available on physical Android devices.');
  }

  const scanned = await DayaarDevice.scanPairingQr();
  if (!scanned) {
    return { success: false, message: 'Scan cancelled.' };
  }

  const parsed = parsePairingQrData(scanned);
  if (!parsed) {
    throw new Error(
      'Invalid QR code format. Please scan the QR code displayed in Web CRM (Calling > Pair Android Device).',
    );
  }

  await DayaarDevice.pairDevice(parsed.apiBaseUrl, parsed.pairingCode, parsed.pairingToken);

  if (DayaarDevice?.sendHeartbeat) {
    try {
      await DayaarDevice.sendHeartbeat();
    } catch {
      // heartbeat is best-effort
    }
  }

  return { success: true, message: 'Handset paired successfully with Web CRM!' };
}
