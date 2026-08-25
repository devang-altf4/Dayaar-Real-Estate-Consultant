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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Lead } from '../../types';

const { DayaarDevice } = NativeModules;

interface LeadsDirectoryScreenProps {
  onOpenCreateLead: () => void;
  onOpenImportLeads: () => void;
  onSelectLeadDisposition: (lead: Lead) => void;
  onSelectLeadReassign: (lead: Lead) => void;
}

const STATUS_FILTERS = [
  'ALL',
  'NEW',
  'HOT',
  'WARM',
  'COLD',
  'SITE_VISIT',
  'BOOKED',
  'FOLLOW_UP',
  'NOT_INTERESTED',
];

export const LeadsDirectoryScreen: React.FC<LeadsDirectoryScreenProps> = ({
  onOpenCreateLead,
  onOpenImportLeads,
  onSelectLeadDisposition,
  onSelectLeadReassign,
}) => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('limit', '100');

      const data = await api.get<any>(`/leads?${params.toString()}`);
      // GET /leads returns { data: [...], meta } — unwrap before storing.
      setLeads(Array.isArray(data) ? data : data?.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch leads.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchLeads();
  }, [statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchLeads();
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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'HOT':
        return { bg: '#fee2e2', text: '#991b1b' };
      case 'WARM':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'COLD':
        return { bg: '#e0f2fe', text: '#075985' };
      case 'SITE_VISIT':
        return { bg: '#ede9fe', text: '#5b21b6' };
      case 'BOOKED':
        return { bg: '#dcfce7', text: '#166534' };
      case 'FOLLOW_UP':
        return { bg: '#f1f5f9', text: '#334155' };
      default:
        return { bg: '#f3f4f6', text: '#4b5563' };
    }
  };

  const role = user?.role || 'EMPLOYEE';

  return (
    <View style={styles.container}>
      {/* Search & Actions Bar */}
      <View style={styles.topControlSection}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search by name, phone, project..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => void fetchLeads()}
          />
          <TouchableOpacity style={styles.searchButton} onPress={() => void fetchLeads()}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.createLeadBtn} onPress={onOpenCreateLead}>
            <Text style={styles.createLeadBtnText}>➕ Create New Lead</Text>
          </TouchableOpacity>

          {(role === 'ADMIN' || role === 'MANAGER') ? (
            <TouchableOpacity style={styles.importLeadsBtn} onPress={onOpenImportLeads}>
              <Text style={styles.importLeadsBtnText}>📥 Bulk Import</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {STATUS_FILTERS.map((st) => {
            const isSelected = statusFilter === st;
            return (
              <TouchableOpacity
                key={st}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Leads List */}
      {loading ? (
        <ActivityIndicator color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {leads.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No leads found</Text>
              <Text style={styles.emptySubtitle}>Try changing your search or status filter</Text>
            </View>
          ) : (
            leads.map((lead) => {
              const leadId = lead._id || lead.id;
              const badge = getStatusBadgeStyle(lead.status);
              const assignedName =
                typeof lead.assignedEmployeeId === 'object' && lead.assignedEmployeeId?.name
                  ? lead.assignedEmployeeId.name
                  : null;

              return (
                <View key={leadId} style={styles.leadCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.leadMainInfo}>
                      <Text style={styles.leadName}>{lead.name}</Text>
                      <Text style={styles.leadPhone}>📞 {lead.phone}</Text>
                      {lead.project ? (
                        <Text style={styles.leadProject}>🏢 {lead.project}</Text>
                      ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                        {lead.status}
                      </Text>
                    </View>
                  </View>

                  {assignedName ? (
                    <Text style={styles.assigneeText}>👤 Assigned: {assignedName}</Text>
                  ) : null}

                  {lead.employeeNotes ? (
                    <Text style={styles.notesPreview} numberOfLines={2}>
                      💬 {lead.employeeNotes}
                    </Text>
                  ) : null}

                  {lead.nextFollowUpAt || lead.followUpAt ? (
                    <Text style={styles.followupText}>
                      📅 Follow-up:{' '}
                      {new Date(lead.nextFollowUpAt || lead.followUpAt!).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : null}

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.dialActionBtn}
                      onPress={() => handleDial(lead)}
                    >
                      <Text style={styles.dialActionBtnText}>📞 Call via SIM</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.outcomeActionBtn}
                      onPress={() => onSelectLeadDisposition(lead)}
                    >
                      <Text style={styles.outcomeActionBtnText}>📝 Outcome</Text>
                    </TouchableOpacity>

                    {(role === 'ADMIN' || role === 'MANAGER') ? (
                      <TouchableOpacity
                        style={styles.reassignActionBtn}
                        onPress={() => onSelectLeadReassign(lead)}
                      >
                        <Text style={styles.reassignActionBtnText}>🔄 Reassign</Text>
                      </TouchableOpacity>
                    ) : null}
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
  topControlSection: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  searchButton: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  createLeadBtn: {
    flex: 1,
    backgroundColor: '#047857',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createLeadBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  importLeadsBtn: {
    flex: 1,
    backgroundColor: '#0369a1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  importLeadsBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  filterScroll: {
    flexDirection: 'row',
    marginTop: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    paddingBottom: 80,
    gap: 12,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
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
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  leadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leadMainInfo: {
    flex: 1,
    gap: 2,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  leadPhone: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '700',
  },
  leadProject: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  assigneeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  notesPreview: {
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  followupText: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  dialActionBtn: {
    flex: 1.3,
    backgroundColor: '#047857',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dialActionBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  outcomeActionBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  outcomeActionBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  reassignActionBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  reassignActionBtnText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 12,
  },
});
