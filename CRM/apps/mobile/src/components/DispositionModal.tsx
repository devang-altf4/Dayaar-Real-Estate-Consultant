import React, { useState } from 'react';
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
import { Lead } from '../types';

interface DispositionModalProps {
  visible: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { key: 'HOT', label: '🔥 HOT', bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  { key: 'WARM', label: '⚡ WARM', bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  { key: 'COLD', label: '❄️ COLD', bg: '#e0f2fe', border: '#0284c7', text: '#075985' },
  { key: 'SITE_VISIT', label: '🏡 SITE VISIT', bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
  { key: 'BOOKED', label: '🎉 BOOKED', bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  { key: 'FOLLOW_UP', label: '📞 FOLLOW UP', bg: '#f1f5f9', border: '#64748b', text: '#334155' },
  { key: 'NOT_PICKED_UP', label: '📵 NOT PICKED', bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' },
  { key: 'NOT_INTERESTED', label: '🚫 NOT INT.', bg: '#fee2e2', border: '#f87171', text: '#7f1d1d' },
];

export const DispositionModal: React.FC<DispositionModalProps> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState('WARM');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState<string | null>(null);
  const [followUpLabel, setFollowUpLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getQuickDate = (offsetDays: number, hour: number, label: string) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, 0, 0, 0);
    return { iso: d.toISOString(), label };
  };

  const QUICK_FOLLOWUPS = [
    getQuickDate(0, 17, 'Today 5 PM'),
    getQuickDate(1, 11, 'Tomorrow 11 AM'),
    getQuickDate(2, 11, 'In 2 Days'),
    getQuickDate(3, 11, 'In 3 Days'),
    getQuickDate(7, 11, 'In 1 Week'),
  ];

  const handleSubmit = async () => {
    if (!lead) return;
    const leadId = lead._id || lead.id;

    setLoading(true);
    try {
      let temp = 'COLD';
      if (selectedStatus === 'HOT' || selectedStatus === 'SITE_VISIT' || selectedStatus === 'BOOKED') {
        temp = 'HOT';
      } else if (selectedStatus === 'WARM') {
        temp = 'WARM';
      }

      await api.patch(`/leads/${leadId}/disposition`, {
        status: selectedStatus,
        temperature: temp as any,
        employeeNotes: notes.trim() || undefined,
        nextFollowUpAt: followUpDate || undefined,
        ...(selectedStatus === 'NOT_INTERESTED'
          ? { notInterestedReason: 'OTHER', notInterestedReasonDetails: notes.trim() || 'Not interested' }
          : {}),
      });

      Alert.alert('Outcome Saved', 'Lead status & notes updated and synced to Web CRM.');
      setNotes('');
      setFollowUpDate(null);
      setFollowUpLabel(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update disposition.');
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
              <Text style={styles.title}>Update Outcome / Disposition</Text>
              <Text style={styles.leadName}>
                {lead.name} • {lead.phone}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionLabel}>Select Lead Status *</Text>
            <View style={styles.statusGrid}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.statusOption,
                      { backgroundColor: isSelected ? opt.bg : '#f8fafc', borderColor: isSelected ? opt.border : '#e2e8f0' },
                    ]}
                    onPress={() => setSelectedStatus(opt.key)}
                  >
                    <Text style={[styles.statusOptionText, { color: opt.text, fontWeight: isSelected ? '900' : '700' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Schedule Next Follow-Up</Text>
            <View style={styles.followupGrid}>
              {QUICK_FOLLOWUPS.map((q) => {
                const isSelected = followUpDate === q.iso;
                return (
                  <TouchableOpacity
                    key={q.label}
                    style={[styles.followupChip, isSelected && styles.followupChipActive]}
                    onPress={() => {
                      if (isSelected) {
                        setFollowUpDate(null);
                        setFollowUpLabel(null);
                      } else {
                        setFollowUpDate(q.iso);
                        setFollowUpLabel(q.label);
                      }
                    }}
                  >
                    <Text style={[styles.followupChipText, isSelected && styles.followupChipTextActive]}>
                      📅 {q.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {followUpLabel ? (
              <Text style={styles.selectedFollowupNotice}>
                ✓ Follow-up set for: <Text style={{ fontWeight: '800' }}>{followUpLabel}</Text>
              </Text>
            ) : null}

            <Text style={styles.sectionLabel}>Discussion & Requirement Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Budget 1.5 Cr, looking for 2BHK in Kandivali West, asked to call tomorrow..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.disabled]}
              disabled={loading}
              onPress={() => void handleSubmit()}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving to CRM...' : '💾 Save Outcome & Sync CRM'}
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
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  leadName: {
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
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: -4,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 12,
  },
  followupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  followupChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  followupChipActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  followupChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  followupChipTextActive: {
    color: '#6d28d9',
    fontWeight: '800',
  },
  selectedFollowupNotice: {
    fontSize: 11,
    color: '#059669',
    marginTop: -4,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});
