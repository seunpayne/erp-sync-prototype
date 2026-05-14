import Dexie, { Table } from 'dexie';

export interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  updated_at: number;
  _status?: string;
  _changed?: boolean;
}

export interface Transaction {
  id: string;
  product_id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  amount: number;
  reason: string;
  baseline_stock: number;
  device_id: string;
  created_at: number;
  _status?: string;
  _changed?: boolean;
}

export interface SyncQueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string;
  baseline_version: string;
  retry_count: number;
  last_attempt: number;
  created_at: number;
  status: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED';
}

export interface SyncEvent {
  id?: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string;
  device_id: string;
  client_timestamp: number;
  synced: boolean;
  conflict_resolved: boolean;
  created_at: number;
}

export interface Device {
  id?: string;
  device_name: string;
  device_fingerprint: string;
  last_sync: number;
  created_at: number;
}

class SyncDatabase extends Dexie {
  products!: Table<Product, string>;
  transactions!: Table<Transaction, string>;
  sync_queue!: Table<SyncQueueItem, string>;
  sync_events!: Table<SyncEvent, string>;
  devices!: Table<Device, string>;

  constructor() {
    super('SyncPrototypeDB');
    
    this.version(1).stores({
      products: 'id, name, sku, updated_at',
      transactions: 'id, product_id, type, created_at',
      sync_queue: 'id, entity_type, entity_id, status, created_at',
      sync_events: 'id, entity_type, entity_id, device_id, client_timestamp, synced',
      devices: 'id, device_fingerprint, last_sync',
    });
  }
}

export const db = new SyncDatabase();
