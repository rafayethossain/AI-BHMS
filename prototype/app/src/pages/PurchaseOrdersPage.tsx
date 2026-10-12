import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { useToast } from '../components/Toast';
import { getPurchaseOrders } from '../mock/api';
import { poStatusLabel, riskLabel } from '../mock/purchaseOrders';
import type { PurchaseOrderRow } from '../mock/types';

const COLUMNS: SpreadsheetColumn[] = [
  { title: 'PO #', field: 'po_number', width: 130, frozen: true },
  { title: 'FN', field: 'fn_number', width: 110, headerFilter: true, headerFilterType: 'input' },
  { title: 'Design', field: 'design_code', width: 100, headerFilter: true },
  { title: 'Buyer', field: 'buyer', width: 120, headerFilter: true },
  { title: 'Factory', field: 'factory', width: 150, headerFilter: true },
  { title: 'Qty', field: 'quantity', width: 90, hozAlign: 'right', bottomCalc: 'sum' },
  { title: 'Value', field: 'total_value', width: 110, hozAlign: 'right' },
  { title: 'Delivery', field: 'delivery_date', width: 110 },
  { title: 'Fab', field: 'risk_fabric', width: 110, headerFilter: true },
  { title: 'Trims', field: 'risk_trims', width: 110, headerFilter: true },
  { title: 'Prod', field: 'risk_production', width: 110, headerFilter: true },
  { title: 'Deliv', field: 'risk_delivery', width: 120, headerFilter: true },
  { title: 'Overall', field: 'risk_overall', width: 130, headerFilter: true },
  { title: 'Status', field: 'status_label', width: 120, headerFilter: true },
  { title: 'Origin', field: 'origin', width: 110, headerFilter: true },
];

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pos = await getPurchaseOrders();
      if (!cancelled) {
        setRows(pos);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const gridData = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        risk_fabric: riskLabel(r.statuses.fabric),
        risk_trims: riskLabel(r.statuses.trims),
        risk_production: riskLabel(r.statuses.production),
        risk_delivery: riskLabel(r.statuses.delivery),
        risk_overall: riskLabel(r.statuses.overall),
        status_label: poStatusLabel(r.status),
      })),
    [rows],
  );

  const handleRowClick = (row: Record<string, unknown>) => {
    const poNumber = String(row.po_number ?? '');
    if (poNumber) navigate(`/purchase-orders/${poNumber}`);
  };

  const handleCreate = () => {
    addToast('Create a PO from a costing (opens in PT-014)');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border/40 px-6 py-4 bg-surface/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-heading">Purchase Orders</h1>
            <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
              <span>{rows.length} purchase orders</span>
              <span className="text-border-subtle">·</span>
              <span>Register-wide across every design FN</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shrink-0"
          >
            + Create PO
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {!loading && rows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted mb-3">No purchase orders yet.</p>
          </div>
        ) : (
          <SpreadsheetGrid
            data={gridData}
            columns={COLUMNS}
            height={560}
            toolbar
            title="Purchase Orders"
            exportable
            printable
            columnChooser
            onRowClick={handleRowClick}
            loading={loading && rows.length === 0}
          />
        )}
      </div>
    </div>
  );
}