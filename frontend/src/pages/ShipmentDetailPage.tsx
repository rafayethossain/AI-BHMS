import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logisticsApi, setupApi, merchApi } from '../api/client';
import type { Shipment, ShippingDocument } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import SearchableSelect from '../components/SearchableSelect';
import Layout from '../components/Layout';

const MODE_COLORS: Record<string, string> = {
  sea: 'bg-blue-500/20 text-badge-blue',
  air: 'bg-purple-500/20 text-badge-purple',
  road: 'bg-amber-500/20 text-badge-amber',
  rail: 'bg-emerald-500/20 text-badge-emerald',
  multi: 'bg-surface-alt/20 text-muted',
};

const STATUS_COLORS: Record<string, string> = {
  booking: 'bg-surface-alt/20 text-muted',
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

const STATUS_FLOW = ['booking', 'booked', 'picked_up', 'in_transit', 'at_port', 'on_water', 'arrived', 'cleared', 'delivered'];

const MODES = [
  { value: 'sea', label: 'Sea' },
  { value: 'air', label: 'Air' },
  { value: 'road', label: 'Road' },
  { value: 'rail', label: 'Rail' },
  { value: 'multi', label: 'Multi-Modal' },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
  booking: ['booked', 'cancelled'],
  booked: ['picked_up', 'cancelled'],
  picked_up: ['in_transit'],
  in_transit: ['at_port', 'arrived'],
  at_port: ['on_water'],
  on_water: ['arrived'],
  arrived: ['cleared'],
  cleared: ['delivered'],
};

const DOC_TYPE_COLORS: Record<string, string> = {
  bl: 'bg-blue-500/20 text-badge-blue',
  ci: 'bg-emerald-500/20 text-badge-emerald',
  pl: 'bg-amber-500/20 text-badge-amber',
  co: 'bg-purple-500/20 text-badge-purple',
  fumigation: 'bg-teal-500/20 text-badge-blue',
  inspection: 'bg-cyan-500/20 text-badge-blue',
  insurance: 'bg-indigo-500/20 text-badge-blue',
  other: 'bg-surface-alt/20 text-muted',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  bl: 'Bill of Lading',
  ci: 'Commercial Invoice',
  pl: 'Packing List',
  co: 'Certificate of Origin',
  fumigation: 'Fumigation Cert.',
  inspection: 'Inspection Cert.',
  insurance: 'Insurance Cert.',
  other: 'Other',
};

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ document_type: '', document_number: '', document_date: '', notes: '' });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [pos, setPOs] = useState<{ value: string; label: string }[]>([]);
  const [freightForwarders, setFreightForwarders] = useState<{ value: string; label: string }[]>([]);
  const [editForm, setEditForm] = useState({
    purchase_order: '', factory: '', freight_forwarder: '', mode: 'sea',
    booking_date: '', etd: '', eta: '', port_of_loading: '', port_of_discharge: '',
    container_number: '', seal_number: '', container_size: '', quantity: '',
    weight_kg: '', cbm: '', vessel_name: '', voyage_number: '', remarks: '',
  });

  useEffect(() => {
    setupApi.getFactories({ page_size: '100' }).then(r => {
      setFactories(r.data.results.map(f => ({ value: f.id, label: f.name })));
    }).catch(() => {});
    merchApi.getPOs({ page_size: '100' }).then(r => {
      setPOs(r.data.results.map(p => ({ value: p.id, label: p.po_number })));
    }).catch(() => {});
    logisticsApi.getFreightForwarders({ page_size: '100' }).then(r => {
      setFreightForwarders(r.data.results.map(f => ({ value: f.id, label: `${f.name} (${f.code})` })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (shipment) {
      setEditForm({
        purchase_order: shipment.purchase_order || '',
        factory: shipment.factory || '',
        freight_forwarder: shipment.freight_forwarder || '',
        mode: shipment.mode || 'sea',
        booking_date: shipment.booking_date || '',
        etd: shipment.etd || '',
        eta: shipment.eta || '',
        port_of_loading: shipment.port_of_loading || '',
        port_of_discharge: shipment.port_of_discharge || '',
        container_number: shipment.container_number || '',
        seal_number: shipment.seal_number || '',
        container_size: shipment.container_size || '',
        quantity: String(shipment.quantity ?? ''),
        weight_kg: String(shipment.weight_kg ?? ''),
        cbm: String(shipment.cbm ?? ''),
        vessel_name: shipment.vessel_name || '',
        voyage_number: shipment.voyage_number || '',
        remarks: shipment.remarks || '',
      });
    }
  }, [shipment]);

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setEditSaving(true);
    try {
      const payload: Record<string, unknown> = {
        purchase_order: editForm.purchase_order,
        factory: editForm.factory,
        mode: editForm.mode,
        quantity: Number(editForm.quantity) || 0,
      };
      if (editForm.freight_forwarder) payload.freight_forwarder = editForm.freight_forwarder;
      if (editForm.booking_date) payload.booking_date = editForm.booking_date;
      if (editForm.etd) payload.etd = editForm.etd;
      if (editForm.eta) payload.eta = editForm.eta;
      if (editForm.port_of_loading) payload.port_of_loading = editForm.port_of_loading;
      if (editForm.port_of_discharge) payload.port_of_discharge = editForm.port_of_discharge;
      if (editForm.container_number) payload.container_number = editForm.container_number;
      if (editForm.seal_number) payload.seal_number = editForm.seal_number;
      if (editForm.container_size) payload.container_size = editForm.container_size;
      if (editForm.weight_kg) payload.weight_kg = Number(editForm.weight_kg);
      if (editForm.cbm) payload.cbm = Number(editForm.cbm);
      if (editForm.vessel_name) payload.vessel_name = editForm.vessel_name;
      if (editForm.voyage_number) payload.voyage_number = editForm.voyage_number;
      if (editForm.remarks) payload.remarks = editForm.remarks;
      await logisticsApi.updateShipment(id, payload);
      toast('success', 'Shipment updated');
      setShowEditModal(false);
      fetchShipment();
    } catch { toast('error', 'Failed to update shipment'); } finally { setEditSaving(false); }
  };

  const fetchShipment = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await logisticsApi.getShipment(id);
      setShipment(res.data);
    } catch { toast('error', 'Failed to load shipment'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchShipment(); }, [id]);

  const handleTransition = async (status: string) => {
    if (!id) return;
    try {
      await logisticsApi.transitionShipment(id, status);
      toast('success', `Shipment transitioned to ${status.replace(/_/g, ' ')}`);
      fetchShipment();
    } catch { toast('error', 'Failed to transition shipment'); }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const res = await logisticsApi.exportShipment(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipment-${shipment?.shipment_number || id}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast('success', 'Shipment exported');
    } catch { toast('error', 'Failed to export'); }
  };

  const handleAddDoc = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('shipment', id);
      fd.append('document_type', docForm.document_type);
      if (docForm.document_number) fd.append('document_number', docForm.document_number);
      if (docForm.document_date) fd.append('document_date', docForm.document_date);
      if (docForm.notes) fd.append('notes', docForm.notes);
      if (docFile) fd.append('file', docFile);
      await logisticsApi.createDocument(fd as unknown as Record<string, unknown>);
      toast('success', 'Document added');
      setShowDocModal(false);
      setDocForm({ document_type: '', document_number: '', document_date: '', notes: '' });
      setDocFile(null);
      fetchShipment();
    } catch { toast('error', 'Failed to add document'); } finally { setSaving(false); }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await logisticsApi.deleteDocument(docId);
      toast('success', 'Document deleted');
      fetchShipment();
    } catch { toast('error', 'Failed to delete document'); }
  };

  if (loading) {
    return (
      <Layout>
        <main className="max-w-7xl mx-auto px-6 py-20 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </main>
      </Layout>
    );
  }

  if (!shipment) {
    return (
      <Layout>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-muted">Shipment not found</p>
        </main>
      </Layout>
    );
  }

  const currentIdx = STATUS_FLOW.indexOf(shipment.status);
  const nextTransitions = VALID_TRANSITIONS[shipment.status] || [];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/logistics')} className="text-muted hover:text-heading text-sm">&larr; Back</button>
            <div>
              <h1 className="text-2xl font-bold">{shipment.shipment_number}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[shipment.status] || ''}`}>
                  {shipment.status.replace(/_/g, ' ')}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${MODE_COLORS[shipment.mode] || ''}`}>
                  {shipment.mode}
                </span>
                {shipment.risk_level_detail && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: shipment.risk_level_detail.color }}>{shipment.risk_level_detail.code}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {nextTransitions.filter(s => s !== 'cancelled').map((s) => (
              <button key={s} onClick={() => handleTransition(s)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
                Mark {s.replace(/_/g, ' ')}
              </button>
            ))}
            <button onClick={handleExport}
              className="px-4 py-2 bg-surface-alt hover:bg-border text-heading rounded-lg text-sm font-medium transition-colors">
              Export CSV
            </button>
            {(shipment.status === 'booking' || shipment.status === 'booked') && (
              <button onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-surface-alt hover:bg-border text-heading rounded-lg text-sm font-medium transition-colors">
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold mb-3">Shipment Info</h2>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted text-sm">PO #</span><span className="font-mono">{shipment.po_number}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Factory</span><span>{shipment.factory_name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Freight Forwarder</span><span>{shipment.freight_forwarder_name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Mode</span><span>{shipment.mode}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Booking Date</span><span>{shipment.booking_date || '-'}</span></div>
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold mb-3">Dates & Ports</h2>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted text-sm">ETD</span><span>{shipment.etd || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">ETA</span><span>{shipment.eta || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">ATD</span><span>{shipment.atd || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">ATA</span><span>{shipment.ata || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Port of Loading</span><span>{shipment.port_of_loading || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Port of Discharge</span><span>{shipment.port_of_discharge || '-'}</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold mb-3">Container & Vessel</h2>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted text-sm">Container #</span><span className="font-mono">{shipment.container_number || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Seal #</span><span>{shipment.seal_number || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Size</span><span>{shipment.container_size || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Vessel</span><span>{shipment.vessel_name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Voyage</span><span>{shipment.voyage_number || '-'}</span></div>
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold mb-3">Quantity & Weight</h2>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted text-sm">Quantity</span><span>{shipment.quantity}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Weight (kg)</span><span>{shipment.weight_kg ?? '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">CBM</span><span>{shipment.cbm ?? '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Marks</span><span>{shipment.marks || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted text-sm">Remarks</span><span>{shipment.remarks || '-'}</span></div>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-surface rounded-xl border border-border p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Status Timeline</h2>
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < currentIdx ? 'bg-emerald-500 text-white' :
                    i === currentIdx ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' :
                    'bg-surface-alt text-muted'
                  }`}>
                    {i < currentIdx ? '\u2713' : i + 1}
                  </div>
                  <span className={`text-xs mt-1 capitalize whitespace-nowrap ${i === currentIdx ? 'text-heading font-medium' : 'text-faint'}`}>
                    {s.replace(/_/g, ' ')}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`w-10 h-0.5 mx-1 mb-5 ${i < currentIdx ? 'bg-emerald-500' : 'bg-surface-alt'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Documents</h2>
            <button onClick={() => setShowDocModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              + Add Document
            </button>
          </div>
          {(shipment.documents || []).length === 0 ? (
            <p className="text-faint text-sm">No documents uploaded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium">Type</th>
                    <th className="text-left py-2 pr-4 font-medium">Number</th>
                    <th className="text-left py-2 pr-4 font-medium">Date</th>
                    <th className="text-left py-2 pr-4 font-medium">Notes</th>
                    <th className="text-left py-2 pr-4 font-medium">File</th>
                    <th className="text-right py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(shipment.documents as ShippingDocument[]).map((doc) => (
                    <tr key={doc.id} className="border-b border-border">
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${DOC_TYPE_COLORS[doc.document_type] || 'bg-surface-alt/20 text-muted'}`}>
                          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{doc.document_number || '-'}</td>
                      <td className="py-2 pr-4">{doc.document_date || '-'}</td>
                      <td className="py-2 pr-4">{doc.notes || '-'}</td>
                      <td className="py-2 pr-4">
                        {doc.file && (
                          <a href={doc.file} target="_blank" rel="noopener noreferrer" className="text-heading hover:text-emerald-500 text-sm underline">
                            View
                          </a>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => handleDeleteDoc(doc.id)}
                          className="text-red-500 hover:text-red-400 text-sm">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showDocModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add Document</h2>
            <form onSubmit={handleAddDoc} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Document Type *</label>
                <SearchableSelect
                  options={[
                    {value:'bl', label:'Bill of Lading'},
                    {value:'ci', label:'Commercial Invoice'},
                    {value:'pl', label:'Packing List'},
                    {value:'co', label:'Certificate of Origin'},
                    {value:'fumigation', label:'Fumigation Certificate'},
                    {value:'inspection', label:'Inspection Certificate'},
                    {value:'insurance', label:'Insurance Certificate'},
                    {value:'other', label:'Other'},
                  ]}
                  value={docForm.document_type || null}
                  onChange={(v) => setDocForm({ ...docForm, document_type: String(v || '') })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Document #</label>
                  <input value={docForm.document_number} onChange={(e) => setDocForm({ ...docForm, document_number: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Document Date</label>
                  <input type="date" value={docForm.document_date} onChange={(e) => setDocForm({ ...docForm, document_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">File</label>
                <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-body file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-surface-alt file:text-heading hover:file:bg-surface-alt" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Notes</label>
                <textarea value={docForm.notes} onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowDocModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Edit Shipment</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Purchase Order *</label>
                <SearchableSelect options={pos} value={editForm.purchase_order}
                  onChange={(v) => setEditForm({ ...editForm, purchase_order: String(v || '') })}
                  placeholder="Select PO" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Factory</label>
                  <SearchableSelect options={factories} value={editForm.factory}
                    onChange={(v) => setEditForm({ ...editForm, factory: String(v || '') })}
                    placeholder="Select factory" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Freight Forwarder</label>
                  <SearchableSelect options={freightForwarders} value={editForm.freight_forwarder}
                    onChange={(v) => setEditForm({ ...editForm, freight_forwarder: String(v || '') })}
                    placeholder="Select forwarder" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Mode *</label>
                  <SearchableSelect options={MODES} value={editForm.mode}
                    onChange={(v) => setEditForm({ ...editForm, mode: String(v || 'sea') })}
                    placeholder="Select mode" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Quantity *</label>
                  <input required type="number" min="0" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Booking Date</label>
                  <input type="date" value={editForm.booking_date} onChange={(e) => setEditForm({ ...editForm, booking_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">ETD</label>
                  <input type="date" value={editForm.etd} onChange={(e) => setEditForm({ ...editForm, etd: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">ETA</label>
                  <input type="date" value={editForm.eta} onChange={(e) => setEditForm({ ...editForm, eta: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Port of Loading</label>
                  <input value={editForm.port_of_loading} onChange={(e) => setEditForm({ ...editForm, port_of_loading: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Port of Discharge</label>
                  <input value={editForm.port_of_discharge} onChange={(e) => setEditForm({ ...editForm, port_of_discharge: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Vessel</label>
                  <input value={editForm.vessel_name} onChange={(e) => setEditForm({ ...editForm, vessel_name: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Container #</label>
                  <input value={editForm.container_number} onChange={(e) => setEditForm({ ...editForm, container_number: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Seal #</label>
                  <input value={editForm.seal_number} onChange={(e) => setEditForm({ ...editForm, seal_number: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Container Size</label>
                  <input value={editForm.container_size} onChange={(e) => setEditForm({ ...editForm, container_size: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="20GP, 40GP, 40HC" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Weight (kg)</label>
                  <input type="number" step="0.01" min="0" value={editForm.weight_kg} onChange={(e) => setEditForm({ ...editForm, weight_kg: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">CBM</label>
                  <input type="number" step="0.01" min="0" value={editForm.cbm} onChange={(e) => setEditForm({ ...editForm, cbm: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Remarks</label>
                <textarea value={editForm.remarks} onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={editSaving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {editSaving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
