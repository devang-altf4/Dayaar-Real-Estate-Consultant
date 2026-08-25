import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Header } from './src/components/Header';
import { TabBar } from './src/components/TabBar';
import { CreateLeadModal } from './src/components/CreateLeadModal';
import { ImportLeadsModal } from './src/components/ImportLeadsModal';
import { DispositionModal } from './src/components/DispositionModal';
import { ReassignModal } from './src/components/ReassignModal';

import { LoginScreen } from './src/screens/auth/LoginScreen';
import { OverviewScreen } from './src/screens/overview/OverviewScreen';
import { LeadsDirectoryScreen } from './src/screens/leads/LeadsDirectoryScreen';
import { DailyQueueScreen } from './src/screens/queue/DailyQueueScreen';
import { AttendanceScreen } from './src/screens/attendance/AttendanceScreen';
import { CallLogsScreen } from './src/screens/calls/CallLogsScreen';
import { TeamManagementScreen } from './src/screens/team/TeamManagementScreen';
import { Lead } from './src/types';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Global Modals State
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showImportLeads, setShowImportLeads] = useState(false);
  const [dispositionLead, setDispositionLead] = useState<Lead | null>(null);
  const [reassignLead, setReassignLead] = useState<Lead | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const role = user.role;

  const getScreenTitle = () => {
    switch (activeTab) {
      case 'overview':
        return role === 'ADMIN' ? 'Admin Overview' : role === 'MANAGER' ? 'Manager Dashboard' : 'Daily Progress';
      case 'leads':
        return role === 'EMPLOYEE' ? 'My Assigned Leads' : 'Leads Directory';
      case 'queue':
        return 'Daily Calling Queue';
      case 'attendance':
        return role === 'EMPLOYEE' ? 'Attendance & Breaks' : 'Attendance & Team Logs';
      case 'calls':
        return 'Telecalling Logs';
      case 'team':
        return 'Team & Calling Seats';
      default:
        return 'Dayaar CRM';
    }
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewScreen
            key={refreshKey}
            onNavigateTab={setActiveTab}
            onOpenCreateLead={() => setShowCreateLead(true)}
            onOpenImportLeads={() => setShowImportLeads(true)}
          />
        );
      case 'leads':
        return (
          <LeadsDirectoryScreen
            key={refreshKey}
            onOpenCreateLead={() => setShowCreateLead(true)}
            onOpenImportLeads={() => setShowImportLeads(true)}
            onSelectLeadDisposition={(lead) => setDispositionLead(lead)}
            onSelectLeadReassign={(lead) => setReassignLead(lead)}
          />
        );
      case 'queue':
        return (
          <DailyQueueScreen
            key={refreshKey}
            onSelectLeadDisposition={(lead) => setDispositionLead(lead)}
          />
        );
      case 'attendance':
        return <AttendanceScreen key={refreshKey} />;
      case 'calls':
        return <CallLogsScreen key={refreshKey} />;
      case 'team':
        return <TeamManagementScreen key={refreshKey} />;
      default:
        return (
          <OverviewScreen
            key={refreshKey}
            onNavigateTab={setActiveTab}
            onOpenCreateLead={() => setShowCreateLead(true)}
            onOpenImportLeads={() => setShowImportLeads(true)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />
      <View style={styles.appContainer}>
        <Header
          title={getScreenTitle()}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
        />

        <View style={styles.screenWrapper}>{renderActiveScreen()}</View>

        <TabBar activeTab={activeTab} onTabPress={setActiveTab} />

        {/* Single Lead Creation Modal */}
        <CreateLeadModal
          visible={showCreateLead}
          onClose={() => setShowCreateLead(false)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />

        {/* Bulk Leads CSV Import Modal */}
        <ImportLeadsModal
          visible={showImportLeads}
          onClose={() => setShowImportLeads(false)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />

        {/* Post-Call / Lead Outcome Disposition Modal */}
        <DispositionModal
          visible={Boolean(dispositionLead)}
          lead={dispositionLead}
          onClose={() => setDispositionLead(null)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />

        {/* Lead Reassignment Modal */}
        <ReassignModal
          visible={Boolean(reassignLead)}
          lead={reassignLead}
          onClose={() => setReassignLead(null)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B1727',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenWrapper: {
    flex: 1,
    paddingBottom: 50,
  },
});
