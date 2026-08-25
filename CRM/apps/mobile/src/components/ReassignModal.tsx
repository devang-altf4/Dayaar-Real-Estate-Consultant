import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { Lead, User } from '../types';

interface ReassignModalProps {
  visible: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({ visible, lead, onClose, onSuccess }) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      void (async () => {
        try {
          const list = await api.get<User[]>('/users?role=EMPLOYEE&scope=organization');
          const activeEmps = (list || []).filter((u: any) => u.isActive);
          setEmployees(activeEmps);
          if (activeEmps.length > 0) {
            setSelectedEmpId(activeEmps[0]._id || activeEmps[0].id);
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [visible]);

  const handleReassign = async () => {
    if (!lead || !selectedEmpId) return;
    const leadId = lead._id || lead.id;

    setLoading(true);
    try {
      await api.post('/leads/bulk-assign', {
        leadIds: [leadId],
        employeeIds: [selectedEmpId],
        strategy: 'SINGLE',
      });

      Alert.alert('Lead Reassigned', 'Lead has been successfully reassigned in CRM!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Reassign Error', err.message || 'Failed to reassign lead.');
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Reassign Lead</Text>
              <Text style={styles.subtitle}>
                {lead.name} • {lead.phone}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Select Target Employee:</Text>
            <ScrollView style={styles.empList}>
              {employees.map((emp) => {
                const empId = emp._id || emp.id;
                const isSelected = selectedEmpId === empId;
                return (
                  <TouchableOpacity
                    key={empId}
                    style={[styles.empItem, isSelected && styles.empItemActive]}
                    onPress={() => setSelectedEmpId(empId)}
                  >
                    <View style={styles.empInfo}>
                      <Text style={[styles.empName, isSelected && styles.empNameActive]}>
                        👤 {emp.name}
                      </Text>
                      <Text style={styles.empMeta}>
                        {emp.email} • {emp.employeeCode || emp.role}
                      </Text>
                    </View>
                    {isSelected ? <Text style={styles.checkMark}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabled]}
              disabled={loading}
              onPress={() => void handleReassign()}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Reassigning...' : '🔄 Confirm Reassignment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  empList: {
    maxHeight: 280,
  },
  empItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  empItemActive: {
    borderColor: '#0284c7',
    backgroundColor: '#e0f2fe',
  },
  empInfo: {
    flex: 1,
  },
  empName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  empNameActive: {
    color: '#0369a1',
  },
  empMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0284c7',
  },
  submitButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});
