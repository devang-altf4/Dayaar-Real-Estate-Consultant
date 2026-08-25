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

interface ImportLeadsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({ visible, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [rawText, setRawText] = useState('');
  const [defaultProject, setDefaultProject] = useState('Godrej Reserve');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>('');
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && (user?.role === 'ADMIN' || user?.role === 'MANAGER')) {
      void (async () => {
        try {
          // Org-wide active employee list for assign/reassign pickers (managers
          // may distribute leads across the whole org per product decision).
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

  const handleImport = async () => {
    if (!rawText.trim()) {
      Alert.alert('Validation Error', 'Please paste CSV data or phone numbers.');
      return;
    }

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsedLeads: Array<{ name: string; phone: string; project?: string; notes?: string }> = [];

    for (const line of lines) {
      // Split by comma, tab, or semicolon
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      if (parts.length === 1) {
        // Just phone number
        const phone = parts[0].replace(/\D/g, '');
        if (phone.length >= 10) {
          parsedLeads.push({
            name: `Lead ${phone.slice(-4)}`,
            phone,
            project: defaultProject.trim() || undefined,
          });
        }
      } else if (parts.length >= 2) {
        // Name, Phone or Phone, Name
        let name = parts[0];
        let phone = parts[1].replace(/\D/g, '');
        let project = parts[2] || defaultProject;

        if (name.replace(/\D/g, '').length >= 10 && phone.replace(/\D/g, '').length < 10) {
          // Inverted: Phone, Name
          const temp = name;
          name = parts[1];
          phone = temp.replace(/\D/g, '');
        }

        if (phone.length >= 10) {
          parsedLeads.push({
            name: name || `Lead ${phone.slice(-4)}`,
            phone,
            project: project.trim() || undefined,
          });
        }
      }
    }

    if (parsedLeads.length === 0) {
      Alert.alert(
        'Parsing Error',
        'Could not extract valid phone numbers. Format each line as: "Name, 9876543210, Project"',
      );
      return;
    }

    setLoading(true);
    try {
      // Real endpoint: POST /leads/import/text — server parses raw text and
      // distributes round-robin. Options mirror the Web CRM import modal.
      const payload: any = {
        text: rawText,
        duplicateAction: 'SKIP',
        autoAssignStrategy: assignedEmployeeId ? 'NONE' : 'ROUND_ROBIN',
        assignScope: user?.role === 'MANAGER' ? 'TEAM' : 'ORGANIZATION',
      };
      if (assignedEmployeeId) {
        payload.targetEmployeeIds = [assignedEmployeeId];
      }

      const res = await api.post<any>('/leads/import/text', payload);

      const summary = res?.summary || {};
      const createdCount = summary.importedCount ?? parsedLeads.length;
      const dupCount = summary.skippedDuplicatesCount ?? 0;

      Alert.alert(
        'Bulk Import Completed',
        `Successfully imported ${createdCount} new leads!${dupCount > 0 ? ` (${dupCount} duplicates skipped)` : ''}`,
      );
      setRawText('');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Import Error', err.message || 'Failed to bulk import leads.');
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
              <Text style={styles.title}>Bulk Import Leads</Text>
              <Text style={styles.subtitle}>Paste CSV data or list of contacts</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Text style={styles.label}>Default Project Tag</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Godrej Reserve, Kandivali"
              placeholderTextColor="#94a3b8"
              value={defaultProject}
              onChangeText={setDefaultProject}
            />

            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && employees.length > 0 ? (
              <>
                <Text style={styles.label}>Assign All Imported Leads To:</Text>
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

            <Text style={styles.label}>Paste Leads / CSV Data *</Text>
            <Text style={styles.helper}>
              Format: Name, Phone, Project (one per line) or just phone numbers
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder={`Rahul Sharma, 9876543210, Godrej Reserve\nAmit Verma, 9812345678, Rivali Park\n9930907611`}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={8}
              value={rawText}
              onChangeText={setRawText}
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabled]}
              disabled={loading}
              onPress={() => void handleImport()}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Processing Import...' : '🚀 Import Leads & Sync to CRM'}
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
  helper: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
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
    fontSize: 13,
    fontFamily: 'monospace',
    minHeight: 140,
    textAlignVertical: 'top',
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
    backgroundColor: '#0284c7',
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
