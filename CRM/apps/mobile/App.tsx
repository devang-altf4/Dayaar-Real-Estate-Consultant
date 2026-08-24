import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  NativeModules,
  PermissionsAndroid,
  Platform,
  RefreshControl,
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

  simState: 'READY' | 'ABSENT' | 'LOCKED' | 'UNKNOWN';
  simOperator?: string;
}

interface PairingState {
  paired: boolean;
  deviceId?: string;
  apiBaseUrl?: string;
}


interface MobileEmployee {
  id: string;
  name: string;
  employeeCode: string;
  callingEnabled: boolean;
}

interface MobilePerformance {
  callsMadeToday: number;
  connectedToday: number;
  assignedLeadsCount: number;
}

interface MobileLead {
  _id?: string;
  id?: string;
  name: string;
  phone: string;
  project?: string;
  status: string;
  temperature?: string;
  attemptCount?: number;
}

interface MobileQueue {
  queue: MobileLead[];
  totalCount: number;
}

interface MobileTargetProgress {
  dailyTarget: number;
  remainingCalls: number;
  progressPercentage: number;
}

interface MobileDashboard {
  employee: MobileEmployee;
  performance: MobilePerformance;
  queue: MobileQueue;
  targetProgress: MobileTargetProgress;
  leads: MobileLead[];
}

interface MobileCallResult {
  phoneNumber: string;
  leadName: string;
  callAttemptId: string;
}

type CallFeedback = {
  kind: 'status' | 'error';
  message: string;
};

const { DayaarDevice } = NativeModules as {
  DayaarDevice: {
    scanPairingQr(): Promise<string>;
    getDeviceInfo(): Promise<DeviceInfo>;
    getPairingState(): Promise<PairingState>;
    pairDevice(apiBaseUrl: string, pairingCode: string, pairingToken: string): Promise<PairingState>;
    clearDeviceCredentials(): Promise<boolean>;
    sendHeartbeat(): Promise<boolean>;
    getMobileDashboard(): Promise<string>;
    initiateMobileCall(leadId: string): Promise<string>;
    placeCall(phoneNumber: string): Promise<boolean>;
    recordDisposition(payloadJson: string): Promise<string>;
  };
};

const NON_CALLABLE_STATUSES = new Set(['CLOSED', 'BOOKED', 'INVALID_NUMBER']);

const normalizeApiUrl = (value: string) => value.trim().replace(/\/$/, '');

const isLoopbackApiUrl = (value: string) =>
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(value.trim());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isMobileLead = (value: unknown): value is MobileLead => {
  if (!isRecord(value)) return false;
  const leadId = value._id ?? value.id;
  return (
    typeof leadId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.status === 'string'
  );
};

const isMobileDashboard = (value: unknown): value is MobileDashboard => {
  if (!isRecord(value)) return false;
  const { employee, performance, queue, targetProgress, leads } = value;
  return (
    isRecord(employee) &&
    typeof employee.id === 'string' &&
    typeof employee.name === 'string' &&
    typeof employee.employeeCode === 'string' &&
    typeof employee.callingEnabled === 'boolean' &&
    isRecord(performance) &&
    typeof performance.callsMadeToday === 'number' &&
    typeof performance.connectedToday === 'number' &&
    typeof performance.assignedLeadsCount === 'number' &&
    isRecord(queue) &&
    typeof queue.totalCount === 'number' &&
    Array.isArray(queue.queue) &&
    queue.queue.every(isMobileLead) &&
    isRecord(targetProgress) &&
    typeof targetProgress.dailyTarget === 'number' &&
    typeof targetProgress.remainingCalls === 'number' &&
    typeof targetProgress.progressPercentage === 'number' &&
    Array.isArray(leads) &&
    leads.every(isMobileLead)
  );
};

const isMobileCallResult = (value: unknown): value is MobileCallResult =>
  isRecord(value) &&
  typeof value.phoneNumber === 'string' &&
  value.phoneNumber.trim().length > 0 &&
  typeof value.leadName === 'string' &&
  typeof value.callAttemptId === 'string';

