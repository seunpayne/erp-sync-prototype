# SYNC ENGINE PROTOTYPE
# Owner: Clemenza
# Type: Standalone technical prototype
# Purpose: Prove the offline-first sync engine before
# wiring it into the full ERP build pipeline
# Stack: React Native (Expo), WatermelonDB, Supabase

---

## WHAT THIS IS

A standalone prototype with one purpose: prove that the
sync engine works under real Nigerian field conditions
before any ERP client depends on it.

This is NOT:
- A full ERP application
- A client-facing product
- A UI showcase
- Production code

This IS:
- A proven sync engine module
- A stress test harness
- A conflict resolution implementation
- The technical foundation every ERP build will run on

If the sync engine fails at prototype stage, the ERP
fails at client stage. Build it right here first.

---

## WHAT TO BUILD

### 1. LOCAL DATABASE (WatermelonDB + SQLite)

Define a minimal schema covering the three entity types
that matter most for conflict testing:

Products:
 id (UUID, client-generated)
 name
 sku
 quantity (current stock level)
 unit_price
 updated_at
 _status (WatermelonDB sync status)
 _changed (WatermelonDB change tracking)

Transactions:
 id (UUID, client-generated)
 product_id
 type ('IN' | 'OUT' | 'ADJUSTMENT')
 quantity
 amount
 reason
 baseline_stock (stock level at time of transaction)
 device_id
 created_at
 _status
 _changed

Sync Queue:
 id
 entity_type
 entity_id
 operation ('CREATE' | 'UPDATE' | 'DELETE')
 payload (JSON)
 baseline_version
 retry_count (default 0)
 last_attempt (Unix timestamp)
 created_at
 status ('PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED')

Sync Events (local, append-only):
 id
 entity_type
 entity_id
 operation
 payload (JSON)
 device_id
 client_timestamp (Unix)
 synced (boolean)
 conflict_resolved (boolean)
 created_at

---

### 2. SUPABASE SCHEMA (server-side)

Create a dedicated Supabase project for prototype testing.
Do not use the main OpenClaw Supabase project.

Server tables:

products:
 id UUID PRIMARY KEY
 name TEXT
 sku TEXT
 quantity INTEGER
 unit_price NUMERIC
 device_id TEXT
 client_timestamp TIMESTAMPTZ
 server_timestamp TIMESTAMPTZ DEFAULT NOW()
 updated_at TIMESTAMPTZ

transactions:
 id UUID PRIMARY KEY
 product_id UUID REFERENCES products(id)
 type TEXT CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT'))
 quantity INTEGER
 amount NUMERIC
 reason TEXT
 baseline_stock INTEGER
 device_id TEXT
 client_timestamp TIMESTAMPTZ
 server_timestamp TIMESTAMPTZ DEFAULT NOW()
 created_at TIMESTAMPTZ

sync_events:
 id UUID PRIMARY KEY DEFAULT gen_random_uuid()
 entity_type TEXT
 entity_id TEXT
 operation TEXT
 payload JSONB
 device_id TEXT
 client_timestamp TIMESTAMPTZ
 server_timestamp TIMESTAMPTZ DEFAULT NOW()
 synced BOOLEAN DEFAULT FALSE
 conflict_resolved BOOLEAN DEFAULT FALSE

registered_devices:
 id UUID PRIMARY KEY DEFAULT gen_random_uuid()
 user_id TEXT
 device_name TEXT
 device_fingerprint TEXT UNIQUE
 last_sync TIMESTAMPTZ
 created_at TIMESTAMPTZ DEFAULT NOW()

CREATE INDEX ON sync_events(entity_type, entity_id);
CREATE INDEX ON sync_events(device_id, synced);
CREATE INDEX ON sync_events(client_timestamp);

---

### 3. THE SYNC ENGINE (core module)

Build as a standalone TypeScript module:
src/sync/SyncEngine.ts

The engine has four functions:

