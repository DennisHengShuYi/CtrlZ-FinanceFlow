import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import LoginPage from "./pages/LoginPage";
<<<<<<< HEAD
import DashboardPage from "./pages/DashboardPage";
=======
import DashboardLayout from "./components/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import InvoicesPage from "./pages/InvoicesPage";
import ClientsPage from "./pages/ClientsPage";
import PaymentsPage from "./pages/PaymentsPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import SettingsPage from "./pages/SettingsPage";
import ReceiptScanPage from "./pages/ReceiptScanPage";
>>>>>>> origin/minhan

export default function App() {
  return (
    <Routes>
      {/* Public route — redirects to dashboard if already signed in */}
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <LoginPage />
            </SignedOut>
          </>
        }
      />

<<<<<<< HEAD
      {/* Protected dashboard route */}
=======
      {/* Protected dashboard routes with sidebar layout */}
>>>>>>> origin/minhan
      <Route
        path="/dashboard"
        element={
          <>
            <SignedIn>
<<<<<<< HEAD
              <DashboardPage />
=======
              <DashboardLayout />
>>>>>>> origin/minhan
            </SignedIn>
            <SignedOut>
              <Navigate to="/" replace />
            </SignedOut>
          </>
        }
<<<<<<< HEAD
      />
=======
      >
        <Route index element={<OverviewPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="scan-receipt" element={<ReceiptScanPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
>>>>>>> origin/minhan
    </Routes>
  );
}
