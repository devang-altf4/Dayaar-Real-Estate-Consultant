import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeModules,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { Lead } from '../../types';

const { DayaarDevice } = NativeModules;

interface DailyQueueScreenProps {
  onSelectLeadDisposition: (lead: Lead) => void;
}

export const DailyQueueScreen: React.FC<DailyQueueScreenProps> = ({ onSelectLeadDisposition }) => {
  const [queue, setQueue] = useState<Lead[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = async () => {
    try {
      // Real endpoints: GET /queue (daily calling queue) and GET /queue/progress.
      const [queueData, progressData] = await Promise.all([
        api.get<any>('/queue').catch(() => null),
        api.get<any>('/queue/progress').catch(() => null),
      ]);
      const rows = Array.isArray(queueData)
        ? queueData
        : queueData?.queue || queueData?.data || queueData?.leads || [];
      setQueue(rows);
      setProgress(
        progressData
          ? {
              dailyTarget: progressData.dailyTarget,
              completedCalls:
                progressData.totalCallsMadeToday ?? progressData.connectedToday ?? 0,
              remainingCalls: progressData.remainingCalls ?? 0,
              progressPercentage: progressData.progressPercentage ?? 0,
            }
          : null,
      );
    } catch (err: any) {
      Alert.alert('Queue Error', err.message || 'Failed to load queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchQueue();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchQueue();
  };

  const requestCallPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      {
        title: 'Phone Call Permission',
        message: 'Dayaar CRM dials leads through your SIM.',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleDial = async (lead: Lead) => {
    const leadId = lead._id || lead.id;
    try {
      let dialNumber = lead.phone;
      try {
        const res = await api.post<any>('/calls/initiate', { leadId, origin: 'ANDROID' });
        if (res?.phoneNumber) {
          dialNumber = res.phoneNumber;
        }
      } catch {
        // Fall back to direct phone number if server is offline or redial gap is active
      }

      if (DayaarDevice?.placeCall) {
        await requestCallPermission();
        await DayaarDevice.placeCall(dialNumber);
      }
      onSelectLeadDisposition(lead);
    } catch (err: any) {
      Alert.alert(
        'Call Notice',
        err.message || 'Opening outcome logger.',
      );
      onSelectLeadDisposition(lead);
    }
  };

  return (
    <View style={styles.container}>
      {/* Target Progress Banner */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>⚡ Today's Telecalling Progress</Text>
          <Text style={styles.progressScore}>
            {progress?.completedCalls || 0} / {progress?.dailyTarget || 300} Calls Done
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, progress?.progressPercentage || 0)}%` },
            ]}
          />
        </View>
        <View style={styles.progressFooter}>
          <Text style={styles.progressRemaining}>
            Queue Remaining:{' '}
            <Text style={{ fontWeight: '800', color: '#0f172a' }}>{queue.length} Leads</Text>
          </Text>
          <Text style={styles.progressPercent}>
            {(progress?.progressPercentage || 0).toFixed(0)}% Completed
          </Text>
        </View>
      </View>

      {/* Queue List */}
      {loading ? (
        <ActivityIndicator color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {queue.length === 0 ? (
            <View style={styles.emptyQueueCard}>
              <Text style={styles.emptyQueueIcon}>🎉</Text>
              <Text style={styles.emptyQueueTitle}>All Caught Up!</Text>
              <Text style={styles.emptyQueueSubtitle}>
                No pending calls due right now in your queue.
              </Text>
            </View>
          ) : (
            queue.map((lead, index) => {
              const leadId = lead._id || lead.id;
              const isFirst = index === 0;

              return (
                <View key={leadId} style={[styles.leadCard, isFirst && styles.leadCardFirst]}>
                  {isFirst ? (
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityBadgeText}>🔥 PRIORITY CALL NEXT</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardHeader}>
                    <View style={styles.leadInfo}>
                      <Text style={styles.leadName}>{lead.name}</Text>
                      <Text style={styles.leadPhone}>📞 {lead.phone}</Text>
                      {lead.project ? (
                        <Text style={styles.leadProject}>🏢 {lead.project}</Text>
                      ) : null}
                    </View>

                    <View style={styles.tempBadge}>
                      <Text style={styles.tempBadgeText}>{lead.temperature || 'WARM'}</Text>
                    </View>
                  </View>

                  {lead.employeeNotes ? (
                    <Text style={styles.notesText} numberOfLines={2}>
                      💬 {lead.employeeNotes}
                    </Text>
                  ) : null}

                  {lead.nextFollowUpAt ? (
                    <Text style={styles.dueText}>
                      ⏰ Due:{' '}
                      {new Date(lead.nextFollowUpAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : null}

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.primaryDialBtn}
                      onPress={() => handleDial(lead)}
                    >
                      <Text style={styles.primaryDialBtnText}>📞 Dial Call (SIM)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryOutcomeBtn}
                      onPress={() => onSelectLeadDisposition(lead)}
                    >
                      <Text style={styles.secondaryOutcomeBtnText}>📝 Log Outcome</Text>
                    </TouchableOpacity>
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
  progressCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  progressScore: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressRemaining: {
    fontSize: 11,
    color: '#64748b',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    paddingBottom: 80,
    gap: 12,
  },
  emptyQueueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 36,
    alignItems: 'center',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    marginTop: 20,
    gap: 6,
  },
  emptyQueueIcon: {
    fontSize: 36,
  },
  emptyQueueTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  emptyQueueSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  leadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    gap: 8,
  },
  leadCardFirst: {
    borderColor: '#0284c7',
    borderWidth: 2,
    backgroundColor: '#f0f9ff',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  priorityBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leadInfo: {
    flex: 1,
    gap: 2,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  leadPhone: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284c7',
  },
  leadProject: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  tempBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tempBadgeText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '900',
  },
  notesText: {
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 8,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  dueText: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryDialBtn: {
    flex: 1.5,
    backgroundColor: '#047857',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryDialBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  secondaryOutcomeBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryOutcomeBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
});
