import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StylesListPage from './pages/StylesListPage';
import StyleDetailPage from './pages/StyleDetailPage';
import FileOpeningsListPage from './pages/FileOpeningsListPage';
import FileOpeningDetailPage from './pages/FileOpeningDetailPage';
import PurchaseOrdersListPage from './pages/PurchaseOrdersListPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import OrderTrailPage from './pages/OrderTrailPage';
import BOMsListPage from './pages/BOMsListPage';
import BOMDetailPage from './pages/BOMDetailPage';
import CostingsListPage from './pages/CostingsListPage';
import CostingDetailPage from './pages/CostingDetailPage';
import TAsListPage from './pages/TAsListPage';
import TADetailPage from './pages/TADetailPage';
import LCsListPage from './pages/LCsListPage';
import LCDetailPage from './pages/LCDetailPage';
import BanksListPage from './pages/BanksListPage';
import ProductionPlansPage from './pages/ProductionPlansPage';
import DailyReportsPage from './pages/DailyReportsPage';
import InspectionsPage from './pages/InspectionsPage';
import QualityDashboardPage from './pages/QualityDashboardPage';
import CorrectiveActionsPage from './pages/CorrectiveActionsPage';
import GoldSealsPage from './pages/GoldSealsPage';
import ComplianceAuditsPage from './pages/ComplianceAuditsPage';
import ShipmentsPage from './pages/ShipmentsPage';
import ShipmentDetailPage from './pages/ShipmentDetailPage';
import ShipmentDashboardPage from './pages/ShipmentDashboardPage';
import FreightForwardersPage from './pages/FreightForwardersPage';
import AuditLogsPage from './pages/AuditLogsPage';
import HealthPage from './pages/HealthPage';
import ProductionDashboardPage from './pages/ProductionDashboardPage';
import FactoryPortalPage from './pages/FactoryPortalPage';
import ProformaInvoicesPage from './pages/ProformaInvoicesPage';
import SalesContractsPage from './pages/SalesContractsPage';
import SalesConfirmationsPage from './pages/SalesConfirmationsPage';
import DebitNotesPage from './pages/DebitNotesPage';
import InvoiceApprovalsPage from './pages/InvoiceApprovalsPage';
import TACalendarPage from './pages/TACalendarPage';
import TAHeatmapPage from './pages/TAHeatmapPage';
import ProductionDetailPage from './pages/ProductionDetailPage';
import HelpPage from './pages/HelpPage';
import ReportsDashboardPage from './pages/ReportsDashboardPage';
import ReportViewerPage from './pages/ReportViewerPage';
import ReportBuilderPage from './pages/ReportBuilderPage';
import SetupPage from './pages/SetupPage';
import MasterDataPage from './pages/MasterDataPage';
import TenantSetupPage from './pages/TenantSetupPage';
import OfficeManagementPage from './pages/OfficeManagementPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import FabricCategoriesPage from './pages/FabricCategoriesPage';
import FabricHTSCodesPage from './pages/FabricHTSCodesPage';
import FabricSuppliersPage from './pages/FabricSuppliersPage';
import FabricMillsPage from './pages/FabricMillsPage';
import FabricRFQsPage from './pages/FabricRFQsPage';
import FabricBookingsPage from './pages/FabricBookingsPage';
import FabricOrdersPage from './pages/FabricOrdersPage';
import FabricTolerancesPage from './pages/FabricTolerancesPage';
import FabricUtilizationPage from './pages/FabricUtilizationPage';
import DocketsPage from './pages/DocketsPage';
import FinalHitReconciliationsPage from './pages/FinalHitReconciliationsPage';
import FitSpecsPage from './pages/FitSpecsPage';
import JobRequestsPage from './pages/JobRequestsPage';
import OrderManagerDashboardPage from './pages/OrderManagerDashboardPage';
import BookingSchedulePage from './pages/BookingSchedulePage';
import PaperworkComparisonPage from './pages/PaperworkComparisonPage';
import TechPackImportWizardPage from './pages/TechPackImportWizardPage';
import DesignSheetsListPage from './pages/DesignSheetsListPage';
import DesignSheetPage from './pages/DesignSheetPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/styles" element={<ProtectedRoute><StylesListPage /></ProtectedRoute>} />
            <Route path="/styles/:id" element={<ProtectedRoute><StyleDetailPage /></ProtectedRoute>} />
            <Route path="/file-openings" element={<ProtectedRoute><FileOpeningsListPage /></ProtectedRoute>} />
            <Route path="/file-openings/:id" element={<ProtectedRoute><FileOpeningDetailPage /></ProtectedRoute>} />
            <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrdersListPage /></ProtectedRoute>} />
            <Route path="/purchase-orders/:id" element={<ProtectedRoute><PurchaseOrderDetailPage /></ProtectedRoute>} />
            <Route path="/purchase-orders/:id/trail" element={<ProtectedRoute><OrderTrailPage /></ProtectedRoute>} />
            <Route path="/boms" element={<ProtectedRoute><BOMsListPage /></ProtectedRoute>} />
            <Route path="/boms/:id" element={<ProtectedRoute><BOMDetailPage /></ProtectedRoute>} />
            <Route path="/costings" element={<ProtectedRoute><CostingsListPage /></ProtectedRoute>} />
            <Route path="/costings/:id" element={<ProtectedRoute><CostingDetailPage /></ProtectedRoute>} />
            <Route path="/tas" element={<ProtectedRoute><TAsListPage /></ProtectedRoute>} />
            <Route path="/tas/:id" element={<ProtectedRoute><TADetailPage /></ProtectedRoute>} />
            <Route path="/lcs" element={<ProtectedRoute><LCsListPage /></ProtectedRoute>} />
            <Route path="/lcs/:id" element={<ProtectedRoute><LCDetailPage /></ProtectedRoute>} />
            <Route path="/banks" element={<ProtectedRoute><BanksListPage /></ProtectedRoute>} />
            <Route path="/production" element={<ProtectedRoute><ProductionPlansPage /></ProtectedRoute>} />
            <Route path="/production/dashboard" element={<ProtectedRoute><ProductionDashboardPage /></ProtectedRoute>} />
            <Route path="/production/portal" element={<ProtectedRoute><FactoryPortalPage /></ProtectedRoute>} />
            <Route path="/production/daily" element={<ProtectedRoute><DailyReportsPage /></ProtectedRoute>} />
            <Route path="/order-manager" element={<ProtectedRoute><OrderManagerDashboardPage /></ProtectedRoute>} />
            <Route path="/paperwork-comparison" element={<ProtectedRoute><PaperworkComparisonPage /></ProtectedRoute>} />
            <Route path="/quality" element={<ProtectedRoute><InspectionsPage /></ProtectedRoute>} />
            <Route path="/quality/dashboard" element={<ProtectedRoute><QualityDashboardPage /></ProtectedRoute>} />
            <Route path="/quality/caps" element={<ProtectedRoute><CorrectiveActionsPage /></ProtectedRoute>} />
            <Route path="/quality/gold-seals" element={<ProtectedRoute><GoldSealsPage /></ProtectedRoute>} />
            <Route path="/quality/compliance-audits" element={<ProtectedRoute><ComplianceAuditsPage /></ProtectedRoute>} />
            <Route path="/logistics" element={<ProtectedRoute><ShipmentsPage /></ProtectedRoute>} />
            <Route path="/logistics/:id" element={<ProtectedRoute><ShipmentDetailPage /></ProtectedRoute>} />
            <Route path="/logistics/dashboard" element={<ProtectedRoute><ShipmentDashboardPage /></ProtectedRoute>} />
            <Route path="/logistics/forwarders" element={<ProtectedRoute><FreightForwardersPage /></ProtectedRoute>} />
            <Route path="/logistics/booking-schedule" element={<ProtectedRoute><BookingSchedulePage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsDashboardPage /></ProtectedRoute>} />
            <Route path="/reports/builder" element={<ProtectedRoute><ReportBuilderPage /></ProtectedRoute>} />
            <Route path="/reports/:type" element={<ProtectedRoute><ReportViewerPage /></ProtectedRoute>} />
            <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
            <Route path="/setup/tenant" element={<ProtectedRoute><TenantSetupPage /></ProtectedRoute>} />
            <Route path="/setup/offices" element={<ProtectedRoute><OfficeManagementPage /></ProtectedRoute>} />
            <Route path="/setup/:type" element={<ProtectedRoute><MasterDataPage /></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
            <Route path="/admin/health" element={<ProtectedRoute><HealthPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/roles" element={<ProtectedRoute><RolesPage /></ProtectedRoute>} />
            <Route path="/pis" element={<ProtectedRoute><ProformaInvoicesPage /></ProtectedRoute>} />
            <Route path="/scs" element={<ProtectedRoute><SalesContractsPage /></ProtectedRoute>} />
            <Route path="/sales-confirmations" element={<ProtectedRoute><SalesConfirmationsPage /></ProtectedRoute>} />
<Route path="/debit-notes" element={<ProtectedRoute><DebitNotesPage /></ProtectedRoute>} />
<Route path="/invoice-approvals" element={<ProtectedRoute><InvoiceApprovalsPage /></ProtectedRoute>} />
            <Route path="/tas/calendar" element={<ProtectedRoute><TACalendarPage /></ProtectedRoute>} />
            <Route path="/tas/heatmap" element={<ProtectedRoute><TAHeatmapPage /></ProtectedRoute>} />
            <Route path="/production/:id" element={<ProtectedRoute><ProductionDetailPage /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
            <Route path="/fabric/categories" element={<ProtectedRoute><FabricCategoriesPage /></ProtectedRoute>} />
            <Route path="/fabric/hts-codes" element={<ProtectedRoute><FabricHTSCodesPage /></ProtectedRoute>} />
            <Route path="/fabric/suppliers" element={<ProtectedRoute><FabricSuppliersPage /></ProtectedRoute>} />
            <Route path="/fabric/mills" element={<ProtectedRoute><FabricMillsPage /></ProtectedRoute>} />
            <Route path="/fabric/rfqs" element={<ProtectedRoute><FabricRFQsPage /></ProtectedRoute>} />
            <Route path="/fabric/bookings" element={<ProtectedRoute><FabricBookingsPage /></ProtectedRoute>} />
            <Route path="/fabric/orders" element={<ProtectedRoute><FabricOrdersPage /></ProtectedRoute>} />
            <Route path="/fabric/tolerances" element={<ProtectedRoute><FabricTolerancesPage /></ProtectedRoute>} />
            <Route path="/fabric/utilizations" element={<ProtectedRoute><FabricUtilizationPage /></ProtectedRoute>} />
            <Route path="/fabric/dockets" element={<ProtectedRoute><DocketsPage /></ProtectedRoute>} />
            <Route path="/logistics/reconciliations" element={<ProtectedRoute><FinalHitReconciliationsPage /></ProtectedRoute>} />
            <Route path="/fit-specs" element={<ProtectedRoute><FitSpecsPage /></ProtectedRoute>} />
            <Route path="/styles/techpack-import" element={<ProtectedRoute><TechPackImportWizardPage /></ProtectedRoute>} />
            <Route path="/design-sheets" element={<ProtectedRoute><DesignSheetsListPage /></ProtectedRoute>} />
            <Route path="/design-sheets/:id" element={<ProtectedRoute><DesignSheetPage /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><JobRequestsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
