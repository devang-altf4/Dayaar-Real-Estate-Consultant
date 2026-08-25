import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const { DayaarDevice } = NativeModules;

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPairing, setShowPairing] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQrPairing = async () => {
    if (!DayaarDevice?.scanPairingQr) {
      Alert.alert('Unavailable', 'QR scanner is only available on physical Android devices.');
      return;
    }
    try {
      const scanned = await DayaarDevice.scanPairingQr();
      if (!scanned) return;
      const parsed = JSON.parse(scanned);
      if (parsed.pairingCode && parsed.pairingToken && parsed.apiBaseUrl) {
        setLoading(true);
        await DayaarDevice.pairDevice(parsed.apiBaseUrl, parsed.pairingCode, parsed.pairingToken);
        Alert.alert('Device Paired', 'Device paired successfully! Please log in with your credentials.');
      }
    } catch (err: any) {
      Alert.alert('Pairing Error', err.message || 'Failed to scan QR.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Image
                source={require('../../../assets/dayaar-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>DAYAAR CRM</Text>
            <Text style={styles.appTagline}>Real Estate Telecalling & Lead Management</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.inputLabel}>Corporate Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. salman@dayaar.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabled]}
              disabled={loading}
              onPress={() => void handleLogin()}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In to CRM</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.qrButton} onPress={() => void handleQrPairing()}>
              <Text style={styles.qrButtonText}>📷 Pair Android Telecaller Handset</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerText}>
          Dayaar Real Estate Consultant • Synchronized with Web CRM
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1727',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#0B1727',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 12,
  },
  logo: {
    width: 48,
    height: 48,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  form: {
    gap: 12,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  eyeButton: {
    padding: 6,
  },
  eyeText: {
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
  },
  qrButton: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  qrButtonText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 13,
  },
  footerText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 24,
  },
});
