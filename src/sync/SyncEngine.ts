import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db, SyncQueueItem, SyncEvent, Product, Transaction, Device } from '../db/schema';

export interface ConflictResolution {
  resolved: boolean;
  requiresManualReview: boolean;
  mergedData?: any;
  reason: string;
}

export class SyncEngine {
  private supabase: SupabaseClient;
  private deviceId: string;

  constructor(supabaseUrl: string, supabaseKey: string, deviceId: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.deviceId = deviceId;
  }

  setOnline(online: boolean) {
    // Online status is managed by browser Network API
    console.log('[SyncEngine] Set online:', online);
  }

  // FUNCTION 1: Process sync queue
  async processQueue(): Promise<{ success: number; failed: number }> {
    console.log('[SyncEngine] Processing sync queue...');
    
    const pendingItems = await db.sync_queue.where('status').equals('PENDING').toArray();
    let success = 0;
    let failed = 0;

    // Sort: CREATE first, then UPDATE, then DELETE
    const sorted = pendingItems.sort((a, b) => {
      const order = { CREATE: 0, UPDATE: 1, DELETE: 2 };
      return order[a.operation] - order[b.operation];
    });

    for (const item of sorted) {
      try {
        await this.syncToSupabase(item);
        await db.sync_queue.update(item.id, { status: 'COMPLETED' });
        await this.logSyncEvent({
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          operation: item.operation,
          payload: item.payload,
          device_id: this.deviceId,
          client_timestamp: Date.now(),
          synced: true,
          conflict_resolved: true,
          created_at: Date.now(),
        });
        success++;
      } catch (error) {
        console.error('[SyncEngine] Sync failed:', error);
        
        const newRetryCount = item.retry_count + 1;
        if (newRetryCount >= 3) {
          await db.sync_queue.update(item.id, { status: 'FAILED' });
          failed++;
        } else {
          await db.sync_queue.update(item.id, {
            retry_count: newRetryCount,
            last_attempt: Date.now(),
            status: 'PENDING',
          });
        }
      }
    }

    console.log(`[SyncEngine] Queue processed: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  // FUNCTION 2: Fetch server changes
  async fetchServerChanges(lastSyncTimestamp: number): Promise<SyncEvent[]> {
    console.log(`[SyncEngine] Fetching server changes since ${lastSyncTimestamp}...`);

    const { data, error } = await this.supabase
      .from('sync_events')
      .select('*')
      .gt('client_timestamp', lastSyncTimestamp)
      .order('client_timestamp', { ascending: true });

    if (error) {
      console.error('[SyncEngine] Error fetching server changes:', error);
      return [];
    }

    return data || [];
  }

  // FUNCTION 3: Resolve conflicts
  resolveConflict(localRecord: any, serverRecord: any, entityType: string): ConflictResolution {
    // Step 1: Destructive conflict check
    if (localRecord._deleted && !serverRecord._deleted) {
      return {
        resolved: true,
        requiresManualReview: false,
        reason: 'Server wins: local deleted, server updated',
      };
    }
    if (serverRecord._deleted && !localRecord._deleted) {
      return {
        resolved: true,
        requiresManualReview: false,
        reason: 'Local wins: server deleted, local updated',
      };
    }

    // Step 2: Inventory/financial semantic merge
    if (entityType === 'products' || entityType === 'transactions') {
      const localChanges = localRecord.quantity - (localRecord.baseline_stock || 0);
      
      if (localChanges !== 0) {
        // Additive change (IN/OUT events)
        const merged = serverRecord.quantity + localChanges;
        return {
          resolved: true,
          requiresManualReview: false,
          mergedData: { ...serverRecord, quantity: merged },
          reason: 'Semantic merge: additive inventory change',
        };
      }

      // ADJUSTMENT - flag for manual review
      return {
        resolved: false,
        requiresManualReview: true,
        reason: 'ADJUSTMENT conflict: requires manual review',
      };
    }

    // Step 3: Non-critical fields - last-write-wins
    const localTime = localRecord.updated_at || localRecord.client_timestamp;
    const serverTime = serverRecord.updated_at || serverRecord.server_timestamp;
    
    if (localTime > serverTime) {
      return {
        resolved: true,
        requiresManualReview: false,
        mergedData: localRecord,
        reason: 'Last-write-wins: local is newer',
      };
    } else {
      return {
        resolved: true,
        requiresManualReview: false,
        mergedData: serverRecord,
        reason: 'Last-write-wins: server is newer',
      };
    }
  }

  // FUNCTION 4: Recover from offline
  async recoverFromOffline(lastSyncTimestamp: number): Promise<void> {
    console.log('[SyncEngine] Recovering from offline state...');

    // 1. Fetch server changes
    const serverChanges = await this.fetchServerChanges(lastSyncTimestamp);
    
    // 2. Get local pending changes
    const localPending = await db.sync_queue.where('status').equals('PENDING').toArray();

    // 3. Sort by entity and timestamp
    const allChanges = [...serverChanges, ...localPending].sort(
      (a, b) => {
        const timeA = 'client_timestamp' in a ? a.client_timestamp : a.created_at;
        const timeB = 'client_timestamp' in b ? b.client_timestamp : b.created_at;
        return timeA - timeB;
      }
    );

    // 4. Process each entity's changes in order
    const entities = new Map<string, any[]>();
    allChanges.forEach(change => {
      const key = `${change.entity_type}:${change.entity_id}`;
      if (!entities.has(key)) {
        entities.set(key, []);
      }
      entities.get(key)!.push(change);
    });

    // 5. Resolve conflicts where found
    for (const [key, changes] of entities.entries()) {
      if (changes.length > 1) {
        console.log(`[SyncEngine] Conflict detected for ${key}`);
        // Apply conflict resolution logic
      }
    }

    // 6. Update last_sync
    await this.updateDeviceLastSync(Date.now());

    console.log('[SyncEngine] Recovery complete');
  }

  // Private helpers
  private async syncToSupabase(item: SyncQueueItem): Promise<void> {
    const payload = JSON.parse(item.payload);
    
    switch (item.entity_type) {
      case 'products':
        await this.supabase.from('products').upsert(payload);
        break;
      case 'transactions':
        await this.supabase.from('transactions').upsert(payload);
        break;
    }
  }

  private async logSyncEvent(event: Omit<SyncEvent, 'id'>): Promise<void> {
    await db.sync_events.add(event);
    
    // Also log to Supabase
    await this.supabase.from('sync_events').insert({
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      operation: event.operation,
      payload: event.payload,
      device_id: event.device_id,
      client_timestamp: event.client_timestamp,
      synced: event.synced,
      conflict_resolved: event.conflict_resolved,
      created_at: new Date(event.created_at).toISOString(),
    });
  }

  private async updateDeviceLastSync(timestamp: number): Promise<void> {
    await this.supabase
      .from('registered_devices')
      .upsert({
        id: this.deviceId,
        last_sync: new Date(timestamp).toISOString(),
      });
  }

  // Helper methods for UI
  async getQueueDepth(): Promise<number> {
    return await db.sync_queue.where('status').equals('PENDING').count();
  }

  async getProductCount(): Promise<number> {
    return await db.products.count();
  }

  async getTransactionCount(): Promise<number> {
    return await db.transactions.count();
  }

  async getDevice(): Promise<Device | undefined> {
    const devices = await db.devices.toArray();
    return devices[0];
  }

  async registerDevice(deviceName: string): Promise<Device> {
    const device: Device = {
      device_name: deviceName,
      device_fingerprint: `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      last_sync: 0,
      created_at: Date.now(),
    };
    await db.devices.add(device);
    return device;
  }

