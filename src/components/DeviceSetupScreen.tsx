import React, { useState } from 'react';

interface Props {
  deviceId: string | null;
  lastSyncTime: number | null;
  onDeviceRegistered: (deviceId: string, deviceName: string) => void;
}

export const DeviceSetupScreen: React.FC<Props> = ({ deviceId, lastSyncTime, onDeviceRegistered }) => {
  const [deviceName, setDeviceName] = useState('');

  const handleRegister = () => {
    if (!deviceName.trim()) return;
    const newDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    onDeviceRegistered(newDeviceId, deviceName);
  };

  const formatSyncTime = (timestamp: number | null) => {
    if (!timestamp || timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Device Setup</h2>
      
      {deviceId ? (
        <div style={styles.info}>
          <div style={styles.infoRow}>
            <strong>Device ID:</strong>
            <span>{deviceId}</span>
          </div>
          <div style={styles.infoRow}>
            <strong>Last Sync:</strong>
            <span>{formatSyncTime(lastSyncTime)}</span>
          </div>
        </div>
      ) : (
        <div style={styles.form}>
          <input
            type="text"
            style={styles.input}
            placeholder="Enter device name"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
          />
          <button style={styles.button} onClick={handleRegister}>
            Register Device
          </button>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px' },
  title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', marginTop: 0 },
  info: { display: 'flex', flexDirection: 'column', gap: '10px' },
  infoRow: { display: 'flex', gap: '10px', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '10px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '14px' },
  button: { padding: '10px 20px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' },
};
