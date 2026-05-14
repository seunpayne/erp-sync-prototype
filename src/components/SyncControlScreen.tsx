import React from 'react';

interface Props {
  isOnline: boolean;
  queueDepth: number;
  lastSyncTime: number | null;
  conflictsCount: number;
  onToggleOffline: () => void;
  onForceSync: () => void;
  onClearLocalDB: () => void;
}

export const SyncControlScreen: React.FC<Props> = ({
  isOnline,
  queueDepth,
  lastSyncTime,
  conflictsCount,
  onToggleOffline,
  onForceSync,
  onClearLocalDB,
}) => {
  const formatSyncTime = (timestamp: number | null) => {
    if (!timestamp || timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sync Control Panel</h2>

      <div style={styles.status}>
        <span style={styles.statusLabel}>Status:</span>
        <span style={{ ...styles.statusText, color: isOnline ? 'green' : 'red' }}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <div style={styles.stats}>
        <div>Queue Depth: <strong>{queueDepth}</strong></div>
        <div>Last Sync: <strong>{formatSyncTime(lastSyncTime)}</strong></div>
        <div>Conflicts: <strong>{conflictsCount}</strong></div>
      </div>

      <div style={styles.buttons}>
        <button
          style={styles.button}
          onClick={onToggleOffline}
        >
          {isOnline ? 'Simulate Offline' : 'Go Online'}
        </button>
        <button
          style={styles.button}
          onClick={onForceSync}
          disabled={!isOnline}
        >
          Force Sync Now
        </button>
        <button
          style={{ ...styles.button, backgroundColor: '#ff4444' }}
          onClick={onClearLocalDB}
        >
          Clear Local DB
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px' },
  title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', marginTop: 0 },
  status: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', fontSize: '16px' },
  statusLabel: { fontWeight: '600' },
  statusText: { fontWeight: 'bold' },
  stats: { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '16px' },
  buttons: { display: 'flex', flexDirection: 'column', gap: '15px' },
  button: { padding: '10px 20px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' },
};
