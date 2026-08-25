import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface TabBarProps {
  activeTab: string;
  onTabPress: (tabKey: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabPress }) => {
  const { user } = useAuth();
  const role = user?.role || 'EMPLOYEE';

  const tabs =
    role === 'ADMIN' || role === 'MANAGER'
      ? [
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'leads', label: 'Leads', icon: '📂' },
          { key: 'attendance', label: 'Attendance', icon: '⏱️' },
          { key: 'calls', label: 'Call Logs', icon: '🎙️' },
          { key: 'team', label: 'Team', icon: '👥' },
        ]
      : [
          { key: 'queue', label: 'Daily Queue', icon: '🚀' },
          { key: 'leads', label: 'My Leads', icon: '📂' },
          { key: 'attendance', label: 'Breaks', icon: '⏱️' },
          { key: 'calls', label: 'History', icon: '📞' },
          { key: 'overview', label: 'Target', icon: '📊' },
        ];

  return (
    <View style={styles.container}>
      {tabs.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => onTabPress(t.key)}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 6,
    paddingBottom: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#f0f9ff',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#0284c7',
    fontWeight: '900',
  },
});
