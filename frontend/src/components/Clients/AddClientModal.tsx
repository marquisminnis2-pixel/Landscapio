import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api';

interface Client {
  _id: string;
  businessName: string;
  industry: string;
  websiteUrl?: string;
  brandVoice?: string;
  targetAudience?: string;
  notes?: string;
  airtableBaseId?: string;
  airtableBlogTrackerTable?: string;
}

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingClient?: Client | null;
}

const INDUSTRIES = [
  'Restaurant', 'Law Firm', 'Gym', 'Real Estate', 'E-commerce',
  'Tech', 'Healthcare', 'Landscaping', 'Cleaning', 'HVAC',
  'Plumbing', 'Roofing', 'Other',
];

const AddClientModal = ({ isOpen, onClose, onSave, editingClient }: AddClientModalProps) => {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('Other');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [notes, setNotes] = useState('');
  const [airtableBaseId, setAirtableBaseId] = useState('');
  const [airtableBlogTrackerTable, setAirtableBlogTrackerTable] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingClient) {
      setBusinessName(editingClient.businessName || '');
      setIndustry(editingClient.industry || 'Other');
      setWebsiteUrl(editingClient.websiteUrl || '');
      setBrandVoice(editingClient.brandVoice || '');
      setTargetAudience(editingClient.targetAudience || '');
      setNotes(editingClient.notes || '');
      setAirtableBaseId(editingClient.airtableBaseId || '');
      setAirtableBlogTrackerTable(editingClient.airtableBlogTrackerTable || '');
    } else {
      setBusinessName('');
      setIndustry('Other');
      setWebsiteUrl('');
      setBrandVoice('');
      setTargetAudience('');
      setNotes('');
      setAirtableBaseId('');
      setAirtableBlogTrackerTable('');
    }
    setError('');
  }, [editingClient, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Business name is required');
      return;
    }
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    const orgId = localStorage.getItem('orgId');
    const body = {
      businessName: businessName.trim(),
      industry,
      websiteUrl,
      brandVoice,
      targetAudience,
      notes,
      airtableBaseId: airtableBaseId.trim(),
      airtableBlogTrackerTable: airtableBlogTrackerTable.trim(),
    };

    try {
      const url = editingClient
        ? `${API_BASE}/api/orgs/${orgId}/clients/${editingClient._id}`
        : `${API_BASE}/api/orgs/${orgId}/clients`;
      const method = editingClient ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save client');
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: '#f0f4ee',
    background: 'rgba(74,124,47,0.04)',
    border: '1px solid rgba(74,124,47,0.15)',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
    color: 'rgba(107,143,62,0.7)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <>
      <style>{`
        @keyframes acm-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes acm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .acm-input:focus {
          border-color: rgba(74,124,47,0.5) !important;
          box-shadow: 0 0 12px rgba(74,124,47,0.1);
        }
        .acm-scrollbar::-webkit-scrollbar { width: 4px; }
        .acm-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .acm-scrollbar::-webkit-scrollbar-thumb { background: rgba(74,124,47,0.2); border-radius: 4px; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          animation: 'acm-fade-in 0.2s ease-out',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 1001,
        width: '440px',
        maxWidth: '95vw',
        background: 'rgba(13,26,13,0.95)',
        backdropFilter: 'blur(16px)',
        borderLeft: '1px solid rgba(74,124,47,0.12)',
        animation: 'acm-slide-in 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(74,124,47,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
            color: '#4a7c2f',
            margin: 0,
            textShadow: '0 0 10px rgba(74,124,47,0.3)',
          }}>
            {editingClient ? 'EDIT CLIENT' : 'ADD CLIENT'}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,124,47,0.3)'; e.currentTarget.style.color = '#4a7c2f'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="acm-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Business Name */}
            <div>
              <label style={labelStyle}>Business Name *</label>
              <input
                className="acm-input"
                style={inputStyle}
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="e.g. Joe's Plumbing"
                required
              />
            </div>

            {/* Industry */}
            <div>
              <label style={labelStyle}>Industry</label>
              <select
                className="acm-input"
                style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a7c2f' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              >
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind} style={{ background: '#0d1a0d', color: '#f0f4ee' }}>{ind}</option>
                ))}
              </select>
            </div>

            {/* Website URL */}
            <div>
              <label style={labelStyle}>Website URL</label>
              <input
                className="acm-input"
                style={inputStyle}
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            {/* Brand Voice */}
            <div>
              <label style={labelStyle}>Brand Voice</label>
              <textarea
                className="acm-input"
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                value={brandVoice}
                onChange={e => setBrandVoice(e.target.value)}
                placeholder="Describe the client's brand voice... (e.g. Professional yet friendly, authoritative, casual)"
              />
            </div>

            {/* Target Audience */}
            <div>
              <label style={labelStyle}>Target Audience</label>
              <textarea
                className="acm-input"
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="Who is the ideal customer? (e.g. Homeowners aged 30-55 in metro areas)"
              />
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                className="acm-input"
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional info about this client..."
              />
            </div>

            {/* Airtable section divider */}
            <div style={{
              marginTop: '8px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(74,124,47,0.12)',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
              color: 'rgba(107,143,62,0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Airtable
            </div>

            {/* Airtable Base ID */}
            <div>
              <label style={labelStyle}>Airtable Base ID</label>
              <input
                className="acm-input"
                style={inputStyle}
                value={airtableBaseId}
                onChange={e => setAirtableBaseId(e.target.value)}
                placeholder="appXXXXXXXXXXXXXX"
              />
            </div>

            {/* Airtable Blog Tracker Table */}
            <div>
              <label style={labelStyle}>Blog Tracker Table</label>
              <input
                className="acm-input"
                style={inputStyle}
                value={airtableBlogTrackerTable}
                onChange={e => setAirtableBlogTrackerTable(e.target.value)}
                placeholder="Blog Tracker (table name or tblXXXXXXXX id)"
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                fontSize: '12px',
                color: '#f87171',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '8px',
              }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop: '28px', display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                color: '#f0f4ee',
                background: saving ? 'rgba(74,124,47,0.4)' : 'linear-gradient(135deg, #6b8f3e, #2d5016)',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 20px rgba(74,124,47,0.2)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 0 30px rgba(74,124,47,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(74,124,47,0.2)'; }}
            >
              {saving ? 'Saving...' : editingClient ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddClientModal;
