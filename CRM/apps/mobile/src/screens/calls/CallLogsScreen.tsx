import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeModules,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { executeDevicePairing } from '../../api/pairing';
import { useAuth } from '../../context/AuthContext';
import { CallAttempt } from '../../types';

const { DayaarDevice } = NativeModules;

export const CallLogsScreen: React.FC = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  // Handset / Companion Pairing State
  const [pairingState, setPairingState] = useState<{
    paired: boolean;
    deviceId?: string;
    apiBaseUrl?: string;
  } | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);

  const checkPairingStatus = async () => {
    try {
      if (DayaarDevice?.getPairingState) {
        const state = await DayaarDevice.getPairingState();
        setPairingState(state);
      }
    } catch {
      // ignore
    }
  };

  const fetchCalls = async () => {
    try {
      // GET /calls returns { data: [...], meta } — unwrap before storing.
      const res = await api.get<any>('/calls?limit=50');
      setCalls(Array.isArray(res) ? res : res?.data || []);
    } catch (err: any) {
      Alert.alert('Calls Error', err.message || 'Failed to load call logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchCalls();
    void checkPairingStatus();
    return () => {
      if (DayaarDevice?.stopAudio) {
        void DayaarDevice.stopAudio();
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchCalls();
    void checkPairingStatus();
  };

  const handleScanPairing = async () => {
    setPairingLoading(true);
    try {
      const result = await executeDevicePairing();
      if (result.success) {
        Alert.alert('Device Paired', result.message || 'Handset paired successfully with Web CRM!');
        await checkPairingStatus();
      }
    } catch (err: any) {
      Alert.alert('Pairing Error', err.message || 'Failed to scan and pair device.');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleUnpair = () => {
    Alert.alert(
      'Unpair Handset',
      'Are you sure you want to disconnect this handset from Web CRM calling synchronization?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair Handset',
          style: 'destructive',
          onPress: async () => {
            try {
              if (DayaarDevice?.clearDeviceCredentials) {
                await DayaarDevice.clearDeviceCredentials();
                await checkPairingStatus();
                Alert.alert('Handset Unpaired', 'Device pairing credentials have been cleared.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to unpair handset.');
            }
          },
        },
      ],
    );
  };

  const handlePlayAudio = async (attempt: CallAttempt) => {
    const attemptId = attempt._id || attempt.id;
    if (!attemptId) return;

    if (playingCallId === attemptId) {
      if (DayaarDevice?.stopAudio) {
        await DayaarDevice.stopAudio();
      }
      setPlayingCallId(null);
      return;
    }

    setAudioLoading(true);
    try {
      if (DayaarDevice?.stopAudio) {
        await DayaarDevice.stopAudio();
      }

      // Fetch recording URL
      const res = await api.get<{ url: string | null; streamPath: string | null }>(
        `/calls/${attemptId}/recording-url`,
      );

      let playUrl = res.url;
      if (!playUrl && res.streamPath) {
        const token = api.getToken();
        playUrl = `${api.getBaseUrl()}${res.streamPath}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      }

      if (!playUrl) {
        throw new Error('Recording audio is unavailable for this call.');
      }

      if (DayaarDevice?.playAudio) {
        await DayaarDevice.playAudio(playUrl);
        setPlayingCallId(attemptId);
      } else {
        Alert.alert('Notice', 'Audio playback is supported on physical Android companion.');
      }
    } catch (err: any) {
      Alert.alert('Playback Error', err.message || 'Could not load recording audio.');
    } finally {
      setAudioLoading(false);
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const role = user?.role || 'EMPLOYEE';
  const canAccessRecordings = role === 'ADMIN' || role === 'MANAGER';

  return (
    <View style={styles.container}>
      <View style={styles.headerBanner}>
        <Text style={styles.headerTitle}>🎙️ Telecalling Logs & Handset</Text>
        <Text style={styles.headerSubtitle}>
          Synced with Callyzer and Web CRM
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Handset Pairing Card */}
          <View style={styles.pairingCard}>
            <View style={styles.pairingHeader}>
              <View style={styles.pairingTitleGroup}>
                <Text style={styles.pairingTitle}>📱 Telecaller Handset Link</Text>
                <Text style={styles.pairingStatusText}>
                  {pairingState?.paired
                    ? '🟢 Paired with Web CRM'
                    : '⚪ Not Paired with Web CRM'}
                </Text>
              </View>
              {pairingState?.paired ? (
                <TouchableOpacity
                  style={styles.unpairButton}
                  onPress={handleUnpair}
                >
                  <Text style={styles.unpairButtonText}>Disconnect</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.pairingDescription}>
              {pairingState?.paired
                ? `Device ID: ${pairingState.deviceId || 'Linked'}. Web-initiated calls and Callyzer sync are active.`
                : 'Scan the QR code displayed in Web CRM (Calling > Pair Android Device) to link this handset for web calling.'}
            </Text>

            <TouchableOpacity
              style={[styles.pairActionButton, pairingLoading && styles.disabledButton]}
              disabled={pairingLoading}
              onPress={() => void handleScanPairing()}
            >
              {pairingLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.pairActionButtonText}>
                  {pairingState?.paired ? '📷 Re-scan Pairing QR' : '📷 Scan Web CRM Pairing QR'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeading}>Recent Call Attempts</Text>

          {calls.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📞</Text>
              <Text style={styles.emptyTitle}>No call logs recorded</Text>
            </View>
          ) : (
            calls.map((call) => {
              const callId = call._id || call.id;
              const isPlaying = playingCallId === callId;
              const isLeadObj = typeof call.leadId === 'object' && call.leadId !== null;
              const leadName = isLeadObj ? (call.leadId as any).name : null;

              const isEmpObj = typeof call.employeeId === 'object' && call.employeeId !== null;
              const empName = isEmpObj ? (call.employeeId as any).name : null;

              const hasRecording = Boolean(call.recordingUrl || call.recordingStatus === 'ARCHIVED');

              return (
                <View key={callId} style={styles.callCard}>
                  <View style={styles.callHeader}>
                    <View style={styles.callInfo}>
                      <Text style={styles.leadName}>
                        {leadName ? `${leadName} • ` : ''}📞 {call.phoneNumber}
                      </Text>
                      {empName ? (
                        <Text style={styles.employeeName}>👤 Caller: {empName}</Text>
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        call.status === 'COMPLETED'
                          ? styles.statusCompleted
                          : styles.statusMissed,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{call.status}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      ⏱️ Duration: {formatDuration(call.duration)}
                    </Text>
                    <Text style={styles.metaText}>
                      📅{' '}
                      {call.dialedAt
                        ? new Date(call.dialedAt).toLocaleTimeString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </Text>
                  </View>

                  {call.notes ? (
                    <Text style={styles.notesText} numberOfLines={2}>
                      💬 {call.notes}
                    </Text>
                  ) : null}

                  {canAccessRecordings && hasRecording ? (
                    <TouchableOpacity
                      style={[styles.audioButton, isPlaying && styles.audioButtonPlaying]}
                      disabled={audioLoading}
                      onPress={() => void handlePlayAudio(call)}
                    >
                      <Text style={styles.audioButtonText}>
                        {isPlaying ? '⏹️ Stop Playback' : '▶️ Play Call Recording'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBanner: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    paddingBottom: 80,
    gap: 12,
  },
  pairingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderColor: '#bae6fd',
    borderWidth: 1,
    gap: 10,
    shadowColor: '#0284c7',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pairingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pairingTitleGroup: {
    gap: 2,
  },
  pairingTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  pairingStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  unpairButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  unpairButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
  },
  pairingDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  pairActionButton: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairActionButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.6,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: -4,
  },
  callCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    gap: 8,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  callInfo: {
    flex: 1,
    gap: 2,
  },
  leadName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  employeeName: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusMissed: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0f172a',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  notesText: {
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  audioButton: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  audioButtonPlaying: {
    backgroundColor: '#dc2626',
  },
  audioButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 36,
    alignItems: 'center',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    marginTop: 20,
    gap: 6,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
});
