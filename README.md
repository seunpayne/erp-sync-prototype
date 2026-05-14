# Sync Engine Prototype - Web Version

Offline-first sync engine prototype for ERP, converted from React Native (Expo) to web-based React app.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Dexie.js** - IndexedDB wrapper (replaces WatermelonDB)
- **Supabase** - Backend database and sync server
- **Browser Network API** - Connectivity detection (replaces NetInfo)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

3. Run development server:
```bash
npm run web
```

The app will open at `http://localhost:8081`

## Features

### 5 Test Harness Screens

1. **Device Setup** - Register device for sync testing
2. **Data Seeder** - Seed mock products and transactions
3. **Sync Control Panel** - Toggle offline mode, force sync, clear DB
4. **Conflict Simulator** - Simulate write and inventory conflicts
5. **Results Log** - Real-time log of all sync events

### 4 Sync Functions

1. **processQueue()** - Process pending sync queue items
2. **fetchServerChanges()** - Fetch changes from Supabase
3. **resolveConflict()** - Resolve conflicts between local and server
4. **recoverFromOffline()** - Full recovery sequence after offline period

## Architecture

### Local Database (Dexie.js/IndexedDB)

Tables:
- `products` - Product inventory
- `transactions` - Stock movements
- `sync_queue` - Pending sync operations
- `sync_events` - Sync audit log
- `devices` - Registered devices

### Sync Engine

- Queue-based sync with retry logic (3 attempts, exponential backoff)
- Conflict resolution with semantic merge for inventory
- Offline-first design with automatic recovery

## Stress Test Scenarios

See `BUILD_BRIEF.md` for the 6 stress test scenarios:

1. Basic offline write and sync
2. Interrupted sync
3. Simultaneous writes from two devices
4. Conflict - adjustment vs sale
5. Device storage pressure (5,000 items)
6. Long offline period (48 hours)

## Success Criteria

- Sync rate: <1% data loss
- Sync time: <5 minutes for 100 transactions
- Conflict detection on every genuine conflict
- Semantic merge for inventory counts
- No data corruption on interrupted sync
- Idempotency: same result on repeated syncs

## Build for Production

```bash
npm run build
```

Output in `dist/` folder.

## License

MIT
