import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/lib/api';
import { setActiveClient, getActiveClientId, clearActiveClient } from '@/lib/activeClient';
import AddClientModal from './AddClientModal';
import ClientLumaChat from './ClientGeniChat';

interface Client {
  _id: string;
  businessName: string;
  industry: string;
  websiteUrl?: string;
  brandVoice?: string;
  targetAudience?: string;
  notes?: string;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => getActiveClientId());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextExpanded, setContextExpanded] = useState(true);
  // Set by apiFetch's self-heal when the previously active client no longer
  // exists (e.g. it was deleted). Tells the user why they landed back here.
  const [staleClientNotice, setStaleClientNotice] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('clientNotFoundNotice')) {
      sessionStorage.removeItem('clientNotFoundNotice');
      setStaleClientNotice(true);
    }
  }, []);

  const token = localStorage.getItem('token');
  const orgId = localStorage.getItem('orgId');
  const selectedClient = clients.find(c => c._id === selectedClientId) || null;

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orgs/${orgId}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setClients(Array.isArray(data) ? data : data.clients || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [orgId, token]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleAddClient = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  const handleEditClient = () => {
    if (selectedClient) {
      setEditingClient(selectedClient);
      setModalOpen(true);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    if (!window.confirm(`Delete "${selectedClient.businessName}"? This cannot be undone.`)) return;
    try {
      await fetch(`${API_BASE}/api/orgs/${orgId}/clients/${selectedClient._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedClientId(null);
      clearActiveClient();
      fetchClients();
    } catch { /* silent */ }
  };

  const handleModalSave = () => {
    fetchClients();
  };

  const industryColor = (industry: string) => {
    const map: Record<string, string> = {
      Restaurant: '#f59e0b', 'Law Firm': '#8b5cf6', Gym: '#ef4444', 'Real Estate': '#10b981',
      'E-commerce': '#f472b6', Tech: '#4a7c2f', Healthcare: '#34d399', Landscaping: '#84cc16',
      Cleaning: '#38bdf8', HVAC: '#fb923c', Plumbing: '#60a5fa', Roofing: '#a78bfa', Other: '#94a3b8',
    };
    return map[industry] || '#94a3b8';
  };

  return (
    <>
      <style>{`
        @keyframes cd-grid-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(40px); }
        }
        @keyframes cd-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cd-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .cd-sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .cd-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .cd-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(74,124,47,0.15); border-radius: 3px; }
        .cd-client-card {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .cd-client-card:hover {
          transform: translateY(-1px);
          background: rgba(74,124,47,0.06) !important;
          border-color: rgba(74,124,47,0.2) !important;
        }
        .cd-context-section {
          animation: cd-fade-in 0.3s ease-out;
        }
        @media (max-width: 768px) {
          .cd-sidebar-wrap { width: 100% !important; height: auto !important; max-height: 35vh !important; border-right: none !important; border-bottom: 1px solid rgba(74,124,47,0.08) !important; }
          .cd-main-wrap { flex-direction: column !important; }
          .cd-workspace { min-height: 60vh !important; }
        }
      `}</style>

      <div className="cd-main-wrap" style={{
        position: 'fixed',
        inset: 0,
        background: '#0d1a0d',
        display: 'flex',
        fontFamily: "'Inter', sans-serif",
        color: '#f0f4ee',
      }}>
        {/* Animated grid background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.025,
          backgroundImage: 'linear-gradient(rgba(74,124,47,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(74,124,47,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          animation: 'cd-grid-scroll 4s linear infinite',
          pointerEvents: 'none',
        }} />

        {/* ========== LEFT SIDEBAR ========== */}
        <div className="cd-sidebar-wrap" style={{
          width: '300px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(17,31,17,0.8)',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(74,124,47,0.08)',
          position: 'relative',
          zIndex: 10,
        }}>
          {/* Logo */}
          <div style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid rgba(74,124,47,0.08)',
          }}>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
              color: '#4a7c2f',
              margin: 0,
              textShadow: '0 0 20px rgba(74,124,47,0.4)',
              letterSpacing: '-0.02em',
            }}>
              LANDSCAPIO
            </h1>
            <p style={{ fontSize: '11px', color: 'rgba(154,184,151,0.5)', margin: '4px 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
              Client Management
            </p>

            {/* Go to AI tools dashboard */}
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                marginTop: '14px',
                width: '100%',
                padding: '9px 14px',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                color: 'rgba(240,244,238,0.85)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(74,124,47,0.1)';
                e.currentTarget.style.borderColor = 'rgba(74,124,47,0.4)';
                e.currentTarget.style.color = '#f0f4ee';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = 'rgba(240,244,238,0.85)';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Go to Dashboard
            </button>
          </div>

          {/* Client list */}
          <div className="cd-sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {staleClientNotice && (
              <div style={{
                margin: '0 0 12px',
                padding: '10px 12px',
                fontSize: '11px',
                lineHeight: 1.5,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#e6b800',
                background: 'rgba(230,184,0,0.08)',
                border: '1px solid rgba(230,184,0,0.25)',
                borderRadius: '8px',
              }}>
                The previously selected client is no longer available. Please pick a client to continue.
              </div>
            )}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                  {[0, 150, 300].map(d => (
                    <div key={d} style={{
                      width: '5px', height: '5px', borderRadius: '50%', background: '#4a7c2f',
                      animation: `cd-pulse 1s ease-in-out infinite`, animationDelay: `${d}ms`,
                    }} />
                  ))}
                </div>
              </div>
            ) : clients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 12px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(154,184,151,0.5)', lineHeight: 1.5 }}>
                  No clients yet.<br />Add your first client to get started.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {clients.map(client => {
                  const isActive = client._id === selectedClientId;
                  const tagColor = industryColor(client.industry);
                  return (
                    <div
                      key={client._id}
                      className="cd-client-card"
                      onClick={() => {
                        setSelectedClientId(client._id);
                        setActiveClient(client._id, client.businessName);
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: isActive ? 'rgba(74,124,47,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isActive ? 'rgba(74,124,47,0.2)' : 'rgba(255,255,255,0.04)'}`,
                        boxShadow: isActive
                          ? 'inset 3px 0 0 #4a7c2f, 0 0 15px rgba(74,124,47,0.1)'
                          : 'none',
                      }}
                    >
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isActive ? '#f0f4ee' : 'rgba(240,244,238,0.75)',
                        marginBottom: '6px',
                      }}>
                        {client.businessName}
                      </div>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        padding: '2px 8px',
                        borderRadius: '20px',
                        color: tagColor,
                        background: `${tagColor}15`,
                        border: `1px solid ${tagColor}30`,
                      }}>
                        {client.industry}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid rgba(74,124,47,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {/* Add Client button */}
            <button
              onClick={handleAddClient}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                color: '#6b8f3e',
                background: 'rgba(74,124,47,0.06)',
                border: '1px solid rgba(74,124,47,0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transform: 'skewX(-2deg)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(74,124,47,0.12)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(74,124,47,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(74,124,47,0.06)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              + Add Client
            </button>

          </div>
        </div>

        {/* ========== MAIN WORKSPACE ========== */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 5,
          minWidth: 0,
        }}>
          {!selectedClient ? (
            /* Empty state */
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div className="cd-context-section" style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'rgba(74,124,47,0.05)', border: '1px solid rgba(74,124,47,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(74,124,47,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                  color: 'rgba(240,244,238,0.7)',
                  marginBottom: '8px',
                }}>
                  Select a client
                </h2>
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(154,184,151,0.5)',
                  lineHeight: 1.6,
                }}>
                  Select a client from the sidebar or add a new one to start generating content with Luma.
                </p>
              </div>
            </div>
          ) : (
            /* Client selected */
            <>
              {/* Client header */}
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(74,124,47,0.08)',
                background: 'rgba(17,31,17,0.5)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                    color: '#f0f4ee',
                    margin: 0,
                  }}>
                    {selectedClient.businessName}
                  </h2>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '3px 10px',
                    borderRadius: '20px',
                    color: industryColor(selectedClient.industry),
                    background: `${industryColor(selectedClient.industry)}15`,
                    border: `1px solid ${industryColor(selectedClient.industry)}30`,
                  }}>
                    {selectedClient.industry}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* AI Tool launchers */}
                  {[
                    { label: 'Magic Blog', route: '/desktop/magic-blog' },
                    { label: 'Magic Pages', route: '/desktop/magic-pages' },
                    { label: 'Magic Copyrighter', route: '/desktop/copyright-social' },
                  ].map(tool => (
                    <button
                      key={tool.route}
                      onClick={() => {
                        localStorage.setItem('activeClientId', selectedClient._id);
                        localStorage.setItem('activeClient', JSON.stringify(selectedClient));
                        navigate(tool.route);
                      }}
                      style={{
                        padding: '6px 14px',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                        color: '#9ab897',
                        background: 'rgba(154,184,151,0.06)',
                        border: '1px solid rgba(154,184,151,0.25)',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        transform: 'skewX(-2deg)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(107,143,62,0.18)'; e.currentTarget.style.color = '#6b8f3e'; e.currentTarget.style.boxShadow = '0 0 14px rgba(74,124,47,0.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(154,184,151,0.06)'; e.currentTarget.style.color = '#9ab897'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {tool.label}
                    </button>
                  ))}

                  {/* Divider */}
                  <div style={{ width: 1, height: 20, background: 'rgba(74,124,47,0.15)', margin: '0 4px' }} />

                  <button
                    onClick={handleEditClient}
                    style={{
                      padding: '6px 14px',
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#6b8f3e',
                      background: 'rgba(74,124,47,0.06)',
                      border: '1px solid rgba(74,124,47,0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,124,47,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,124,47,0.06)'; }}
                  >
                    EDIT
                  </button>
                  <button
                    onClick={handleDeleteClient}
                    style={{
                      padding: '6px 14px',
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#f87171',
                      background: 'rgba(248,113,113,0.06)',
                      border: '1px solid rgba(248,113,113,0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.06)'; }}
                  >
                    DELETE
                  </button>
                </div>
              </div>

              {/* Collapsible context panel */}
              <div style={{
                borderBottom: '1px solid rgba(74,124,47,0.08)',
                flexShrink: 0,
              }}>
                <button
                  onClick={() => setContextExpanded(v => !v)}
                  style={{
                    width: '100%',
                    padding: '10px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(74,124,47,0.02)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(107,143,62,0.6)',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <span>Client Context</span>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: contextExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {contextExpanded && (
                  <div className="cd-context-section" style={{ padding: '0 24px 14px' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                    }}>
                      {[
                        { label: 'Brand Voice', value: selectedClient.brandVoice },
                        { label: 'Target Audience', value: selectedClient.targetAudience },
                        { label: 'Website', value: selectedClient.websiteUrl },
                        { label: 'Notes', value: selectedClient.notes },
                      ].map(item => (
                        <div key={item.label} style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <div style={{
                            fontSize: '9px',
                            fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: 'rgba(107,143,62,0.5)',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                            letterSpacing: '0.05em',
                          }}>
                            {item.label}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: item.value ? 'rgba(240,244,238,0.6)' : 'rgba(240,244,238,0.2)',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                          }}>
                            {item.value || 'Not set'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat area */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <ClientLumaChat client={selectedClient} />
              </div>
            </>
          )}
        </div>

        {/* Modal */}
        <AddClientModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setEditingClient(null); }}
          onSave={handleModalSave}
          editingClient={editingClient}
        />
      </div>
    </>
  );
};

export default ClientDashboard;
