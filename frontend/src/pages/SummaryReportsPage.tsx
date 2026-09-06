import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { logisticsApi } from '../api/client';
import type {
  SalesSummaryResponse,
  ImportRecapSummaryResponse,
  ExportRecapSummaryResponse,
} from '../api/client';
import { useToast } from '../contexts/ToastContext';

const money = (v: string | number) =>
  Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SummaryReportsPage() {
  const { toast } = useToast();
  const [sales, setSales] = useState<SalesSummaryResponse | null>(null);
  const [importSummary, setImportSummary] = useState<ImportRecapSummaryResponse | null>(null);
  const [exportSummary, setExportSummary] = useState<ExportRecapSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      logisticsApi.getSalesSummary(),
      logisticsApi.getImportRecapSummary(),
      logisticsApi.getExportRecapSummary(),
    ])
      .then(([s, imp, exp]) => {
        setSales(s.data);
        setImportSummary(imp.data);
        setExportSummary(exp.data);
      })
      .catch(() => toast('error', 'Failed to load summary reports'))
      .finally(() => setLoading(false));
  }, []);

  const totalRow = (label: string): Record<string, unknown> => {
    const t = sales?.total;
    return {
      buyer: label,
      factory: label,
      quantity: money(t?.quantity ?? 0),
      fob_value: money(t?.fob_value ?? 0),
      cmpt_value: money(t?.cmpt_value ?? 0),
      cost_value: money(t?.cost_value ?? 0),
      factory_amount: money(t?.factory_amount ?? 0),
      customer_received_amount: money(t?.customer_received_amount ?? 0),
    };
  };

  const buyerColumns: SpreadsheetColumn[] = [
    { title: 'Buyer', field: 'buyer', headerFilter: true },
    { title: 'Qty', field: 'quantity', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'FOB Value', field: 'fob_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'CMPT Value', field: 'cmpt_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Cost Value', field: 'cost_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Factory Payable', field: 'factory_amount', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Customer Received', field: 'customer_received_amount', hozAlign: 'right', bottomCalc: 'sum' },
  ];

  const factoryColumns: SpreadsheetColumn[] = [
    { title: 'Factory', field: 'factory', headerFilter: true },
    { title: 'Qty', field: 'quantity', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'FOB Value', field: 'fob_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'CMPT Value', field: 'cmpt_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Cost Value', field: 'cost_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Factory Payable', field: 'factory_amount', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Customer Received', field: 'customer_received_amount', hozAlign: 'right', bottomCalc: 'sum' },
  ];

  const importColumns: SpreadsheetColumn[] = [
    { title: 'Kind', field: 'kind', headerFilter: true },
    { title: 'Name', field: 'name', headerFilter: true },
    { title: 'Invoice Value', field: 'invoice_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Quantity', field: 'quantity', hozAlign: 'right', bottomCalc: 'sum' },
  ];

  const exportColumns: SpreadsheetColumn[] = [
    { title: 'Factory', field: 'factory', headerFilter: true },
    { title: 'Qty', field: 'quantity', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'FOB Value', field: 'fob_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'CMPT Value', field: 'cmpt_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Cost Value', field: 'cost_value', hozAlign: 'right', bottomCalc: 'sum' },
  ];

  const buyerData = (sales?.buyers ?? []).map((r) => ({
    ...r,
    quantity: money(r.quantity),
    fob_value: money(r.fob_value),
    cmpt_value: money(r.cmpt_value),
    cost_value: money(r.cost_value),
    factory_amount: money(r.factory_amount),
    customer_received_amount: money(r.customer_received_amount),
  }));

  const factoryData = (sales?.factories ?? []).map((r) => ({
    ...r,
    quantity: money(r.quantity),
    fob_value: money(r.fob_value),
    cmpt_value: money(r.cmpt_value),
    cost_value: money(r.cost_value),
    factory_amount: money(r.factory_amount),
    customer_received_amount: money(r.customer_received_amount),
  }));

  const importData = [
    ...(importSummary?.suppliers ?? []).map((r) => ({ kind: 'Supplier', name: r.supplier, invoice_value: money(r.invoice_value), quantity: money(r.quantity) })),
    ...(importSummary?.factories ?? []).map((r) => ({ kind: 'Factory', name: r.factory, invoice_value: money(r.invoice_value), quantity: money(r.quantity) })),
    ...(importSummary?.categories ?? []).map((r) => ({ kind: 'Category', name: r.item_category, invoice_value: money(r.invoice_value), quantity: money(r.quantity) })),
  ];

  const exportData = (exportSummary?.factories ?? []).map((r) => ({
    ...r,
    quantity: money(r.quantity),
    fob_value: money(r.fob_value),
    cmpt_value: money(r.cmpt_value),
    cost_value: money(r.cost_value),
  }));

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Summary Reports</h1>
          <p className="text-muted text-sm mt-1">RQ-047 — Sales Summary (per buyer/factory) and Import/Export Recap aggregation reports, grouped per the reference workflow.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl border border-border p-5">
            <SpreadsheetGrid
              data={[...buyerData, totalRow('GRAND TOTAL')] as unknown as Record<string, unknown>[]}
              columns={buyerColumns}
              height={300}
              toolbar
              title="Sales by Buyer"
              exportable
              columnChooser
              loading={loading}
            />
          </div>
          <div className="bg-surface rounded-xl border border-border p-5">
            <SpreadsheetGrid
              data={factoryData as unknown as Record<string, unknown>[]}
              columns={factoryColumns}
              height={300}
              toolbar
              title="Sales by Factory"
              exportable
              columnChooser
              loading={loading}
            />
          </div>
          <div className="bg-surface rounded-xl border border-border p-5">
            <SpreadsheetGrid
              data={importData as unknown as Record<string, unknown>[]}
              columns={importColumns}
              height={300}
              toolbar
              title="Import Recap Summary"
              exportable
              columnChooser
              loading={loading}
            />
          </div>
          <div className="bg-surface rounded-xl border border-border p-5">
            <SpreadsheetGrid
              data={exportData as unknown as Record<string, unknown>[]}
              columns={exportColumns}
              height={300}
              toolbar
              title="Export Recap Summary"
              exportable
              columnChooser
              loading={loading}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}