FUNCTION 1: processQueue()
 Read all PENDING items from sync_queue
 Order: CREATE first, then UPDATE, then DELETE
 Within each type: chronological order
 For each item:
 Attempt to write to Supabase
 If success: mark COMPLETED, log to sync_events
 If failure: increment retry_count
 If retry_count >= 3: mark FAILED
 Else: mark PENDING, schedule retry with backoff
 Retry delays: 30s, 2min, 10min

FUNCTION 2: fetchServerChanges(lastSyncTimestamp)
 Fetch all sync_events from Supabase
 WHERE client_timestamp > lastSyncTimestamp
 Apply to local WatermelonDB in chronological order
 For each record: check for conflicts before applying

FUNCTION 3: resolveConflict(localRecord, serverRecord, entityType)
 Implement the full algorithm from the architecture doc:

 Step 1: Destructive conflict check
 If local deleted AND server updated: server wins
 If server deleted AND local updated: local wins

 Step 2: Inventory/financial semantic merge
 For entity types: inventory, transactions
 For fields: quantity, amount
 If change is additive (IN/OUT events):
 merged = server_value + (local_value - baseline)
 If change is overwrite (ADJUSTMENT):
 Flag for manual review
 Log to sync_events with conflict_resolved: false
 Notify test harness: "Conflict flagged"

 Step 3: Non-critical fields — last-write-wins
 Compare updated_at timestamps
 Winner's field values applied

FUNCTION 4: recoverFromOffline(deviceId, lastSyncTimestamp)
 Full recovery sequence from architecture doc:
 1. Fetch server changes since last sync
 2. Get local pending changes from sync_queue
 3. Sort by entity and timestamp
 4. Process each entity's changes in order
 5. Resolve conflicts where found
 6. Update last_sync in registered_devices

---

### 4. CONNECTIVITY DETECTION

Use NetInfo (React Native) to detect connectivity changes.

On connectivity change to ONLINE:
 Trigger recoverFromOffline()
 Then processQueue()
 Update last_sync timestamp

On connectivity change to OFFLINE:
 Set app to offline mode
 All writes go to local WatermelonDB only
 Queue all changes in sync_queue

Sync frequency when online: every 15 minutes
Plus: immediate sync on any critical write
 (transaction, inventory adjustment, payment)

---

### 5. TEST HARNESS (minimal UI)

Build only what is needed to run the stress tests.
This is not a client UI. It is a test control panel.

Screen 1: Device Setup
 - Device name input
 - Register device button
 - Shows device ID and last sync timestamp

Screen 2: Data Seeder
 - "Seed 50 products" button
 - "Seed 100 transactions" button
 - Shows current product count and transaction count

Screen 3: Sync Control Panel
 - Toggle: Simulate Offline / Online
 - "Force Sync Now" button
 - "Clear Local DB" button
 - Live sync status display:
 Queue depth, last sync time, conflicts count

Screen 4: Conflict Simulator
 - "Create Write Conflict" button
 (writes same record from two simulated devices
 with different values — triggers conflict resolution)
 - "Create Inventory Conflict" button
 (two devices both record stock-out for same SKU
 — tests semantic merge)
 - Conflict log: shows how each conflict was resolved

Screen 5: Results Log
 - Real-time log of all sync events
 - Shows: timestamp, entity, operation, status, duration
 - Highlights: conflicts, failures, retries

---

### 6. SUPABASE EDGE FUNCTION (optional but recommended)

If time allows, build a lightweight edge function that:
 - Receives batched sync payloads from devices
 - Validates permissions (device must be registered)
 - Applies changes to Postgres in transaction
 - Returns server-side changes since device's last sync
 - Handles rate limiting (max 10 concurrent sync jobs)

This is the correct architecture for production.
For the prototype, direct Supabase client calls are
acceptable if the edge function adds too much scope.
Flag this decision in the test results.

---

## STRESS TEST SCENARIOS

Clemenza must run all six scenarios and log results
before marking the prototype complete.

SCENARIO 1: Basic offline write and sync
 Set device offline
 Record 50 transactions
 Set device online
 Verify: all 50 transactions appear on server
 Verify: no duplicates
 Pass criteria: 100% sync success, <5 minutes

