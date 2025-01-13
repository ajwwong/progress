import { Navigate, Route, Routes } from 'react-router-dom';
import { ClientLayout } from '../layouts/ClientLayout';
import { ClientDashboard } from '../pages/client/ClientDashboard';
import { ClientAppointments } from '../pages/client/ClientAppointments';
import { ClientProfile } from '../pages/client/ClientProfile';
import { ClientSignIn } from '../pages/client/ClientSignIn';
import { ClientForms } from '../pages/client/forms/ClientForms';
import { FormRenderer } from '../pages/client/forms/FormRenderer';
import { ClientBilling } from '../pages/client/ClientBilling';
import { useMedplumProfile } from '@medplum/react';

export function ClientRoutes() {
  const profile = useMedplumProfile();

  if (!profile) {
    return (
      <Routes>
        <Route path="signin" element={<ClientSignIn />} />
        <Route path="*" element={<Navigate to="signin" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<ClientLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ClientDashboard />} />
        <Route path="appointments" element={<ClientAppointments />} />
        <Route path="profile" element={<ClientProfile />} />
        <Route path="forms" element={<ClientForms />} />
        <Route path="forms/:formId" element={<FormRenderer />} />
        <Route path="billing" element={<ClientBilling />} />
      </Route>
    </Routes>
  );
}