const unwrapNativeEnvelope = (response: string): unknown => {
  let envelope: unknown;
  try {
    envelope = JSON.parse(response) as unknown;
  } catch {
    throw new Error('The device API returned an invalid response.');
  }

  if (!isRecord(envelope)) {
    throw new Error('The device API returned an invalid response.');
  }
  if (envelope.success !== true) {
    throw new Error(typeof envelope.message === 'string' ? envelope.message : 'The device API request failed.');
  }
  if (!('data' in envelope)) {
    throw new Error('The device API response did not include data.');
  }
  return envelope.data;
};

const parseMobileDashboard = (response: string): MobileDashboard => {
  const data = unwrapNativeEnvelope(response);
  if (!isMobileDashboard(data)) {
    throw new Error('The employee dashboard response is incomplete.');
  }
  return data;
};

const parseMobileCallResult = (response: string): MobileCallResult => {
  const data = unwrapNativeEnvelope(response);
  if (!isMobileCallResult(data)) {
    throw new Error('The call response is incomplete.');
  }
  return data;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const getLeadId = (lead: MobileLead) => lead._id || lead.id || '';

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');


function App(): React.JSX.Element {
  const [apiBaseUrl, setApiBaseUrl] = useState('https://dayaar-real-estate-consultant-2.onrender.com/api');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingToken, setPairingToken] = useState('');
  const [manualPairingValue, setManualPairingValue] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [pairingState, setPairingState] = useState<PairingState>({ paired: false });
  const [dashboard, setDashboard] = useState<MobileDashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [callFeedback, setCallFeedback] = useState<CallFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('Initializing handset...');
  const [dispositionModalVisible, setDispositionModalVisible] = useState(false);
  const [activeLeadForDisposition, setActiveLeadForDisposition] = useState<MobileLead | null>(null);
  const [selectedDisposition, setSelectedDisposition] = useState<string>('HOT');
  const [dispositionNotes, setDispositionNotes] = useState<string>('');
  const [followUpDays, setFollowUpDays] = useState<number>(0);
  const [submittingDisposition, setSubmittingDisposition] = useState(false);
  const dashboardRequestId = useRef(0);
  const callInFlight = useRef(false);
  const lastRefreshTime = useRef(0);
  const REFRESH_COOLDOWN_MS = 3000; // 3-second rate-limit cooldown

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

  const loadDashboard = useCallback(async (announce = true) => {
    const requestId = dashboardRequestId.current + 1;
    dashboardRequestId.current = requestId;
    setDashboardLoading(true);
    setDashboardError(null);
    if (announce) setStatus('Loading the paired employee dashboard...');

    try {
      const response = await DayaarDevice.getMobileDashboard();
      const nextDashboard = parseMobileDashboard(response);
      if (dashboardRequestId.current !== requestId) return;
      setDashboard(nextDashboard);
      if (announce) {
        setStatus(`Dashboard ready for ${nextDashboard.employee.name}.`);
      }
    } catch (error) {
      if (dashboardRequestId.current !== requestId) return;
      const message = getErrorMessage(error, 'Unable to load the employee dashboard.');
      setDashboardError(message);
      if (announce) setStatus(`Dashboard failed: ${message}`);
    } finally {
      if (dashboardRequestId.current === requestId) setDashboardLoading(false);
    }
  }, []);

  const handleManualRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTime.current < REFRESH_COOLDOWN_MS) {
      setStatus('Dashboard refreshed just now (cooldown 3s)');
      return;
    }
    lastRefreshTime.current = now;
    await loadDashboard(true);
  }, [loadDashboard]);

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
          setStatus(savedState.paired ? 'Paired. Loading the employee dashboard...' : 'Scan the pairing QR shown in the web CRM.');
        }
      } catch (error) {
        setStatus(getErrorMessage(error, 'Unable to initialize the device.'));
      }
    })();
    const subscription = Linking.addEventListener('url', ({ url }) => applyPairingLink(url));
    return () => subscription.remove();
  }, [applyPairingLink]);

  useEffect(() => {
    if (!pairingState.paired) {
      dashboardRequestId.current += 1;
      setDashboard(null);
      setDashboardError(null);
      setDashboardLoading(false);
      setCallingLeadId(null);
      setCallFeedback(null);
      return;
    }
    void loadDashboard();
  }, [loadDashboard, pairingState.paired]);

  // Periodic Auto-Sync Timer (auto updates UI when new leads are assigned)
  useEffect(() => {
    if (!pairingState.paired) return;
    const syncTimer = setInterval(() => {
      if (!callInFlight.current && !dashboardLoading) {
        void loadDashboard(false); // Background silent sync
      }
    }, 10_000);
    return () => clearInterval(syncTimer);
  }, [loadDashboard, pairingState.paired, dashboardLoading]);

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
      const normalizedApiUrl = normalizeApiUrl(apiBaseUrl);
      const result = await DayaarDevice.pairDevice(normalizedApiUrl, pairingCode, pairingToken);
      setPairingState(result);
      setPairingCode('');
      setPairingToken('');
      setManualPairingValue('');
      setStatus('Pairing successful. Loading the employee dashboard...');
    } catch (error) {
      const message = getErrorMessage(error, 'Unknown pairing error');
      setStatus(`Pairing failed: ${message}`);
      Alert.alert('Pairing failed', message);
    } finally {
      setBusy(false);
    }
  };

  const callLead = async (lead: MobileLead) => {
    const leadId = getLeadId(lead);
    if (
      !dashboard?.employee.callingEnabled ||
      NON_CALLABLE_STATUSES.has(lead.status) ||
      !leadId ||
      callInFlight.current
    ) return;

    callInFlight.current = true;
    setCallingLeadId(leadId);
    setCallFeedback({ kind: 'status', message: `Starting a company-SIM call to ${lead.name}...` });
    setStatus(`Starting a company-SIM call to ${lead.name}...`);
    try {
      const response = await DayaarDevice.initiateMobileCall(leadId);
      const callResult = parseMobileCallResult(response);
      const placed = await DayaarDevice.placeCall(callResult.phoneNumber);
      if (!placed) throw new Error('The phone dialer did not accept the call.');
      const message = `Dialing ${callResult.leadName} through the company SIM.`;
      setCallFeedback({ kind: 'status', message });
      setStatus(message);
      setTimeout(() => {
        openDispositionModal(lead);
      }, 1000);
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to initiate the call.');
      setCallFeedback({ kind: 'error', message: `Call failed: ${message}` });
      setStatus(`Call failed: ${message}`);
      Alert.alert('Call failed', message);
    } finally {
      callInFlight.current = false;
      setCallingLeadId(null);
      await loadDashboard(false);
    }
  };

  const openDispositionModal = (lead: MobileLead) => {
    setActiveLeadForDisposition(lead);
    setSelectedDisposition(lead.status === 'NEW' ? 'HOT' : lead.status);
    setDispositionNotes(lead.employeeNotes || '');
    setFollowUpDays(lead.status === 'FOLLOW_UP' ? 1 : 0);
    setDispositionModalVisible(true);
  };

  const submitDisposition = async () => {
    if (!activeLeadForDisposition) return;
    setSubmittingDisposition(true);
    try {
      const leadId = getLeadId(activeLeadForDisposition);
      let followUpAt: string | undefined = undefined;
      if (followUpDays > 0) {
        const d = new Date(Date.now() + followUpDays * 24 * 60 * 60 * 1000);
        d.setHours(11, 0, 0, 0); // 11:00 AM
        followUpAt = d.toISOString();
      }
      const payload = {
        leadId,
        disposition: selectedDisposition,
        status: selectedDisposition,
        notes: dispositionNotes.trim() || undefined,
        reason: dispositionNotes.trim() || `Status marked as ${selectedDisposition}`,
        followUpAt,
      };
      await DayaarDevice.recordDisposition(JSON.stringify(payload));
      setStatus(`Saved & synced outcome for ${activeLeadForDisposition.name}!`);
      setDispositionModalVisible(false);
      await loadDashboard(false);
    } catch (error) {
      const msg = getErrorMessage(error, 'Failed to update disposition.');
      Alert.alert('Disposition Error', msg);
    } finally {
      setSubmittingDisposition(false);
    }
  };

  const unpair = async () => {
    setBusy(true);
    dashboardRequestId.current += 1;
    setDashboard(null);
    setDashboardError(null);
    setDashboardLoading(false);
    setCallFeedback(null);
    try {
      await DayaarDevice.clearDeviceCredentials();
      setPairingState({ paired: false });
      setStatus('Local device credentials cleared. Re-pair before receiving commands.');
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to clear local pairing.');
      setStatus(`Unable to clear pairing: ${message}`);
      Alert.alert('Unable to clear pairing', message);
      void loadDashboard(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          pairingState.paired ? (
            <RefreshControl
              refreshing={dashboardLoading}
              onRefresh={handleManualRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          ) : undefined
        }
      >
        <View style={styles.brandRow}>
          <Image source={require('./assets/dayaar-logo.png')} style={styles.brandLogo} resizeMode="contain" />
          <View style={styles.brandTextContainer}>
            <Text style={styles.title}>Dayaar Calling</Text>
            <Text style={styles.subtitle}>Employee company-SIM dial companion</Text>
          </View>
        </View>
        <View style={styles.statusBox}><Text style={styles.statusText}>{status}</Text></View>

        {!pairingState.paired ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pair this Android phone</Text>
            <Text style={styles.help}>Scan the current QR from Web CRM. It securely includes both the six-digit code and single-use token.</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, (busy || scanning) && styles.disabledButton]}
              disabled={busy || scanning}
              onPress={scanPairingQr}
            >
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
              placeholder="https://dayaar-real-estate-consultant-2.onrender.com/api"
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
            <TouchableOpacity
              style={[styles.primaryButton, (busy || scanning) && styles.disabledButton]}
              disabled={busy || scanning}
              onPress={pairDevice}
            >
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
              <Text style={styles.help}>Dashboard access and calling use this phone's paired device credentials. No employee sign-in is required.</Text>
            </View>

            {dashboardLoading && !dashboard ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Loading dashboard</Text>
                <Text style={styles.help}>Fetching the paired employee's assigned leads, queue, and today's performance...</Text>
              </View>
            ) : null}

            {dashboardError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Dashboard unavailable</Text>
                <Text style={styles.errorText}>{dashboardError}</Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, dashboardLoading && styles.disabledButton]}
                  disabled={dashboardLoading}
                  onPress={() => void loadDashboard()}
                >
                  <Text style={styles.secondaryButtonText}>{dashboardLoading ? 'Refreshing...' : 'Try again'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {dashboard ? (
              <>
                <View style={styles.card}>
                  <View style={styles.employeeHeader}>
                    <View style={styles.employeeIdentity}>
                      <Text style={styles.employeeName}>{dashboard.employee.name}</Text>
                      <Text style={styles.employeeCode}>{dashboard.employee.employeeCode}</Text>
                    </View>
                    <View style={dashboard.employee.callingEnabled ? styles.enabledBadge : styles.disabledBadge}>
                      <Text style={dashboard.employee.callingEnabled ? styles.enabledBadgeText : styles.disabledBadgeText}>
                        {dashboard.employee.callingEnabled ? 'Calling enabled' : 'Calling disabled'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.kpiGrid}>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiValue}>{dashboard.performance.callsMadeToday}</Text>
                      <Text style={styles.kpiLabel}>Calls today</Text>
                    </View>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiValue}>{dashboard.performance.connectedToday}</Text>
                      <Text style={styles.kpiLabel}>Connected</Text>
                    </View>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiValue}>{dashboard.performance.assignedLeadsCount}</Text>
                      <Text style={styles.kpiLabel}>Assigned leads</Text>
                    </View>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiValue}>{dashboard.targetProgress.remainingCalls}</Text>
                      <Text style={styles.kpiLabel}>Remaining target</Text>
                    </View>
                  </View>

                  <View style={styles.queueSummary}>
                    <View>
                      <Text style={styles.queueCount}>{dashboard.queue.totalCount}</Text>
                      <Text style={styles.queueLabel}>Currently callable in queue</Text>
                    </View>
                    <Text style={styles.progressText}>
                      {dashboard.targetProgress.progressPercentage}% of {dashboard.targetProgress.dailyTarget}
                    </Text>
                  </View>

                  {dashboardLoading ? <Text style={styles.refreshingText}>Refreshing dashboard...</Text> : null}
                  <TouchableOpacity
                    style={[styles.secondaryButton, dashboardLoading && styles.disabledButton]}
                    disabled={dashboardLoading}
                    onPress={handleManualRefresh}
                  >
                    <Text style={styles.secondaryButtonText}>{dashboardLoading ? 'Refreshing...' : '🔄 Refresh Queue & Dashboard'}</Text>
                  </TouchableOpacity>
                </View>

                {callFeedback ? (
                  <View style={callFeedback.kind === 'error' ? styles.callErrorBox : styles.callStatusBox}>
                    <Text style={callFeedback.kind === 'error' ? styles.callErrorText : styles.callStatusText}>
                      {callFeedback.message}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Assigned leads</Text>
                    <Text style={styles.sectionSubtitle}>All {dashboard.leads.length} leads assigned to you</Text>
                  </View>
                </View>

                {dashboard.leads.length === 0 ? (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>No assigned leads</Text>
                    <Text style={styles.help}>There are currently no leads assigned to this employee.</Text>
                  </View>
                ) : (
                  dashboard.leads.map((lead, index) => {
                    const leadId = getLeadId(lead);
                    const inQueue = dashboard.queue.queue.some((queueLead) => getLeadId(queueLead) === leadId);
                    const callable = dashboard.employee.callingEnabled && !NON_CALLABLE_STATUSES.has(lead.status);
                    const callBusy = callingLeadId !== null;
                    return (
                      <View style={styles.leadCard} key={leadId || `${lead.phone}-${index}`}>
                        <View style={styles.leadHeader}>
                          <View style={styles.leadIdentity}>
                            <Text style={styles.leadName}>{lead.name}</Text>
                            <Text style={styles.leadPhone}>{lead.phone}</Text>
                          </View>
                          <View style={inQueue ? styles.inQueueBadge : styles.outOfQueueBadge}>
                            <Text style={inQueue ? styles.inQueueText : styles.outOfQueueText}>
                              {inQueue ? 'In current queue' : 'Not in queue'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.projectText}>{lead.project || 'Project not specified'}</Text>
                        <View style={styles.leadMetaRow}>
                          <View style={styles.metaPill}>
                            <Text style={styles.metaText}>{formatLabel(lead.status)}</Text>
                          </View>
                          <View style={styles.metaPill}>
                            <Text style={styles.metaText}>{formatLabel(lead.temperature || 'UNQUALIFIED')}</Text>
                          </View>
                          <Text style={styles.attemptText}>Attempts: {lead.attemptCount ?? 0}</Text>
                        </View>

                        {callable ? (
                          <TouchableOpacity
                            style={[styles.primaryButton, (callBusy || dashboardLoading) && styles.disabledButton]}
                            disabled={callBusy || dashboardLoading}
                            onPress={() => void callLead(lead)}
                          >
                            <Text style={styles.primaryButtonText}>
                              {callingLeadId === leadId
                                ? 'Starting call...'
                                : callBusy
                                  ? 'Another call is starting...'
                                  : 'Call through company SIM'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.unavailableText}>
                            {!dashboard.employee.callingEnabled
                              ? 'Company-SIM calling is not enabled for this employee.'
                              : `Calling is unavailable while this lead is ${formatLabel(lead.status).toLowerCase()}.`}
                          </Text>
                        )}

                        <TouchableOpacity
                          style={styles.outcomeButton}
                          onPress={() => openDispositionModal(lead)}
                        >
                          <Text style={styles.outcomeButtonText}>📝 Log Outcome / Update Status</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </>
            ) : null}

            {!dashboardLoading && !dashboard && !dashboardError ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>No dashboard data</Text>
                <Text style={styles.help}>Refresh to load the employee dashboard for this paired phone.</Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => void loadDashboard()}>
                  <Text style={styles.secondaryButtonText}>Load dashboard</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              disabled={busy || callingLeadId !== null}
              onPress={unpair}
            >
              <Text style={[styles.dangerText, (busy || callingLeadId !== null) && styles.disabledText]}>
                {busy ? 'Clearing local pairing...' : 'Clear local pairing'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal
        visible={dispositionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDispositionModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Log Call Outcome & Status</Text>
                <Text style={styles.modalSubtitle}>
                  {activeLeadForDisposition ? `${activeLeadForDisposition.name} (${activeLeadForDisposition.phone})` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDispositionModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.modalSectionLabel}>LEAD STATUS & OUTCOME</Text>
              <View style={styles.dispositionGrid}>
                {[
                  { id: 'HOT', label: '🔥 Hot Prospect', bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
                  { id: 'WARM', label: '👍 Interested / Warm', bg: '#dcfce7', border: '#86efac', text: '#166534' },
                  { id: 'FOLLOW_UP', label: '⏰ Follow-Up Required', bg: '#fef3c7', border: '#fde047', text: '#854d0e' },
                  { id: 'SITE_VISIT', label: '📍 Site Visit Scheduled', bg: '#f3e8ff', border: '#d8b4fe', text: '#6b21a8' },
                  { id: 'NEGOTIATION', label: '💬 In Negotiation', bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3' },
                  { id: 'BOOKED', label: '🏆 Deal Booked / Won', bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' },
                  { id: 'NOT_INTERESTED', label: '❄️ Cold / Not Interested', bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' },
                ].map((item) => {
                  const selected = selectedDisposition === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.dispositionChip,
                        { backgroundColor: selected ? item.bg : '#f8fafc', borderColor: selected ? item.border : '#cbd5e1', borderWidth: selected ? 2 : 1 },
                      ]}
                      onPress={() => setSelectedDisposition(item.id)}
                    >
                      <Text style={[styles.dispositionChipText, { color: selected ? item.text : '#334155', fontWeight: selected ? '800' : '600' }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalSectionLabel}>SCHEDULE NEXT FOLLOW-UP</Text>
              <View style={styles.timingRow}>
                {[
                  { days: 0, label: 'None' },
                  { days: 1, label: 'Tomorrow' },
                  { days: 2, label: 'In 2 Days' },
                  { days: 7, label: 'In 1 Week' },
                ].map((timing) => {
                  const selected = followUpDays === timing.days;
                  return (
                    <TouchableOpacity
                      key={timing.days}
                      style={[styles.timingChip, selected && styles.timingChipActive]}
                      onPress={() => setFollowUpDays(timing.days)}
                    >
                      <Text style={[styles.timingChipText, selected && styles.timingChipTextActive]}>
                        {timing.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalSectionLabel}>CALL NOTES & SUMMARY</Text>
              <TextInput
                style={styles.notesInput}
                value={dispositionNotes}
                onChangeText={setDispositionNotes}
                multiline
                numberOfLines={3}
                placeholder="E.g. Discussed budget, preferred location, shared floor plan..."
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity
                style={[styles.saveButton, submittingDisposition && styles.disabledButton]}
                disabled={submittingDisposition}
                onPress={() => void submitDisposition()}
              >
                <Text style={styles.saveButtonText}>
                  {submittingDisposition ? 'Syncing with CRM...' : '💾 Save & Sync to Web CRM'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 20, paddingBottom: 36, gap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  brandLogo: { width: 44, height: 44, borderRadius: 8 },
  brandTextContainer: { flex: 1 },
  title: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 1 },
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
  primaryButtonText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  secondaryButton: { backgroundColor: '#0369a1', borderRadius: 10, padding: 13, alignItems: 'center' },
  secondaryButtonText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  disabledButton: { opacity: 0.5 },
  employeeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  employeeIdentity: { flex: 1, gap: 2 },
  employeeName: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  employeeCode: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  enabledBadge: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  enabledBadgeText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  disabledBadge: { backgroundColor: '#ffe4e6', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  disabledBadgeText: { color: '#9f1239', fontSize: 10, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12, padding: 12 },
  kpiValue: { color: '#0f172a', fontSize: 23, fontWeight: '900' },
  kpiLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', marginTop: 2 },
  queueSummary: { backgroundColor: '#ecfeff', borderColor: '#a5f3fc', borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  queueCount: { color: '#155e75', fontSize: 24, fontWeight: '900' },
  queueLabel: { color: '#0e7490', fontSize: 11, fontWeight: '700' },
  progressText: { color: '#0e7490', fontSize: 11, fontWeight: '800', textAlign: 'right' },
  refreshingText: { color: '#0369a1', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  errorCard: { backgroundColor: '#fff1f2', borderColor: '#fda4af', borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  errorTitle: { color: '#9f1239', fontSize: 16, fontWeight: '800' },
  errorText: { color: '#be123c', fontSize: 12, lineHeight: 18 },
  callStatusBox: { backgroundColor: '#ecfdf5', borderColor: '#6ee7b7', borderWidth: 1, borderRadius: 12, padding: 12 },
  callStatusText: { color: '#065f46', fontSize: 12, fontWeight: '700' },
  callErrorBox: { backgroundColor: '#fff1f2', borderColor: '#fda4af', borderWidth: 1, borderRadius: 12, padding: 12 },
  callErrorText: { color: '#be123c', fontSize: 12, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 2 },
  sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  sectionSubtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  leadCard: { backgroundColor: '#fff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 16, padding: 16, gap: 11 },
  leadHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  leadIdentity: { flex: 1, gap: 3 },
  leadName: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  leadPhone: { color: '#334155', fontSize: 14, fontWeight: '700' },
  projectText: { color: '#475569', fontSize: 13, lineHeight: 18 },
  inQueueBadge: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  inQueueText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  outOfQueueBadge: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  outOfQueueText: { color: '#64748b', fontSize: 10, fontWeight: '800' },
  leadMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  metaPill: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  metaText: { color: '#334155', fontSize: 10, fontWeight: '800' },
  attemptText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  unavailableText: { color: '#64748b', backgroundColor: '#f8fafc', borderRadius: 10, padding: 11, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  outcomeButton: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 10, padding: 11, alignItems: 'center' },
  outcomeButtonText: { color: '#0f172a', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  dangerText: { color: '#be123c', fontWeight: '700', textAlign: 'center', padding: 12 },
  disabledText: { opacity: 0.5 },

  // Modal styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  modalSubtitle: { color: '#64748b', fontSize: 12, marginTop: 2, fontWeight: '600' },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: '#475569', fontSize: 16, fontWeight: '800' },
  modalBody: { paddingTop: 14, paddingBottom: 20, gap: 10 },
  modalSectionLabel: { color: '#475569', fontSize: 11, fontWeight: '800', marginTop: 6, letterSpacing: 0.5 },
  dispositionGrid: { gap: 7 },
  dispositionChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  dispositionChipText: { fontSize: 13 },
  timingRow: { flexDirection: 'row', gap: 8 },
  timingChip: { flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 8, backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderWidth: 1, alignItems: 'center' },
  timingChipActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  timingChipText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  timingChipTextActive: { color: '#ffffff', fontWeight: '800' },
  notesInput: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 10, color: '#0f172a', padding: 12, textAlignVertical: 'top', minHeight: 70 },
  saveButton: { backgroundColor: '#0284c7', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },
});

export default App;
