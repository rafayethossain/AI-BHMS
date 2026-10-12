import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DesignsPage from './pages/DesignsPage';
import DesignDetailPage from './pages/DesignDetailPage';
import DesignSheetPrintPage from './pages/DesignSheetPrintPage';
import DesignMaterialsPage from './pages/DesignMaterialsPage';
import DesignFitSpecsPage from './pages/DesignFitSpecsPage';
import DesignJobsPage from './pages/DesignJobsPage';
import DesignCostingsPage from './pages/DesignCostingsPage';
import DesignSalesReportPage from './pages/DesignSalesReportPage';
import VersionCommercialFilePage from './pages/VersionCommercialFilePage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import PlaceholderPage from './pages/PlaceholderPage';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/design" element={<DesignsPage />} />
              <Route path="/designs/:designCode" element={<DesignDetailPage />} />
              <Route path="/designs/:designCode/materials" element={<DesignMaterialsPage />} />
              <Route path="/designs/:designCode/fits" element={<DesignFitSpecsPage />} />
              <Route path="/designs/:designCode/jobs" element={<DesignJobsPage />} />
              <Route path="/designs/:designCode/costings" element={<DesignCostingsPage />} />
              <Route path="/designs/:designCode/sales-report" element={<DesignSalesReportPage />} />
              <Route
                path="/designs/:designCode/versions/:versionId"
                element={<VersionCommercialFilePage />}
              />
              <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/purchase-orders/:poNumber" element={<PurchaseOrderDetailPage />} />
              <Route path="*" element={<PlaceholderPage />} />
            </Route>
            <Route path="/designs/:designCode/print" element={<DesignSheetPrintPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;