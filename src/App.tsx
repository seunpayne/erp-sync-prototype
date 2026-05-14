import React, { useState, useEffect } from 'react';
import { DeviceSetupScreen } from './components/DeviceSetupScreen';
import { DataSeederScreen } from './components/DataSeederScreen';
import { SyncControlScreen } from './components/SyncControlScreen';
import { ConflictSimulatorScreen } from './components/ConflictSimulatorScreen';
import { ResultsLogScreen } from './components/ResultsLogScreen';
import { SyncEngine } from './sync/SyncEngine';
import { db } from './db/schema';

type Screen = 'setup' | 'seeder' | 'sync' | 'conflict' | 'results';

interface SyncLogEntry {
  id: string;
  timestamp: number;
  entity: string;
  operation: string;
  status: 'success' | 'failure' | 'conflict' | 'retry';
  duration?: number;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('setup');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [productCount, setProductCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [queueDepth, setQueueDepth] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [conflictsCount, setConflictsCount] = useState(0);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [syncEngine, setSyncEngine] = useState<SyncEngine | null>(null);

  useEffect(() => {
    // Initialize database
    db.open().catch(err => console.error('Failed to open DB:', err));

    // Check for existing device
    checkExistingDevice();

    // Listen to online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      if (syncEngine) {
        syncEngine.setOnline(true);
        syncEngine.recoverFromOffline(lastSyncTime || 0);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (syncEngine) {
        syncEngine.setOnline(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (syncEngine) {
      updateCounts();
    }
  }, [syncEngine, currentScreen]);

  const checkExistingDevice = async () => {
    const devices = await db.devices.toArray();
    const device = devices[0];
    if (device) {
      setDeviceId(device.device_fingerprint);
      setDeviceName(device.device_name);
      setLastSyncTime(device.last_sync || null);
      const engine = new SyncEngine(
        import.meta.env.VITE_SUPABASE_URL || '',
        import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        device.device_fingerprint
      );
      setSyncEngine(engine);
      setCurrentScreen('seeder');
    }
  };

  const updateCounts = async () => {
    if (!syncEngine) return;
    const [productCount, transactionCount, queueDepth] = await Promise.all([
      syncEngine.getProductCount(),
      syncEngine.getTransactionCount(),
      syncEngine.getQueueDepth(),
    ]);
    setProductCount(productCount);
    setTransactionCount(transactionCount);
    setQueueDepth(queueDepth);
  };

  const handleDeviceRegistered = async (id: string, name: string) => {
    setDeviceId(id);
    setDeviceName(name);
    const engine = new SyncEngine(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      id
    );
    await engine.registerDevice(name);
    setSyncEngine(engine);
    setCurrentScreen('seeder');
  };

  const handleSeedProducts = async (count: number) => {
    if (!syncEngine) return;
    await syncEngine.seedProducts(count);
    await updateCounts();
    addLog('system', 'seed', `Seeded ${count} products`, 'success');
  };

  const handleSeedTransactions = async (count: number) => {
    if (!syncEngine) return;
    await syncEngine.seedTransactions(count);
    await updateCounts();
    addLog('system', 'seed', `Seeded ${count} transactions`, 'success');
  };

  const handleToggleOffline = () => {
    setIsOnline(prev => !prev);
    if (syncEngine) {
      syncEngine.setOnline(!isOnline);
    }
  };

  const handleForceSync = async () => {
    if (!syncEngine) return;
    addLog('system', 'sync_start', 'Manual sync started', 'success');
    const result = await syncEngine.processQueue();
    addLog('system', 'sync_complete', `Synced: ${result.success}, Failed: ${result.failed}`, 'success');
    setLastSyncTime(Date.now());
    await updateCounts();
  };

  const handleClearLocalDB = async () => {
    if (!syncEngine) return;
    await syncEngine.clearLocalDB();
    setProductCount(0);
    setTransactionCount(0);
    setQueueDepth(0);
    setSyncLogs([]);
    setLastSyncTime(null);
    addLog('system', 'clear', 'Local DB cleared', 'success');
  };

  const handleCreateWriteConflict = () => {
    setConflictsCount(prev => prev + 1);
    addLog('product', 'conflict', 'Write conflict simulated', 'conflict');
  };

  const handleCreateInventoryConflict = () => {
    setConflictsCount(prev => prev + 1);
    addLog('inventory', 'conflict', 'Inventory conflict simulated', 'conflict');
  };

  const addLog = (entity: string, operation: string, _description: string, status: 'success' | 'failure' | 'conflict' | 'retry') => {
    setSyncLogs(prev => [{
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      entity,
      operation,
      status,
      duration: Math.floor(Math.random() * 500),
    }, ...prev]);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'setup':
        return (
          <DeviceSetupScreen
            deviceId={deviceId}
            lastSyncTime={lastSyncTime}
            onDeviceRegistered={handleDeviceRegistered}
          />
        );
      case 'seeder':
        return (
          <DataSeederScreen
            productCount={productCount}
            transactionCount={transactionCount}
            onSeedProducts={handleSeedProducts}
            onSeedTransactions={handleSeedTransactions}
          />
        );
      case 'sync':
        return (
          <SyncControlScreen
            isOnline={isOnline}
            queueDepth={queueDepth}
            lastSyncTime={lastSyncTime}
            conflictsCount={conflictsCount}
            onToggleOffline={handleToggleOffline}
            onForceSync={handleForceSync}
            onClearLocalDB={handleClearLocalDB}
          />
        );
      case 'conflict':
        return (
          <ConflictSimulatorScreen
            onCreateWriteConflict={handleCreateWriteConflict}
            onCreateInventoryConflict={handleCreateInventoryConflict}
          />
        );
      case 'results':
        return <ResultsLogScreen logs={syncLogs} />;
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Sync Engine Prototype</h1>
        {deviceName && <div style={styles.deviceName}>{deviceName}</div>}
      </div>

      <div style={styles.content}>
        {renderScreen()}
      </div>

      <nav style={styles.nav}>
        <NavButton
          title="📱 Setup"
          active={currentScreen === 'setup'}
          onClick={() => setCurrentScreen('setup')}
        />
        <NavButton
          title="🌱 Seeder"
          active={currentScreen === 'seeder'}
          onClick={() => setCurrentScreen('seeder')}
        />
        <NavButton
          title="🔄 Sync"
          active={currentScreen === 'sync'}
          onClick={() => setCurrentScreen('sync')}
        />
        <NavButton
          title="⚔️ Conflict"
          active={currentScreen === 'conflict'}
          onClick={() => setCurrentScreen('conflict')}
        />
        <NavButton
          title="📊 Results"
          active={currentScreen === 'results'}
          onClick={() => setCurrentScreen('results')}
        />
      </nav>
    </div>
  );
}

const NavButton = ({ title, active, onClick }: { title: string; active: boolean; onClick: () => void }) => (
  <button
    style={{ ...styles.navButton, ...(active ? styles.navButtonActive : {}) }}
    onClick={onClick}
  >
    {title}
  </button>
);

const styles: { [key: string]: React.CSSProperties } = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f5f5f5' },
  header: { padding: '20px', backgroundColor: '#fff', borderBottom: '1px solid #eee' },
  headerTitle: { fontSize: '20px', fontWeight: 'bold', margin: 0 },
  deviceName: { fontSize: '14px', color: '#666', marginTop: '5px' },
  content: { flex: 1, overflow: 'auto' },
  nav: { display: 'flex', backgroundColor: '#fff', borderTop: '1px solid #eee' },
  navButton: { flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '12px' },
  navButtonActive: { backgroundColor: '#e3f2fd', fontWeight: 'bold' as const, color: '#1976d2' },
};