  async seedProducts(count: number): Promise<void> {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      products.push({
        id: `prod_${Date.now()}_${i}`,
        name: `Product ${i + 1}`,
        sku: `SKU-${i + 1}`,
        quantity: Math.floor(Math.random() * 100),
        unit_price: Math.floor(Math.random() * 1000) + 100,
        updated_at: Date.now(),
      });
    }
    await db.products.bulkAdd(products);
  }

  async seedTransactions(count: number): Promise<void> {
    const products = await db.products.toArray();
    if (products.length === 0) return;

    const transactions: Transaction[] = [];
    for (let i = 0; i < count; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      transactions.push({
        id: `txn_${Date.now()}_${i}`,
        product_id: product.id,
        type: Math.random() > 0.5 ? 'IN' : 'OUT',
        quantity: Math.floor(Math.random() * 10) + 1,
        amount: Math.floor(Math.random() * 5000) + 500,
        reason: Math.random() > 0.5 ? 'Sale' : 'Restock',
        baseline_stock: product.quantity,
        device_id: this.deviceId,
        created_at: Date.now(),
      });
    }
    await db.transactions.bulkAdd(transactions);

    // Also queue for sync
    const queueItems: SyncQueueItem[] = transactions.map(txn => ({
      id: `queue_${txn.id}`,
      entity_type: 'transactions',
      entity_id: txn.id,
      operation: 'CREATE',
      payload: JSON.stringify(txn),
      baseline_version: '0',
      retry_count: 0,
      last_attempt: 0,
      created_at: Date.now(),
      status: 'PENDING',
    }));
    await db.sync_queue.bulkAdd(queueItems);
  }

  async clearLocalDB(): Promise<void> {
    await db.products.clear();
    await db.transactions.clear();
    await db.sync_queue.clear();
    await db.sync_events.clear();
    await db.devices.clear();
  }

  async getSyncLogs(): Promise<SyncEvent[]> {
    return await db.sync_events.orderBy('created_at').reverse().limit(100).toArray();
  }
}
