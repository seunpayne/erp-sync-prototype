import React, { useState } from 'react';

interface ConflictLog {
  id: string;
  timestamp: number;
  entityType: string;
  description: string;
  resolution: string;
}

interface Props {
  onCreateWriteConflict: () => void;
  onCreateInventoryConflict: () => void;
}

export const ConflictSimulatorScreen: React.FC<Props> = ({
  onCreateWriteConflict,
  onCreateInventoryConflict,
}) => {
  const [conflictLog, setConflictLog] = useState<ConflictLog[]>([]);

  const handleWriteConflict = () => {
    onCreateWriteConflict();
    const newLog: ConflictLog = {
      id: `conflict_${Date.now()}`,
      timestamp: Date.now(),
      entityType: 'product',
      description: 'Write conflict: Two devices updated same record',
      resolution: 'Last-write-wins applied',
    };
    setConflictLog(prev => [newLog, ...prev]);
  };

  const handleInventoryConflict = () => {
    onCreateInventoryConflict();
    const newLog: ConflictLog = {
      id: `conflict_${Date.now()}`,
      timestamp: Date.now(),
      entityType: 'inventory',
      description: 'Inventory conflict: Two devices recorded stock-out',
      resolution: 'Semantic merge applied',
    };
    setConflictLog(prev => [newLog, ...prev]);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Conflict Simulator</h2>

      <div style={styles.buttons}>
        <button style={styles.button} onClick={handleWriteConflict}>
          Create Write Conflict
        </button>
        <button style={styles.button} onClick={handleInventoryConflict}>
          Create Inventory Conflict
        </button>
      </div>

      <h3 style={styles.logTitle}>Conflict Log:</h3>
      <div style={styles.logContainer}>
        {conflictLog.length === 0 ? (
          <div style={styles.emptyLog}>No conflicts yet</div>
        ) : (
          conflictLog.map(log => (
            <div key={log.id} style={styles.logEntry}>
              <div style={styles.logTime}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
              <div style={styles.logEntity}>{log.entityType}</div>
              <div style={styles.logDesc}>{log.description}</div>
              <div style={styles.logResolution}>{log.resolution}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px' },
  title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', marginTop: 0 },
  buttons: { display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' },
  button: { padding: '10px 20px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' },
  logTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '10px', marginTop: 0 },
  logContainer: { border: '1px solid #ccc', padding: '10px', maxHeight: '300px', overflowY: 'auto' as const },
  emptyLog: { fontStyle: 'italic', color: '#666' },
  logEntry: { padding: '10px', borderBottom: '1px solid #eee' },
  logTime: { fontSize: '12px', color: '#999' },
  logEntity: { fontSize: '14px', fontWeight: '600' },
  logDesc: { fontSize: '13px', margin: '5px 0' },
  logResolution: { fontSize: '12px', color: 'green' },
};
