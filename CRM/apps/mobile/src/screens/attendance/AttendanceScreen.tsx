import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

// Ask the native layer for prompts; we handle the runtime permission ourselves.
Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
});
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, User } from '../../types';

interface AttendanceScreenProps {
  onRefreshParent?: () => void;
}

export const AttendanceScreen: React.FC<AttendanceScreenProps> = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'MY_ATTENDANCE' | 'TEAM_LOGS'>('MY_ATTENDANCE');
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord | null>(null);
  const [teamLogs, setTeamLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [breakTimerSec, setBreakTimerSec] = useState(0);

  // Admins do not punch in — they review the org report only (matches Web CRM).
  const canSelfPunch = user?.role === 'EMPLOYEE' || user?.role === 'MANAGER';

  const fetchTeamLogs = async () => {
    // Admin-only endpoint: org-wide daily report keyed by check-in date.
    const res = await api
      .get<{ date: string; totalRecords: number; records: any[] }>('/attendance/daily-report')
      .catch(() => null);
    setTeamLogs(res?.records || []);
  };

  const fetchAttendance = async () => {
    try {
      if (canSelfPunch) {
        const today = await api.get<any>('/attendance/today').catch(() => null);
        setMyAttendance(
          today
            ? {
                _id: today.record?._id,
                userId: today.record?.employeeId,
                date: today.record?.date,
                checkIn: today.record?.checkInAt,
                checkOut: today.record?.checkOutAt ?? undefined,
                totalWorkingMinutes: today.record?.totalWorkingSeconds
                  ? Math.round(today.record.totalWorkingSeconds / 60)
                  : 0,
                status: 'PRESENT',
                breaks: (today.activeBreak
                  ? [{ type: today.activeBreak.type ?? 'PERSONAL', startTime: today.activeBreak.startedAt }]
                  : []) as AttendanceRecord['breaks'],
              }
            : null,
        );
      }

      if (user?.role === 'ADMIN') {
        await fetchTeamLogs();
      } else if (user?.role === 'MANAGER') {
        // Manager team presence comes from their dashboard payload's member list.
        const dash = await api.get<any>('/analytics/manager-dashboard').catch(() => null);
        setTeamLogs(
          (dash?.teamMembers || []).map((m: any) => ({
            _id: m.userId,
            user: { name: m.userName, employeeCode: m.employeeCode },
            checkIn: m.isCheckedIn ? new Date().toISOString() : undefined,
            totalWorkingMinutes: undefined,
            callsToday: m.callsToday,
          })),
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchAttendance();
  }, [user]);

  // Active break timer ticker
  useEffect(() => {
    const activeBreak = myAttendance?.breaks?.find((b) => !b.endTime);
    if (activeBreak) {
      const startTime = new Date(activeBreak.startTime).getTime();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setBreakTimerSec(elapsed > 0 ? elapsed : 0);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setBreakTimerSec(0);
    }
  }, [myAttendance]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchAttendance();
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        // @ts-ignore RN 0.81 accepts a plain rationale object
        title: 'Location Permission Required',
        message: 'Dayaar CRM verifies you are at the office before allowing check-in.',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const getPositionOnce = (highAccuracy: boolean) =>
    new Promise<{ latitude: number; longitude: number; accuracy: number }>((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) => reject(new Error(err?.message || 'Location unavailable.')),
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 15000 : 20000,
          maximumAge: 10000,
        },
      );
    });

  const getCurrentPosition = async (): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
  }> => {
    const ok = await requestLocationPermission();
    if (!ok) {
      throw new Error('Location permission denied. Grant it in Settings to check in.');
    }
    try {
      // Prefer GPS-grade fix…
      return await getPositionOnce(true);
    } catch {
      // …fall back to any fix rather than blocking punch-in entirely.
      return await getPositionOnce(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const coords = await getCurrentPosition();
      await api.post('/attendance/check-in', coords);
      Alert.alert('Checked In', 'You have successfully checked in for the day.');
      await fetchAttendance();
    } catch (err: any) {
      Alert.alert('Check-In Failed', err.message || 'Could not check in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const coords = await getCurrentPosition();
      await api.post('/attendance/check-out', coords);
      Alert.alert('Checked Out', 'You have checked out for the day.');
      await fetchAttendance();
    } catch (err: any) {
      Alert.alert('Check-Out Failed', err.message || 'Could not check out.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async (type: 'TEA' | 'LUNCH' | 'PERSONAL') => {
    setActionLoading(true);
    try {
      await api.post('/attendance/break/start', { reason: type === 'TEA' ? 'Tea Break' : type === 'LUNCH' ? 'Lunch Break' : 'Short Break' });
      Alert.alert('Break Started', `Enjoy your ${type.toLowerCase()} break.`);
      await fetchAttendance();
    } catch (err: any) {
      Alert.alert('Break Error', err.message || 'Failed to start break.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/break/end');
      Alert.alert('Break Ended', 'Welcome back! You are now active for telecalling.');
      await fetchAttendance();
    } catch (err: any) {
      Alert.alert('Break Error', err.message || 'Failed to end break.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatSec = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // daily-report rows carry employeeId as a populated object; manager rows carry user{name}.
  const empNameFromId = (item: any): string | undefined => {
    const e = item.employeeId ?? item.userId ?? item.user;
    if (e && typeof e === 'object') return e.name || e.employeeCode || undefined;
    return undefined;
  };

  const isCheckedIn = Boolean(myAttendance?.checkIn && !myAttendance?.checkOut);
  const isCheckedOut = Boolean(myAttendance?.checkOut);
  const activeBreak = myAttendance?.breaks?.find((b) => !b.endTime);

  const role = user?.role || 'EMPLOYEE';

  // Admin sees only the org-wide presence report (no personal punch UI, matches Web CRM).
  const showTabHeader = role === 'ADMIN' || role === 'MANAGER';

  return (
    <View style={styles.container}>
      {/* Top Segment Tabs for Admin / Manager */}
      {showTabHeader ? (
        <View style={styles.tabHeader}>
          {!canSelfPunch ? null : (
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'MY_ATTENDANCE' && styles.tabButtonActive]}
            onPress={() => setActiveTab('MY_ATTENDANCE')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'MY_ATTENDANCE' && styles.tabButtonTextActive,
              ]}
            >
              ⏱️ My Punch In
            </Text>
          </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.tabButton, (activeTab === 'TEAM_LOGS' || !canSelfPunch) && styles.tabButtonActive]}
            onPress={() => setActiveTab('TEAM_LOGS')}
          >
            <Text
              style={[
                styles.tabButtonText,
                (activeTab === 'TEAM_LOGS' || !canSelfPunch) && styles.tabButtonTextActive,
              ]}
            >
              👥 Team Presence Logs
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color="#0284c7" style={{ marginTop: 40 }} />
      ) : canSelfPunch && activeTab === 'MY_ATTENDANCE' ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Status Card */}
          <View style={styles.statusCard}>
            <Text style={styles.statusCardHeader}>TODAY'S STATUS</Text>
            <View style={styles.statusBadgeRow}>
              {activeBreak ? (
                <View style={[styles.badge, styles.badgeBreak]}>
                  <Text style={styles.badgeBreakText}>☕ ON {activeBreak.type} BREAK</Text>
                </View>
              ) : isCheckedIn ? (
                <View style={[styles.badge, styles.badgeActive]}>
                  <Text style={styles.badgeActiveText}>🟢 ACTIVE & PUNCHED IN</Text>
                </View>
              ) : isCheckedOut ? (
                <View style={[styles.badge, styles.badgeOut]}>
                  <Text style={styles.badgeOutText}>🔴 CHECKED OUT</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgePending]}>
                  <Text style={styles.badgePendingText}>⚪ NOT PUNCHED IN</Text>
                </View>
              )}
            </View>

            {myAttendance?.checkIn ? (
              <View style={styles.timeInfoRow}>
                <View style={styles.timeInfoItem}>
                  <Text style={styles.timeInfoLabel}>Check In Time</Text>
                  <Text style={styles.timeInfoValue}>
                    {new Date(myAttendance.checkIn).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {myAttendance.checkOut ? (
                  <View style={styles.timeInfoItem}>
                    <Text style={styles.timeInfoLabel}>Check Out Time</Text>
                    <Text style={styles.timeInfoValue}>
                      {new Date(myAttendance.checkOut).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.timeInfoItem}>
                    <Text style={styles.timeInfoLabel}>Working Time</Text>
                    <Text style={styles.timeInfoValue}>
                      {myAttendance.totalWorkingMinutes || 0} mins
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>

          {/* Active Break Timer Card */}
          {activeBreak ? (
            <View style={styles.activeBreakCard}>
              <Text style={styles.activeBreakTitle}>☕ Active {activeBreak.type} Break</Text>
              <Text style={styles.activeBreakTimer}>{formatSec(breakTimerSec)}</Text>
              <Text style={styles.activeBreakHint}>Telecalling is paused while on break</Text>
              <TouchableOpacity
                style={styles.endBreakButton}
                disabled={actionLoading}
                onPress={() => void handleEndBreak()}
              >
                <Text style={styles.endBreakButtonText}>
                  {actionLoading ? 'Updating...' : '▶️ End Break & Resume Calling'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Punch Actions */}
          {!isCheckedIn && !isCheckedOut ? (
            <TouchableOpacity
              style={[styles.primaryPunchBtn, actionLoading && styles.disabled]}
              disabled={actionLoading}
              onPress={() => void handleCheckIn()}
            >
              <Text style={styles.primaryPunchBtnText}>
                {actionLoading ? 'PUNCHING IN...' : '🟢 PUNCH IN NOW'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isCheckedIn && !activeBreak ? (
            <>
              <Text style={styles.sectionTitle}>☕ Take a Break</Text>
              <View style={styles.breakRow}>
                <TouchableOpacity
                  style={styles.breakCard}
                  disabled={actionLoading}
                  onPress={() => void handleStartBreak('TEA')}
                >
                  <Text style={styles.breakCardIcon}>☕</Text>
                  <Text style={styles.breakCardTitle}>Tea Break</Text>
                  <Text style={styles.breakCardDuration}>15 mins</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.breakCard}
                  disabled={actionLoading}
                  onPress={() => void handleStartBreak('LUNCH')}
                >
                  <Text style={styles.breakCardIcon}>🍱</Text>
                  <Text style={styles.breakCardTitle}>Lunch Break</Text>
                  <Text style={styles.breakCardDuration}>45 mins</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.breakCard}
                  disabled={actionLoading}
                  onPress={() => void handleStartBreak('PERSONAL')}
                >
                  <Text style={styles.breakCardIcon}>🚻</Text>
                  <Text style={styles.breakCardTitle}>Personal Break</Text>
                  <Text style={styles.breakCardDuration}>Short</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.checkOutBtn, actionLoading && styles.disabled]}
                disabled={actionLoading}
                onPress={() => void handleCheckOut()}
              >
                <Text style={styles.checkOutBtnText}>
                  {actionLoading ? 'Checking Out...' : '🔴 PUNCH OUT FOR THE DAY'}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      ) : (
        /* Team Attendance Presence Logs */
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.sectionTitle}>👥 Live Team Presence & Logs</Text>
          {teamLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No logs recorded today</Text>
            </View>
          ) : (
            teamLogs.map((item, idx) => {
              const emp = item.user || item.userId || {};
              const empName =
                (typeof emp === 'object' ? emp.name : undefined) || empNameFromId(item) || 'Employee';
              const isEmpOnBreak = Boolean(item.breaks?.some((b: any) => !b.endTime));

              return (
                <View key={item._id || idx} style={styles.teamCard}>
                  <View style={styles.teamCardHeader}>
                    <View>
                      <Text style={styles.teamEmpName}>👤 {empName}</Text>
                      <Text style={styles.teamEmpCode}>
                        {emp.employeeCode || emp.role || 'Telecaller'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.teamStatusBadge,
                        isEmpOnBreak
                          ? styles.teamStatusBreak
                          : item.checkIn && !item.checkOut
                            ? styles.teamStatusActive
                            : styles.teamStatusOffline,
                      ]}
                    >
                      <Text style={styles.teamStatusText}>
                        {isEmpOnBreak
                          ? 'ON BREAK'
                          : item.checkIn && !item.checkOut
                            ? 'ONLINE'
                            : 'OFFLINE'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.teamStatsRow}>
                    <Text style={styles.teamStatItem}>
                      In:{' '}
                      {item.checkIn
                        ? new Date(item.checkIn).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </Text>
                    <Text style={styles.teamStatItem}>
                      Out:{' '}
                      {item.checkOut
                        ? new Date(item.checkOut).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </Text>
                    <Text style={styles.teamStatItem}>
                      Worked: {item.totalWorkingMinutes || 0}m
                    </Text>
                  </View>
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
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  tabButtonActive: {
    backgroundColor: '#0284c7',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
    gap: 16,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    gap: 12,
  },
  statusCardHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  statusBadgeRow: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: '#dcfce7',
  },
  badgeActiveText: {
    color: '#15803d',
    fontWeight: '900',
    fontSize: 13,
  },
  badgeBreak: {
    backgroundColor: '#fef3c7',
  },
  badgeBreakText: {
    color: '#b45309',
    fontWeight: '900',
    fontSize: 13,
  },
  badgeOut: {
    backgroundColor: '#fee2e2',
  },
  badgeOutText: {
    color: '#991b1b',
    fontWeight: '900',
    fontSize: 13,
  },
  badgePending: {
    backgroundColor: '#f1f5f9',
  },
  badgePendingText: {
    color: '#475569',
    fontWeight: '900',
    fontSize: 13,
  },
  timeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  timeInfoItem: {
    gap: 2,
  },
  timeInfoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  timeInfoValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  activeBreakCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  activeBreakTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#92400e',
  },
  activeBreakTimer: {
    fontSize: 36,
    fontWeight: '900',
    color: '#78350f',
    fontFamily: 'monospace',
  },
  activeBreakHint: {
    fontSize: 12,
    color: '#b45309',
  },
  endBreakButton: {
    backgroundColor: '#047857',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  endBreakButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  primaryPunchBtn: {
    backgroundColor: '#047857',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryPunchBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#334155',
  },
  breakRow: {
    flexDirection: 'row',
    gap: 10,
  },
  breakCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    gap: 4,
  },
  breakCardIcon: {
    fontSize: 22,
  },
  breakCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  breakCardDuration: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  checkOutBtn: {
    backgroundColor: '#f1f5f9',
    borderColor: '#ef4444',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  checkOutBtnText: {
    color: '#ef4444',
    fontWeight: '900',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
  teamCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    gap: 10,
  },
  teamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamEmpName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  teamEmpCode: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  teamStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  teamStatusActive: {
    backgroundColor: '#dcfce7',
  },
  teamStatusBreak: {
    backgroundColor: '#fef3c7',
  },
  teamStatusOffline: {
    backgroundColor: '#f1f5f9',
  },
  teamStatusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  teamStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  teamStatItem: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  emptyTitle: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});
