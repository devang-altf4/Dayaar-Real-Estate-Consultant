import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AnalyticsSummary } from '../../types';

interface OverviewScreenProps {
  onNavigateTab: (tabKey: string) => void;
  onOpenCreateLead: () => void;
  onOpenImportLeads: () => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  onNavigateTab,
  onOpenCreateLead,
  onOpenImportLeads,
}) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = async () => {
    try {
      if (user?.role === 'ADMIN') {
        // Admin dashboard: org-wide KPIs (endpoint: /analytics/admin-dashboard).
        const data = await api.get<any>('/analytics/admin-dashboard');
        setAnalytics({
          totalLeads: data.totalLeadsInPipeline,
          totalCallsToday: data.todayCallsTotal,
          connectedCallsToday: data.todayConnectedCalls,
          hotLeads: data.interestedToday,
          siteVisits: undefined,
          bookedLeads: undefined,
          conversionRate: data.conversionRatePercentage,
        } as AnalyticsSummary);
      } else if (user?.role === 'MANAGER') {
        // Manager dashboard: team-scoped KPIs (endpoint: /analytics/manager-dashboard).
        const data = await api.get<any>('/analytics/manager-dashboard');
        setAnalytics({
          totalLeads: undefined,
          totalCallsToday: data.teamTodayCalls,
          connectedCallsToday: data.teamTodayConnected,
          hotLeads: undefined,
        } as AnalyticsSummary);
      } else {
        const [empStats, queueProgress] = await Promise.all([
          api.get<any>('/analytics/my-performance').catch(() => ({} as AnalyticsSummary)),
          api.get<any>('/queue/progress').catch(() => null),
        ]);
        setAnalytics({
          ...(empStats || {}),
          targetProgress: queueProgress
            ? {
                dailyTarget: queueProgress.dailyTarget,
                completedCalls: queueProgress.totalCallsMadeToday ?? queueProgress.connectedToday ?? 0,
                remainingCalls: queueProgress.remainingCalls ?? 0,
                progressPercentage: queueProgress.progressPercentage ?? 0,
              }
            : empStats?.targetProgress,
        } as AnalyticsSummary);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchOverview();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchOverview();
  };

  const role = user?.role || 'EMPLOYEE';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeTextGroup}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{user?.name || 'User'}</Text>
          <Text style={styles.roleSubtext}>
            {role === 'ADMIN'
              ? '🏢 Full Organization Control'
              : role === 'MANAGER'
                ? '👥 Team Leader & Supervisor'
                : '📞 Telecaller Workspace'}
          </Text>
        </View>
      </View>

      {/* Employee Calling Target Card */}
      {role === 'EMPLOYEE' ? (
        <View style={styles.targetCard}>
          <View style={styles.targetHeader}>
            <Text style={styles.targetTitle}>🎯 Daily Calling Target</Text>
            <Text style={styles.targetBadge}>
              {analytics?.targetProgress?.completedCalls || 0} /{' '}
              {analytics?.targetProgress?.dailyTarget || 300} Calls
            </Text>
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(
                    100,
                    analytics?.targetProgress?.progressPercentage || 0,
                  )}%`,
                },
              ]}
            />
          </View>

          <View style={styles.targetStatsRow}>
            <Text style={styles.targetSubstat}>
              Remaining:{' '}
              <Text style={{ fontWeight: '800', color: '#0f172a' }}>
                {analytics?.targetProgress?.remainingCalls || 0}
              </Text>
            </Text>
            <Text style={styles.targetSubstat}>
              Progress:{' '}
              <Text style={{ fontWeight: '800', color: '#0284c7' }}>
                {(analytics?.targetProgress?.progressPercentage || 0).toFixed(0)}%
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryQueueButton}
            onPress={() => onNavigateTab('queue')}
          >
            <Text style={styles.primaryQueueButtonText}>🚀 Open Today's Calling Queue</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Quick Action Shortcuts */}
      <Text style={styles.sectionHeader}>⚡ Quick Actions</Text>
      <View style={styles.quickGrid}>
        {(() => {
          const isStaff = role === 'ADMIN' || role === 'MANAGER';
          // Web parity: "Create New Lead" is open to every role; only
          // Import/Assign are admin+manager tools.
          return (
            <>
              <TouchableOpacity style={styles.quickCard} onPress={onOpenCreateLead}>
                <Text style={styles.quickIcon}>{isStaff ? '➕' : '📝'}</Text>
                <Text style={styles.quickLabel}>{isStaff ? 'Add Lead' : 'New Inquiry'}</Text>
              </TouchableOpacity>

              {isStaff ? (
                <TouchableOpacity style={styles.quickCard} onPress={onOpenImportLeads}>
                  <Text style={styles.quickIcon}>📥</Text>
                  <Text style={styles.quickLabel}>Bulk Import</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.quickCard}
                  onPress={() => onNavigateTab('leads')}
                >
                  <Text style={styles.quickIcon}>📂</Text>
                  <Text style={styles.quickLabel}>My Leads</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => onNavigateTab('attendance')}
              >
                <Text style={styles.quickIcon}>{isStaff ? '📋' : '⏱️'}</Text>
                <Text style={styles.quickLabel}>{isStaff ? 'Attendance' : 'My Breaks'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickCard} onPress={() => onNavigateTab(isStaff ? 'calls' : 'queue')}>
                <Text style={styles.quickIcon}>{isStaff ? '🎙️' : '🚀'}</Text>
                <Text style={styles.quickLabel}>{isStaff ? 'Call Logs' : 'Daily Queue'}</Text>
              </TouchableOpacity>
            </>
          );
        })()}
      </View>

      {/* Key Metric KPI Cards */}
      <Text style={styles.sectionHeader}>📊 Key Metrics & Pipeline</Text>
      {loading ? (
        <ActivityIndicator color="#0284c7" style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: '#0284c7' }]}>
            <Text style={styles.kpiValue}>{analytics?.totalLeads ?? 0}</Text>
            <Text style={styles.kpiLabel}>Total Leads</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: '#ef4444' }]}>
            <Text style={styles.kpiValue}>{analytics?.hotLeads ?? 0}</Text>
            <Text style={styles.kpiLabel}>🔥 Hot Leads</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.kpiValue}>{analytics?.connectedCallsToday ?? 0}</Text>
            <Text style={styles.kpiLabel}>Connected Calls Today</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}>
            <Text style={styles.kpiValue}>{analytics?.siteVisits ?? 0}</Text>
            <Text style={styles.kpiLabel}>🏡 Site Visits</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.kpiValue}>{analytics?.totalCallsToday ?? 0}</Text>
            <Text style={styles.kpiLabel}>Total Calls Attempted</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: '#059669' }]}>
            <Text style={styles.kpiValue}>{analytics?.bookedLeads ?? 0}</Text>
            <Text style={styles.kpiLabel}>🎉 Bookings Done</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
    gap: 16,
  },
  welcomeBanner: {
    backgroundColor: '#0B1727',
    borderRadius: 16,
    padding: 18,
  },
  welcomeTextGroup: {
    gap: 2,
  },
  greeting: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  welcomeName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  roleSubtext: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '700',
    marginTop: 4,
  },
  targetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    gap: 10,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  targetBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
  },
  targetStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetSubstat: {
    fontSize: 12,
    color: '#64748b',
  },
  primaryQueueButton: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryQueueButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.2,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    gap: 4,
  },
  quickIcon: {
    fontSize: 20,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
});
