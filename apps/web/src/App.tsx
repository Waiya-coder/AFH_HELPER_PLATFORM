import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedLayout } from './components/Layout';
import { AuditChecklistPage } from './pages/AuditChecklistPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { StaffLoginPage } from './pages/StaffLoginPage';
import { SignupPage } from './pages/SignupPage';
import { StaffDashboard } from './pages/StaffDashboard';
import { StaffDirectoryPage } from './pages/StaffDirectoryPage';
import { StaffJoinPage } from './pages/StaffJoinPage';
import { StaffProfilePage } from './pages/StaffProfilePage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { ClientsPage } from './pages/ClientsPage';
import { SchedulePage } from './pages/SchedulePage';
import { TimesheetsPage } from './pages/TimesheetsPage';
import { TrainingCredentialsPage } from './pages/TrainingCredentialsPage';
import { useAuthStore } from './stores/auth.store';

function HomeRedirect() {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'staff') {
    return <Navigate to="/my-shift" replace />;
  }
  return <Navigate to="/home" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/staff-login" element={<StaffLoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/join-staff" element={<StaffJoinPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/my-profile" element={<StaffProfilePage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/my-shift" element={<StaffDashboard />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/staff" element={<StaffDirectoryPage />} />
        <Route path="/timesheets" element={<TimesheetsPage />} />
        <Route path="/training" element={<TrainingCredentialsPage />} />
        <Route path="/audit-checklist" element={<AuditChecklistPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
