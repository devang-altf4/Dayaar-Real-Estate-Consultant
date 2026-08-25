import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { User } from '../../types';

export const TeamManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [role, setRole] = useState<'EMPLOYEE' | 'MANAGER'>('EMPLOYEE');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      // Role-scoped directory: admins see everyone, managers see their team
      // (server enforces). Assign/reassign PICKERS elsewhere use ?scope=organization.
      const res = await api.get<any>('/users');
      setUsers(Array.isArray(res) ? res : res?.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch team members.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchUsers();
  };

  const handleToggleSeat = async (targetUser: User) => {
    const targetId = targetUser._id || targetUser.id;
    try {
      // API contract: PATCH /users/:id uses `callingEnabled` (strict schema).
      await api.patch(`/users/${targetId}`, {
        callingEnabled: !targetUser.callingEnabled,
      });
      Alert.alert('Updated', `Calling seat status toggled for ${targetUser.name}.`);
      await fetchUsers();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update user.');
    }
  };

  const handleCreateUser = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Validation Error', 'Name, email, and password are required.');
      return;
    }

    setCreating(true);
    try {
      // API contract: CreateUserSchema requires phone + employeeCode and uses
      // `callingEnabled` (strict — unknown keys like callingSeatEnabled are rejected).
      if (!phone.trim()) {
        Alert.alert('Validation Error', 'Phone number is required (10+ digits).');
        setCreating(false);
        return;
      }
      await api.post('/users', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        employeeCode: employeeCode.trim() || `EMP-${Date.now().toString().slice(-5)}`,
        role,
        callingEnabled: true,
      });

      Alert.alert('User Created', `Successfully added ${name} to the team!`);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setEmployeeCode('');
      setShowAddModal(false);
      await fetchUsers();
    } catch (err: any) {
      Alert.alert('Create Error', err.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBanner}>
        <View>
          <Text style={styles.headerTitle}>👥 Team & Seat Management</Text>
          <Text style={styles.headerSubtitle}>
            Manage telecallers, managers, and calling seats
          </Text>
        </View>

        {user?.role === 'ADMIN' ? (
          <TouchableOpacity
            style={styles.addUserButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addUserButtonText}>➕ Add Member</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {users.map((u) => {
            const uId = u._id || u.id;
            return (
              <View key={uId} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    {u.phone ? <Text style={styles.userPhone}>📞 {u.phone}</Text> : null}
                  </View>

                  <View
                    style={[
                      styles.roleBadge,
                      u.role === 'ADMIN'
                        ? styles.adminBadge
                        : u.role === 'MANAGER'
                          ? styles.managerBadge
                          : styles.employeeBadge,
                    ]}
                  >
                    <Text style={styles.roleBadgeText}>{u.role}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.empCodeText}>
                    Code: {u.employeeCode || 'EMP-AUTO'}
                  </Text>
                  <Text style={styles.statusText}>
                    {u.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </Text>
                </View>

                {user?.role === 'ADMIN' ? (
                  <View style={styles.seatControlRow}>
                    <Text style={styles.seatLabel}>
                      Calling Seat:{' '}
                      <Text
                        style={{
                          fontWeight: '800',
                          color: (u as any).callingEnabled ? '#15803d' : '#94a3b8',
                        }}
                      >
                        {(u as any).callingEnabled ? 'Active' : 'Disabled'}
                      </Text>
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.toggleSeatBtn,
                        (u as any).callingEnabled ? styles.toggleSeatBtnActive : styles.toggleSeatBtnInactive,
                      ]}
                      onPress={() => void handleToggleSeat(u)}
                    >
                      <Text style={styles.toggleSeatBtnText}>
                        {(u as any).callingEnabled ? 'Disable Seat' : 'Enable Seat'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add Member Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Team Member</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Priya Patel"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. priya@dayaar.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.inputLabel}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Create login password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.inputLabel}>Employee Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. EMP105"
                placeholderTextColor="#94a3b8"
                value={employeeCode}
                onChangeText={setEmployeeCode}
              />

              <Text style={styles.inputLabel}>Select Role</Text>
              <View style={styles.rolePickerRow}>
                {(['EMPLOYEE', 'MANAGER'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rolePickerBtn, role === r && styles.rolePickerBtnActive]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.rolePickerText, role === r && styles.rolePickerTextActive]}>
                      {r === 'EMPLOYEE' ? '📞 Telecaller (Employee)' : '👥 Manager'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, creating && styles.disabled]}
                disabled={creating}
                onPress={() => void handleCreateUser()}
              >
                <Text style={styles.modalSubmitBtnText}>
                  {creating ? 'Creating...' : '➕ Create Member & Grant Access'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  addUserButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addUserButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    paddingBottom: 80,
    gap: 12,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    gap: 10,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  userPhone: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '600',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminBadge: {
    backgroundColor: '#ede9fe',
  },
  managerBadge: {
    backgroundColor: '#e0f2fe',
  },
  employeeBadge: {
    backgroundColor: '#dcfce7',
  },
  roleBadgeText: {
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
  empCodeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  seatControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  seatLabel: {
    fontSize: 12,
    color: '#334155',
  },
  toggleSeatBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleSeatBtnActive: {
    backgroundColor: '#fee2e2',
  },
  toggleSeatBtnInactive: {
    backgroundColor: '#dcfce7',
  },
  toggleSeatBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    paddingVertical: 16,
    gap: 10,
  },
  inputLabel: {
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
    fontSize: 14,
    color: '#0f172a',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rolePickerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    alignItems: 'center',
  },
  rolePickerBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  rolePickerText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  rolePickerTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  modalSubmitBtn: {
    backgroundColor: '#047857',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});
