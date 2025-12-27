
import React, { useState } from 'react';
import { AppView, AuditLogEntry, AnalysisReport, User } from './types';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import AuditView from './components/AuditView';
import { INITIAL_AUDIT_LOGS } from './constants';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(null);

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleChangeView = (view: AppView) => setCurrentView(view);
  
  const handleAddAuditLog = (log: AuditLogEntry) => {
      setAuditLogs(prev => [log, ...prev]);
  };

  const handleSetReport = (report: AnalysisReport) => {
    setCurrentReport(report);
  };

  return (
    <>
      {currentView === AppView.LOGIN && <LoginView onLogin={handleLogin} />}
      
      {user && (
        <>
          {/* Persist Dashboard View in DOM but hide it when viewing report to save state */}
          <div style={{ display: currentView === AppView.DASHBOARD ? 'block' : 'none', height: '100%' }}>
            <DashboardView 
              onChangeView={handleChangeView} 
              onAddAuditLog={handleAddAuditLog} 
              onSetReport={handleSetReport}
              user={user}
            />
          </div>

          {currentView === AppView.REPORT && (
            <AuditView 
              onChangeView={handleChangeView} 
              auditLogs={auditLogs} 
              currentReport={currentReport} 
            />
          )}
        </>
      )}
    </>
  );
};

export default App;
