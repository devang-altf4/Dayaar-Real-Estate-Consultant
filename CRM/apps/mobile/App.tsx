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
}

const { DayaarDevice } = NativeModules as {
  DayaarDevice: {
    getDeviceInfo(): Promise<DeviceInfo>;
    getPairingState(): Promise<PairingState>;
    saveDeviceCredentials(apiBaseUrl: string, deviceId: string, deviceToken: string): Promise<boolean>;
    clearDeviceCredentials(): Promise<boolean>;
    sendHeartbeat(): Promise<boolean>;
    placeCall(phoneNumber: string): Promise<boolean>;
  };
};

const normalizeApiUrl = (value: string) => value.trim().replace(/\/$/, '');

async function apiRequest<T>(apiBaseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${normalizeApiUrl(apiBaseUrl)}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = (await response.json()) as ApiEnvelope<T> & T;
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body.data !== undefined ? body.data : (body as T);
}

function App(): React.JSX.Element {
  const [apiBaseUrl, setApiBaseUrl] = useState('http://10.0.2.2:4000/api');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingToken, setPairingToken] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [pairingState, setPairingState] = useState<PairingState>({ paired: false });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [currentLead, setCurrentLead] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Initializing handset...');

  const applyPairingLink = useCallback((url: string | null) => {
    if (!url?.startsWith('dayaarcrm://pair')) return;
    const query = url.split('?')[1] || '';
    const params = Object.fromEntries(
      query.split('&').filter(Boolean).map((entry) => {
        const [key, ...parts] = entry.split('=');
        return [decodeURIComponent(key), decodeURIComponent(parts.join('='))];
      }),
    );
    const code = params.code;
    const token = params.token;
    const api = params.api;
    if (code) setPairingCode(code);
    if (token) setPairingToken(token);
    if (api) setApiBaseUrl(api);
    setStatus('Pairing QR received. Review and pair this phone.');
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
        applyPairingLink(initialUrl);
        setStatus(savedState.paired ? 'Paired and ready for SIM dial commands.' : 'Scan the pairing QR shown in the web CRM.');
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

  const pairDevice = async () => {
    if (!deviceInfo) return;
    if (!/^\d{6}$/.test(pairingCode) || !pairingToken) {
      Alert.alert('Pairing details missing', 'Scan the web QR or enter the six-digit code and pairing token.');
      return;
    }
    setBusy(true);
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
      setStatus('Paired and ready for SIM dial commands.');
    } catch (error) {
      Alert.alert('Pairing failed', error instanceof Error ? error.message : 'Unknown pairing error');
    } finally {
      setBusy(false);
    }
  };

  const loginAndLoadQueue = async () => {
    setBusy(true);
    try {
      const auth = await apiRequest<any>(apiBaseUrl, '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAccessToken(auth.accessToken);
      const queue = await apiRequest<any>(apiBaseUrl, '/queue', {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      setCurrentLead(queue.queue?.[0] || null);
      setStatus(queue.queue?.[0] ? 'Queue loaded. Ready to dial from this phone.' : 'No lead is currently queued.');
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Unable to load queue');
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
            <Text style={styles.help}>Scan the QR in Web CRM. Manual fields are available for emulator testing.</Text>
            <TextInput style={styles.input} value={apiBaseUrl} onChangeText={setApiBaseUrl} autoCapitalize="none" placeholder="API URL" />
            <TextInput style={styles.input} value={pairingCode} onChangeText={setPairingCode} keyboardType="number-pad" maxLength={6} placeholder="6-digit pairing code" />
            <TextInput style={styles.input} value={pairingToken} onChangeText={setPairingToken} autoCapitalize="none" placeholder="Pairing token" />
            <TouchableOpacity style={styles.primaryButton} disabled={busy} onPress={pairDevice}>
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
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Call from Android queue</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Work email" />
              <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
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
