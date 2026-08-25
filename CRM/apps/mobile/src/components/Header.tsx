import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onRefresh, refreshing }) => {
  const { user, logout } = useAuth();

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return styles.adminBadge;
      case 'MANAGER':
        return styles.managerBadge;
      default:
        return styles.employeeBadge;
    }
  };

  const getRoleTextStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return styles.adminBadgeText;
      case 'MANAGER':
        return styles.managerBadgeText;
      default:
        return styles.employeeBadgeText;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandGroup}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/dayaar-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={styles.actionsGroup}>
          {onRefresh ? (
            <TouchableOpacity
              style={[styles.iconButton, refreshing && styles.disabled]}
              disabled={refreshing}
              onPress={onRefresh}
            >
              <Text style={styles.iconButtonText}>{refreshing ? '⏳' : '🔄'}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.iconButton} onPress={() => void logout()}>
            <Text style={styles.iconButtonText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {user ? (
        <View style={styles.userBanner}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
          <View style={[styles.roleBadge, getRoleBadgeStyle(user.role)]}>
            <Text style={[styles.roleBadgeText, getRoleTextStyle(user.role)]}>{user.role}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0B1727',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  logo: {
    width: 30,
    height: 30,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  adminBadge: {
    backgroundColor: '#ede9fe',
  },
  adminBadgeText: {
    color: '#6d28d9',
  },
  managerBadge: {
    backgroundColor: '#e0f2fe',
  },
  managerBadgeText: {
    color: '#0369a1',
  },
  employeeBadge: {
    backgroundColor: '#dcfce7',
  },
  employeeBadgeText: {
    color: '#15803d',
  },
});
