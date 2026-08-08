import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { logisticsApi } from '../api/client';
import type { ShipmentDashboard, Shipment } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const PIPELINE_STAGES = [
  { key: 'booking', label: 'Booking', color: 'bg-surface-alt text-white' },
  { key: 'booked', label: 'Booked', color: 'bg-blue-600 text-white' },
  { key: 'picked_up', label: 'Picked Up', color: 'bg-amber-600 text-white' },
  { key: 'in_transit', label: 'In Transit', color: 'bg-amber-500 text-white' },
  { key: 'at_port', label: 'At Port', color: 'bg-purple-600 text-white' },
  { key: 'on_water', label: 'On Water', color: 'bg-blue-500 text-white' },
  { key: 'arrived', label: 'Arrived', color: 'bg-cyan-600 text-white' },
  { key: 'cleared', label: 'Cleared', color: 'bg-indigo-600 text-white' },
  { key: 'delivered', label: 'Delivered', color: 'bg-emerald-600 text-white' },
];

const STATUS_BADGES: Record<string, string> = {
  booking: 'bg-surface-alt/20 text-body',
  booked: 'bg-blue-500/20 text-badge-blue',
  picked_up: 'bg-amber-500/20 text-badge-amber',
  in_transit: 'bg-amber-500/20 text-badge-amber',
  at_port: 'bg-purple-500/20 text-badge-purple',
  on_water: 'bg-blue-500/20 text-badge-blue',
  arrived: 'bg-cyan-500/20 text-badge-blue',
  cleared: 'bg-indigo-500/20 text-badge-blue',
  delivered: 'bg-emerald-500/20 text-badge-emerald',
  cancelled: 'bg-red-500/20 text-badge-red',
};

export default function ShipmentDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<ShipmentDashboard & { status_counts?: Record<string, number> } | null>(null);
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([]);
  const [overdueShipments, setOverdueShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [dashRes, shipmentsRes] = await Promise.all([
        logisticsApi.getShipmentDashboard(),
        logisticsApi.getShipments({ page_size: '10', ordering: '-created_at' }),
      ]);
      setDashboard(dashRes.data);
      setRecentShipments(shipmentsRes.data.results);

      if (dashRes.data.overdue > 0) {
        const overdueRes = await logisticsApi.getShipments({ page_size: '50', ordering: 'eta' });
        const today = new Date().toISOString().split('T')[0];
        const overdue = overdueRes.data.results.filter(s =>
          s.eta && s.eta < today && ['booked', 'picked_up', 'in_transit', 'at_port', 'on_water'].includes(s.status)
        );
        setOverdueShipments(overdue);
      }
    } catch {
      toast('error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStageCount = (stage: string) => {
    if (!dashboard?.status_counts) return 0;
    return dashboard.status_counts[stage] || 0;
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Shipment Dashboard</h1>
          <button onClick={() => navigate('/logistics')}
            className="px-4 py-2 bg-surface-alt hover:bg-border rounded-lg text-sm text-heading transition-colors">
            View All Shipments
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-sm text-muted">Total</div>
            <div className="text-2xl font-bold text-heading mt-1">{dashboard?.total_shipments || 0}</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-sm text-muted">In Transit</div>
            <div className="text-2xl font-bold text-badge-amber mt-1">{dashboard?.in_transit || 0}</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-sm text-muted">At Port</div>
            <div className="text-2xl font-bold text-badge-purple mt-1">{dashboard?.at_port || 0}</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-sm text-muted">Delivered</div>
            <div className="text-2xl font-bold text-badge-emerald mt-1">{dashboard?.delivered || 0}</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-sm text-muted">Overdue</div>
            <div className="text-2xl font-bold text-badge-red mt-1">{dashboard?.overdue || 0}</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-sm text-muted">ETD Today</div>
            <div className="text-2xl font-bold text-heading mt-1">{dashboard?.etd_today || 0}</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-sm text-muted">ETA Today</div>
            <div className="text-2xl font-bold text-heading mt-1">{dashboard?.eta_today || 0}</div>
          </div>
        </div>

        {/* Shipment Pipeline — real data from status_counts */}
        <div className="bg-surface rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4">Shipment Pipeline</h2>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {PIPELINE_STAGES.map((stage, idx) => (
              <div key={stage.key} className="flex items-center">
                <div className="flex flex-col items-center min-w-[90px]">
                  <div className={`w-14 h-14 rounded-full ${stage.color} flex items-center justify-center font-bold text-lg`}>
                    {getStageCount(stage.key)}
                  </div>
                  <div className="text-xs text-muted mt-2 text-center">{stage.label}</div>
                </div>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <div className="w-6 h-0.5 bg-border mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Shipments */}
          <div className="bg-surface rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">Recent Shipments</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted border-b border-border">
                    <th className="text-left py-2">Shipment #</th>
                    <th className="text-left py-2">PO #</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {recentShipments.map((shipment) => (
                    <tr key={shipment.id}
                      className="border-b border-border hover:bg-surface-alt/30 cursor-pointer"
                      onClick={() => navigate(`/logistics/${shipment.id}`)}>
                      <td className="py-2 font-mono text-heading">{shipment.shipment_number}</td>
                      <td className="py-2 text-body">{shipment.po_number}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${STATUS_BADGES[shipment.status] || 'bg-surface-alt/20 text-body'}`}>
                          {shipment.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 text-body">{shipment.eta || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overdue Shipments */}
          <div className="bg-surface rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">Overdue Shipments</h2>
            {overdueShipments.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <svg className="w-12 h-12 mx-auto mb-2 text-badge-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                No overdue shipments
              </div>
            ) : (
              <div className="space-y-3">
                {overdueShipments.map((shipment) => (
                  <div key={shipment.id}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg cursor-pointer hover:bg-red-500/20"
                    onClick={() => navigate(`/logistics/${shipment.id}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-heading">{shipment.shipment_number}</span>
                        <span className="text-muted ml-2">({shipment.po_number})</span>
                      </div>
                      <span className="text-xs text-badge-red">ETA: {shipment.eta}</span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {shipment.port_of_loading} &rarr; {shipment.port_of_discharge || 'TBD'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
