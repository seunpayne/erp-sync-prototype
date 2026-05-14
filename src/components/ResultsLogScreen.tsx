import React from 'react';

interface SyncLogEntry {
  id: string;
  timestamp: number;
  entity: string;
  operation: string;
  status: 'success' | 'failure' | 'conflict' | 'retry';
  duration?: number;
}

interface Props {
  logs: SyncLogEntry[];
}

export const ResultsLogScreen: React.FC<Props> = ({ logs }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'failure': return 'red';
      case 'conflict': return 'orange';
      case 'retry': return 'blue';
      default: return '#666';
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Results Log</h2>

      <div style={styles.logContainer}>
        {logs.length === 0 ? (
          <div style={styles.emptyLog}>No sync events yet</div>
        ) : (
          logs.map(log => (
            <div key={log.id} style={styles.logEntry}>
              <div style={styles.logHeader}>
                <span style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ ...styles.logStatus, color: getStatusColor(log.status) }}>
                  {log.status.toUpperCase()}
                </span>
              </div>
              <div style={styles.logEntity}>{log.entity}</div>
              <div style={styles.logOperation}>{log.operation}</div>
              {log.duration && (
                <div style={styles.logDuration}>Duration: {log.duration}ms</div>
              )}
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
  logContainer: { border: '1px solid #ccc', padding: '10px', maxHeight: '400px', overflowY: 'auto' as const },
  emptyLog: { fontStyle: 'italic', color: '#666' },
  logEntry: { padding: '10px', borderBottom: '1px solid #eee' },
  logHeader: { display: 'flex', justifyContent: 'space-between' },
  logTime: { fontSize: '12px', color: '#999' },
  logStatus: { fontSize: '12px', fontWeight: 'bold' },
  logEntity: { fontSize: '14px', fontWeight: '600', marginTop: '5px' },
  logOperation: { fontSize: '13px', color: '#666' },
  logDuration: { fontSize: '12px', color: '#999', marginTop: '5px' },
};
