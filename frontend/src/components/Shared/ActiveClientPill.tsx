import { useNavigate } from 'react-router-dom';
import { getActiveClientId, getActiveClientName } from '@/lib/activeClient';

interface ActiveClientPillProps {
  variant?: 'dark' | 'light';
}

const ActiveClientPill = ({ variant = 'dark' }: ActiveClientPillProps) => {
  const navigate = useNavigate();
  const id = getActiveClientId();
  const name = getActiveClientName();

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
    fontWeight: 600,
    borderRadius: 999,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid',
  };

  const colors = variant === 'light'
    ? {
        background: id ? 'rgba(74,124,47,0.08)' : 'rgba(248,113,113,0.08)',
        borderColor: id ? 'rgba(74,124,47,0.3)' : 'rgba(248,113,113,0.3)',
        color: id ? '#4a7c2f' : '#dc2626',
      }
    : {
        background: id ? 'rgba(107,143,62,0.12)' : 'rgba(248,113,113,0.1)',
        borderColor: id ? 'rgba(107,143,62,0.35)' : 'rgba(248,113,113,0.3)',
        color: id ? '#a8d175' : '#f87171',
      };

  return (
    <button
      onClick={() => navigate('/clients')}
      title={id ? 'Switch active client' : 'Pick an active client'}
      style={{ ...baseStyle, ...colors }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: id ? '#6b8f3e' : '#f87171',
          boxShadow: id ? '0 0 8px rgba(107,143,62,0.6)' : '0 0 8px rgba(248,113,113,0.5)',
        }}
      />
      {id && name ? (
        <>
          <span style={{ opacity: 0.6, fontWeight: 500 }}>Client:</span>
          <span>{name}</span>
        </>
      ) : (
        <span>No client selected</span>
      )}
    </button>
  );
};

export default ActiveClientPill;