SCENARIO 2: Interrupted sync
 Start sync of 100 items
 Kill connectivity after 30 items synced
 Restore connectivity
 Verify: remaining 70 items sync correctly
 Verify: first 30 not duplicated
 Pass criteria: all 100 items on server exactly once

SCENARIO 3: Simultaneous writes from two devices
 Device A and Device B both offline
 Both record stock-out of same product
 Device A records: -10 units (baseline: 100)
 Device B records: -15 units (baseline: 100)
 Both come online and sync
 Expected result: 100 - 10 - 15 = 75 units
 (semantic merge, not last-write-wins)
 Pass criteria: quantity = 75, audit log shows both events

SCENARIO 4: Conflict — one device adjusts, one records sale
 Device A offline: ADJUSTMENT sets stock to 80
 Device B offline: records sale of 5 units (baseline: 100)
 Both sync
 Expected: ADJUSTMENT conflict flagged for manual review
 (ADJUSTMENT overrides are not auto-merged)
 Pass criteria: conflict flagged, human review prompted,
 data not silently corrupted

SCENARIO 5: Device storage pressure
 Fill sync_queue with 5,000 pending items
 Trigger sync
 Verify: batching works (500 per batch)
 Verify: progress updates appear
 Verify: all 5,000 items eventually sync
 Pass criteria: <1% failure rate, no data corruption

SCENARIO 6: Long offline period (simulated 48 hours)
 Device records 200 transactions over "48 hours"
 (simulate by seeding with timestamps across 48h range)
 Sync to server that has received 150 updates
 from other devices in the same period
 Verify: all 350 events correctly applied
 Verify: inventory state consistent across devices
 Pass criteria: final inventory matches manual calculation

---

## SUCCESS CRITERIA

Before Clemenza marks this prototype complete, all of
the following must be true:

Technical:
 [ ] Sync rate: <1% data loss across all six scenarios
 [ ] Sync time: <5 minutes for 50-100 transactions
 [ ] Conflict detection: fires on every genuine conflict
 [ ] Semantic merge: inventory counts correct after
 simultaneous writes in Scenario 3
 [ ] No data corruption on interrupted sync (Scenario 2)
 [ ] Idempotency: running the same sync twice produces
 the same result, not duplicates

Operational:
 [ ] Retry logic: failed items retry with backoff,
 marked FAILED after 3 attempts
 [ ] Storage pressure: 5,000 item queue processes
 in batches without timeout or corruption
 [ ] Recovery: device reconnecting after 48 hours of
 offline operation syncs correctly

Documentation:
 [ ] Test results logged in
 ~/Projects/erp/sync-prototype/test-results.md
 [ ] Every scenario: pass/fail, time taken, notes
 [ ] Any open questions or unresolved issues flagged
 [ ] Recommendation: ready for ERP build? Yes/No/Conditional
 [ ] If Conditional: what needs to change first?

---

## WHAT CLEMENZA DOES NOT BUILD

No inventory management UI
No POS interface
No product catalog management
No customer management
No reporting
No authentication beyond device registration
No WhatsApp integration
No payment integration
No multi-client isolation
No production security hardening

All of those belong to the ERP build proper.
This prototype proves one thing: data written offline
arrives on the server correctly when connectivity returns,
and conflicts are resolved without corrupting the record.

---

## DELIVERY

When prototype is complete:

1. Commit all code to GitHub repo:
 github.com/seunpayne/erp-sync-prototype

2. Save test results to:
 ~/Projects/erp/sync-prototype/test-results.md

3. Write session sync package for Michael to pass
 to Consigliere

4. Send Telegram message:
 "Sync engine prototype complete.
 [PASS/CONDITIONAL/FAIL]
 Key metric: [data loss rate]%
 Sync time for 100 transactions: [X] minutes
 Scenarios passed: [N]/6
 Full results: ~/Projects/erp/sync-prototype/test-results.md"

5. Flag any Conditional or Fail scenarios explicitly
 so Seun can review before the ERP build begins.

The ERP build does not start until the sync engine
prototype passes. This is non-negotiable.
