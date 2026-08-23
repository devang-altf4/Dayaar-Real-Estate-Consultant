import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  manufacturer: string;
  model: string;
  appVersion: string;
  fcmToken: string;
  simState: 'READY' | 'ABSENT' | 'LOCKED' | 'UNKNOWN';
  simOperator?: string;
}

interface PairingState {
  paired: boolean;
  deviceId?: string;
  apiBaseUrl?: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  details?: Array<{ path?: string; message?: string }>;
}

const { DayaarDevice } = NativeModules as {
  DayaarDevice: {
    scanPairingQr(): Promise<string>;
    getDeviceInfo(): Promise<DeviceInfo>;
    getPairingState(): Promise<PairingState>;
    saveDeviceCredentials(apiBaseUrl: string, deviceId: string, deviceToken: string): Promise<boolean>;
    clearDeviceCredentials(): Promise<boolean>;
    sendHeartbeat(): Promise<boolean>;
    placeCall(phoneNumber: string): Promise<boolean>;
  };
};

const normalizeApiUrl = (value: string) => value.trim().replace(/\/$/, '');

const isLoopbackApiUrl = (value: string) =>
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(value.trim());

async function apiRequest<T>(apiBaseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
  const normalizedBaseUrl = normalizeApiUrl(apiBaseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${normalizedBaseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const responseText = await response.text();
    let body = {} as ApiEnvelope<T> & T;
    if (responseText) {
      try {
        body = JSON.parse(responseText) as ApiEnvelope<T> & T;
      } catch {
        throw new Error(`The API returned an invalid response (${response.status}).`);
      }
    }
    if (!response.ok) {
      const detailMessage = body.details
        ?.map((detail) => `${detail.path ? `${detail.path}: ` : ''}${detail.message || ''}`)
        .filter(Boolean)
        .join('\n');
      throw new Error(detailMessage || body.message || `Request failed (${response.status})`);
    }
    return body.data !== undefined ? body.data : (body as T);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Timed out connecting to ${normalizedBaseUrl}. Check the API URL and local port forwarding.`);
    }
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach ${normalizedBaseUrl}. Check the API URL, network, and that the API is running.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function App(): React.JSX.Element {
  const [apiBaseUrl, setApiBaseUrl] = useState('http://127.0.0.1:4000/api');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingToken, setPairingToken] = useState('');
  const [manualPairingValue, setManualPairingValue] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [pairingState, setPairingState] = useState<PairingState>({ paired: false });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [currentLead, setCurrentLead] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('Initializing handset...');

  const applyPairingLink = useCallback((url: string | null): boolean => {
    const value = url?.trim();
    if (!value?.startsWith('dayaarcrm://pair?')) return false;

    try {
      const query = value.split('?')[1] || '';
      const params = Object.fromEntries(
        query.split('&').filter(Boolean).map((entry) => {
          const [key, ...parts] = entry.split('=');
          return [decodeURIComponent(key), decodeURIComponent(parts.join('='))];
        }),
      );
      const code = params.code;
      const token = params.token;
      const api = params.api;
      if (!/^\d{6}$/.test(code || '') || !token) return false;

      setPairingCode(code);
      setPairingToken(token);
      // Preserve the Android-local URL for browser loopback links. The launch script
      // forwards 127.0.0.1:4000 to the development API for USB-connected handsets.
      if (api && !isLoopbackApiUrl(api)) setApiBaseUrl(normalizeApiUrl(api));
      setStatus(
        api && isLoopbackApiUrl(api)
          ? 'Pairing QR loaded. Confirm the API URL below is reachable from this phone.'
          : 'Pairing QR loaded. Review and pair this phone.',
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        if (Platform.OS === 'android') {
          const permissions = [PermissionsAndroid.PERMISSIONS.CALL_PHONE, PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE];
          if (Number(Platform.Version) >= 33) permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          await PermissionsAndroid.requestMultiple(permissions);
        }
        const [info, savedState, initialUrl] = await Promise.all([
          DayaarDevice.getDeviceInfo(),
          DayaarDevice.getPairingState(),
          Linking.getInitialURL(),
        ]);
        setDeviceInfo(info);
        setPairingState(savedState);
        if (savedState.apiBaseUrl) setApiBaseUrl(savedState.apiBaseUrl);
        const receivedInitialLink = applyPairingLink(initialUrl);
        if (!receivedInitialLink) {
          setStatus(savedState.paired ? 'Paired and ready for SIM dial commands.' : 'Scan the pairing QR shown in the web CRM.');
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to initialize the device.');
      }
    })();
    const subscription = Linking.addEventListener('url', ({ url }) => applyPairingLink(url));
    return () => subscription.remove();
  }, [applyPairingLink]);

  useEffect(() => {
    if (!pairingState.paired) return;
    const heartbeat = () => DayaarDevice.sendHeartbeat().catch(() => setStatus('Heartbeat failed. Check API connectivity.'));
    void heartbeat();
    const timer = setInterval(heartbeat, 30_000);
    return () => clearInterval(timer);
  }, [pairingState.paired]);

  const scanPairingQr = async () => {
    setScanning(true);
    try {
      const pairingLink = await DayaarDevice.scanPairingQr();
      if (!applyPairingLink(pairingLink)) {
        Alert.alert('Invalid pairing QR', 'Scan the current QR shown in the Dayaar web CRM.');
      }
    } catch (error) {
      const scannerError = error as Error & { code?: string };
      if (scannerError.code !== 'SCAN_CANCELLED') {
        Alert.alert('Unable to scan QR', scannerError.message || 'The QR scanner could not be opened.');
      }
    } finally {
      setScanning(false);
    }
  };

  const updateManualPairingValue = (value: string) => {
    setManualPairingValue(value);
    const normalized = value.trim();
    if (normalized.startsWith('dayaarcrm://pair?')) {
      if (!applyPairingLink(normalized)) {
        setStatus('The pasted pairing link is invalid or incomplete.');
      }
      return;
    }
    setPairingToken(normalized);
  };

  const pairDevice = async () => {
    if (!deviceInfo) {
      Alert.alert('Device still initializing', 'Wait a moment and try pairing again.');
      return;
    }
    if (!/^https?:\/\//i.test(apiBaseUrl.trim())) {
      Alert.alert('Invalid API URL', 'Enter a complete HTTP or HTTPS API URL.');
      return;
    }
    if (!/^\d{6}$/.test(pairingCode) || !pairingToken) {
      Alert.alert('Pairing details missing', 'Scan the web QR or enter the six-digit code and pairing token.');
      return;
    }
    setBusy(true);
    setStatus('Connecting to the Dayaar API and claiming this pairing code...');
    try {
      const result = await apiRequest<{ deviceAuthToken: string; deviceId: string }>(apiBaseUrl, '/devices/pair', {
        method: 'POST',
        body: JSON.stringify({
          pairingCode,
          pairingToken,
          ...deviceInfo,
          capabilities: { canPlaceCalls: true, canReadCallLogs: false, canSyncRecordings: false },
        }),
      });
      await DayaarDevice.saveDeviceCredentials(normalizeApiUrl(apiBaseUrl), result.deviceId, result.deviceAuthToken);
      setPairingState({ paired: true, deviceId: result.deviceId, apiBaseUrl: normalizeApiUrl(apiBaseUrl) });
      setPairingCode('');
      setPairingToken('');
      setManualPairingValue('');
      setStatus('Paired and ready for SIM dial commands.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown pairing error';
      setStatus(`Pairing failed: ${message}`);
      Alert.alert('Pairing failed', message);
    } finally {
      setBusy(false);
    }
  };

  const loginAndLoadQueue = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Valid work email required', 'Enter the employee email used to sign in to Dayaar CRM.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password required', 'Enter the employee CRM password (at least six characters).');
      return;
    }

    setBusy(true);
    setStatus('Signing in and loading the employee call queue...');
    try {
      const auth = await apiRequest<any>(apiBaseUrl, '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      setAccessToken(auth.accessToken);
      const queue = await apiRequest<any>(apiBaseUrl, '/queue', {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      setCurrentLead(queue.queue?.[0] || null);
      setStatus(queue.queue?.[0] ? 'Queue loaded. Ready to dial from this phone.' : 'No lead is currently queued.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load queue';
      setStatus(`Queue sign-in failed: ${message}`);
      Alert.alert('Login failed', message);
    } finally {
      setBusy(false);
    }
  };

  const callCurrentLead = async () => {
    if (!currentLead || !accessToken) return;
    setBusy(true);
    try {
      const attempt = await apiRequest<any>(apiBaseUrl, '/calls/initiate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ leadId: currentLead._id, origin: 'ANDROID' }),
      });
      await DayaarDevice.placeCall(attempt.phoneNumber);
      setStatus(`Dialing ${currentLead.name} through the company SIM.`);
    } catch (error) {
      Alert.alert('Call failed', error instanceof Error ? error.message : 'Unable to initiate the call');
    } finally {
      setBusy(false);
    }
  };

  const unpair = async () => {
    await DayaarDevice.clearDeviceCredentials();
    setPairingState({ paired: false });
    setAccessToken('');
    setCurrentLead(null);
    setStatus('Local device credentials cleared. Re-pair before receiving commands.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Dayaar Calling</Text>
        <Text style={styles.subtitle}>Employee company-SIM dial companion</Text>
        <View style={styles.statusBox}><Text style={styles.statusText}>{status}</Text></View>

        {!pairingState.paired ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pair this Android phone</Text>
            <Text style={styles.help}>Scan the current QR from Web CRM. It securely includes both the six-digit code and single-use token.</Text>
            <TouchableOpacity style={styles.secondaryButton} disabled={busy || scanning} onPress={scanPairingQr}>
              <Text style={styles.secondaryButtonText}>{scanning ? 'Opening scanner...' : 'Scan pairing QR'}</Text>
            </TouchableOpacity>

            <Text style={styles.dividerLabel}>OR ENTER MANUALLY</Text>
            <Text style={styles.inputLabel}>API URL</Text>
            <TextInput
              style={styles.input}
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.x.x:4000/api"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.fieldHint}>Emulator: use 10.0.2.2. Physical phone: use the API's LAN or deployed URL.</Text>
            <Text style={styles.inputLabel}>Six-digit code</Text>
            <TextInput
              style={styles.input}
              value={pairingCode}
              onChangeText={(value) => setPairingCode(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.inputLabel}>Pairing token or copied pairing link</Text>
            <TextInput
              style={styles.input}
              value={manualPairingValue}
              onChangeText={updateManualPairingValue}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Paste token or dayaarcrm://pair?..."
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.fieldHint}>The PIN alone is not sufficient. Paste the full value from “Copy pairing link” if you cannot scan.</Text>
            <TouchableOpacity style={styles.primaryButton} disabled={busy || scanning} onPress={pairDevice}>
              <Text style={styles.primaryButtonText}>{busy ? 'Pairing...' : 'Pair phone'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Device online</Text>
              <Text style={styles.help}>Device: {deviceInfo?.deviceName || pairingState.deviceId}</Text>
              <Text style={styles.help}>SIM: {deviceInfo?.simOperator || 'Unknown'} · {deviceInfo?.simState || 'UNKNOWN'}</Text>
              <Text style={styles.help}>Recordings are captured only by Callyzer; this app never reads or uploads them.</Text>
              <Text style={styles.help}>Web-initiated calling is ready now; no additional mobile sign-in is required.</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Optional: call from Android queue</Text>
              <Text style={styles.help}>Sign in with the paired employee's CRM account only when starting calls directly from this phone.</Text>
              <Text style={styles.inputLabel}>Employee work email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="employee@company.com"
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.inputLabel}>CRM password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity style={styles.secondaryButton} disabled={busy} onPress={loginAndLoadQueue}>
                <Text style={styles.secondaryButtonText}>Sign in and load queue</Text>
              </TouchableOpacity>
              {currentLead && (
                <View style={styles.leadBox}>
                  <Text style={styles.leadName}>{currentLead.name}</Text>
                  <Text style={styles.help}>{currentLead.project}</Text>
                  <TouchableOpacity style={styles.primaryButton} disabled={busy} onPress={callCurrentLead}>
                    <Text style={styles.primaryButtonText}>Call through company SIM</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={unpair}><Text style={styles.dangerText}>Clear local pairing</Text></TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 20, gap: 14 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#64748b', marginTop: -10 },
  statusBox: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc', borderWidth: 1, borderRadius: 12, padding: 12 },
  statusText: { color: '#075985', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  help: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  dividerLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', textAlign: 'center', marginVertical: 2 },
  inputLabel: { color: '#334155', fontSize: 12, fontWeight: '700', marginBottom: -5 },
  fieldHint: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: -5 },
  input: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 10, color: '#0f172a', paddingHorizontal: 12, paddingVertical: 11 },
  primaryButton: { backgroundColor: '#047857', borderRadius: 10, padding: 13, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  secondaryButton: { backgroundColor: '#0369a1', borderRadius: 10, padding: 13, alignItems: 'center' },
  secondaryButtonText: { color: '#fff', fontWeight: '800' },
  leadBox: { borderTopColor: '#e2e8f0', borderTopWidth: 1, paddingTop: 12, gap: 8 },
  leadName: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  dangerText: { color: '#be123c', fontWeight: '700', textAlign: 'center', padding: 12 },
});

export default App;
