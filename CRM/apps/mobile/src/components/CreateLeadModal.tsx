import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

interface CreateLeadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateLeadModal: React.FC<CreateLeadModalProps> = ({ visible, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [project, setProject] = useState('');
  const [source, setSource] = useState('Manual Entry');
  const [temperature, setTemperature] = useState<'HOT' | 'WARM' | 'COLD'>('WARM');
  const [notes, setNotes] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>('');
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Assignee picker loads for staff only — employees create leads for themselves.
    if (visible && (user?.role === 'ADMIN' || user?.role === 'MANAGER')) {
      void (async () => {
        try {
          const list = await api.get<User[]>('/users?role=EMPLOYEE&scope=organization');
          const emps = (list || []).filter((u: any) => u.isActive);
          setEmployees(emps);
          if (emps.length > 0 && !assignedEmployeeId) {
            setAssignedEmployeeId(emps[0]._id || emps[0].id);
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [visible, user]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Lead name is required.');
      return;
    }
    if (!phone.trim() || phone.trim().replace(/\D/g, '').length < 10) {
      Alert.alert('Validation Error', 'A valid 10-digit phone number is required.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        email: email.trim() || undefined,
        project: project.trim() || 'General Inquiry',
        source: source.trim() || 'Manual Entry',
        temperature,
        notes: notes.trim() || undefined,
      };

      if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
        if (assignedEmployeeId) {
          payload.assignedEmployeeId = assignedEmployeeId;
        }
      }

      await api.post('/leads', payload);
      Alert.alert('Success', 'Lead created and synced with Web CRM!');
      setName('');
      setPhone('');
      setAlternatePhone('');
      setEmail('');
      setProject('');
      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Create Lead Error', err.message || 'Failed to create lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Add New Lead</Text>
              <Text style={styles.subtitle}>Create a single verified inquiry contact</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Primary Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Alternate Phone (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9812345678"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={alternatePhone}
              onChangeText={setAlternatePhone}
            />

            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. rahul@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Interested Project</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Godrej Reserve, Kandivali"
              placeholderTextColor="#94a3b8"
              value={project}
              onChangeText={setProject}
            />

            <Text style={styles.label}>Lead Source</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Direct Call, Facebook, Website"
              placeholderTextColor="#94a3b8"
              value={source}
              onChangeText={setSource}
            />

            <Text style={styles.label}>Initial Lead Temperature</Text>
            <View style={styles.tempRow}>
              {(['HOT', 'WARM', 'COLD'] as const).map((temp) => (
                <TouchableOpacity
                  key={temp}
                  style={[
                    styles.tempChip,
                    temperature === temp &&
                      (temp === 'HOT'
                        ? styles.tempHot
                        : temp === 'WARM'
                          ? styles.tempWarm
                          : styles.tempCold),
                  ]}
                  onPress={() => setTemperature(temp)}
                >
                  <Text
                    style={[
                      styles.tempChipText,
                      temperature === temp && styles.tempChipTextActive,
                    ]}
                  >
                    {temp === 'HOT' ? '🔥 HOT' : temp === 'WARM' ? '⚡ WARM' : '❄️ COLD'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && employees.length > 0 ? (
              <>
                <Text style={styles.label}>Assign to Employee</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.employeeRow}>
                  {employees.map((emp) => {
                    const empId = emp._id || emp.id;
                    const isSelected = assignedEmployeeId === empId;
                    return (
                      <TouchableOpacity
                        key={empId}
                        style={[styles.empChip, isSelected && styles.empChipActive]}
                        onPress={() => setAssignedEmployeeId(empId)}
                      >
                        <Text style={[styles.empChipText, isSelected && styles.empChipTextActive]}>
                          👤 {emp.name} ({emp.employeeCode || emp.role})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            <Text style={styles.label}>Initial Discussion Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add client requirements, budget, configuration (2BHK/3BHK)..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabled]}
              disabled={loading}
              onPress={() => void handleSubmit()}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creating Lead...' : '➕ Create Lead & Sync to CRM'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: '90%',
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
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
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
  formScroll: {
    paddingHorizontal: 20,
  },
  formContent: {
    paddingVertical: 16,
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: -4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  tempRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tempChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  tempHot: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  tempWarm: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  tempCold: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  tempChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  tempChipTextActive: {
    color: '#0f172a',
    fontWeight: '900',
  },
  employeeRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  empChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    marginRight: 8,
  },
  empChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  empChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  empChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  submitButton: {
    backgroundColor: '#047857',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
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
