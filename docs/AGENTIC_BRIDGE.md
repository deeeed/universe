# CDP Agentic Feedback Loop — Implementation Guide

A framework for agents (Claude Code or any script) to inspect and control a running
Expo app over the Chrome DevTools Protocol — no test framework required.

**Reference implementations:**
- `examples/designdemo/` — this repo (port 7765)
- `apps/playground/` — expo-audio-stream repo (port 7365)

---

## What it provides

| Capability | Command |
|------------|---------|
| List connected devices (iOS, Android, Web) | `yarn devices` |
| Get current route | `scripts/agentic/app-state.sh route` |
| Navigate to a route | `scripts/agentic/app-navigate.sh "/(tabs)/foo"` |
| Evaluate JS in the app | `scripts/agentic/app-state.sh eval "expr"` |
| Take a screenshot | `scripts/agentic/screenshot.sh [label]` |
| Read native logs | `scripts/agentic/native-logs.sh android\|ios [N]` |
| Reload JS bundle | `yarn reload` |
| Wake backgrounded apps | `yarn wake` |
| Start Metro agentically | `yarn start` |
| Launch web with browser | `yarn web` |

All commands support `--device <name>` for multi-device targeting.

---

## Adding to a new Expo app

### 1. Copy scripts

Copy `examples/designdemo/scripts/agentic/` into your app:

```
scripts/agentic/
  cdp-bridge.mjs        # Unified CDP entry point (iOS + Android + Web)
  web-browser.mjs       # Playwright browser lifecycle manager (Web only)
  start-metro.sh        # Start Metro agentically, write PID/log to .agent/
  reload-metro.sh       # Reload JS bundle on all connected devices
  app-navigate.sh       # Navigate to a route
  app-state.sh          # Query route / state / eval
  screenshot.sh         # Take screenshots per platform
  native-logs.sh        # Read Android logcat / iOS simulator logs
  wake-devices.sh       # Deeplink to foreground backgrounded apps
  device-cmd.sh         # Send reload/debug/dev-menu commands
```

### 2. Set app-specific values

**`cdp-bridge.mjs` line ~48** — change the default port:
```js
const DEFAULT_PORT = 7765;  // your Metro port
```

**`start-metro.sh` line ~15** — same port:
```bash
PORT="${WATCHER_PORT:-7765}"
```

**`web-browser.mjs` line ~50** — same port:
```js
const PORT = Number.parseInt(process.env.WATCHER_PORT || '7765', 10);
```

**`wake-devices.sh` line ~18** — your app's URI scheme and bundle ID:
```bash
SCHEME="${APP_SCHEME:-yourscheme}"
BUNDLE_ID="${APP_BUNDLE_ID:-com.example.yourapp}"
```

### 3. Install `playwright` (for web support)

```bash
yarn add -D @playwright/test
npx playwright install chromium
```

### 4. Create `src/agentic-bridge.ts`

```ts
import { Platform } from 'react-native'
import { router } from 'expo-router'

let _uiState: Record<string, unknown> = {}
let _routeInfo: { pathname: string; segments: string[] } = {
  pathname: '',
  segments: [],
}

export function setAgenticUIState(state: Record<string, unknown>) {
  _uiState = state
}

export function setAgenticRouteInfo(pathname: string, segments: string[]) {
  _routeInfo = { pathname, segments }
}

if (__DEV__) {
  ;(globalThis as Record<string, unknown>).__AGENTIC__ = {
    platform: Platform.OS,
    navigate: (path: string) => {
      try { router.push(path as never); return true }
      catch (e) { return { error: String(e) } }
    },
    getRoute: () => _routeInfo,
    getState: () => _uiState,
    canGoBack: () => router.canGoBack(),
    goBack: () => { router.back(); return true },
  }
}
```

### 5. Create `src/components/AgenticBridgeSync.tsx`

Invisible component that syncs route state into the bridge on every navigation:

```tsx
import { usePathname, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { setAgenticRouteInfo } from '../agentic-bridge'

export function AgenticBridgeSync() {
  if (!__DEV__) return null
  return <AgenticBridgeSyncInner />
}

function AgenticBridgeSyncInner() {
  const pathname = usePathname()
  const segments = useSegments()

  useEffect(() => {
    setAgenticRouteInfo(pathname, segments)
  }, [pathname, segments])

  return null
}
```

### 6. Wire into `src/app/_layout.tsx`

```tsx
import { AgenticBridgeSync } from '../components/AgenticBridgeSync'

if (__DEV__) {
  require('../agentic-bridge')
}

export default function RootLayout() {
  return (
    <YourProviders>
      <Stack>...</Stack>
      <AgenticBridgeSync />
    </YourProviders>
  )
}
```

### 7. Add scripts to `package.json`

```json
"start":   "NODE_ENV=development bash scripts/agentic/start-metro.sh && tail -f .agent/metro.log",
"web":     "NODE_ENV=development bash scripts/agentic/start-metro.sh && node scripts/agentic/web-browser.mjs launch",
"devices": "node scripts/agentic/cdp-bridge.mjs list-devices",
"reload":  "bash scripts/agentic/reload-metro.sh",
"wake":    "bash scripts/agentic/wake-devices.sh"
```

---

## Known gotchas

### `--device web` was slow without a fast-path
If native builds don't have `__AGENTIC__` (e.g. release builds, or devices that are
connected to Metro but not actively running the app), native probes time out — 6
candidates × 5 retries × 2 s = 60 s before web discovery was ever reached.

**Fix already applied in `cdp-bridge.mjs`**: when `--device web` is passed,
native discovery is skipped entirely and `discoverWebTargets` is called directly.

### `list-devices` didn't show the web device
The `list-devices` command only queried Metro's native `/json/list`. Web device is
now also discovered via `.agent/web-browser.json`.

### Backgrounded apps don't respond to CDP
Metro keeps a device registered in `/json/list` even when the app is backgrounded,
but the JS runtime stops responding. Use `yarn wake` to deeplink the app back to
the foreground before running commands.

### `IOS_SIMULATOR` env var overrides auto-detection
If `IOS_SIMULATOR` is set in your shell environment (e.g. from `~/.zshenv`),
`native-logs.sh` uses it as the simulator name instead of auto-detecting the
booted simulator. Remove it if you want auto-detection, or pass `--device <name>`
explicitly.

### Chrome CDP port conflict
If another app already has Chrome open with `--remote-debugging-port=9222`, the
web browser launch will fail. Set `CDP_PORT=9223` (or any free port) in your
environment before running `yarn web`.

---

## Verification

After setup, run from your app directory:

```bash
# Start Metro
yarn start

# Open app on device(s), then wake if needed
yarn wake

# Confirm all devices visible
yarn devices

# Navigate and screenshot on each platform
scripts/agentic/app-navigate.sh --device iPhone "/(tabs)/try"
scripts/agentic/screenshot.sh --device iPhone baseline

scripts/agentic/app-navigate.sh --device Pixel "/(tabs)/try"
scripts/agentic/screenshot.sh --device Pixel baseline

# Web (requires yarn web to be running)
scripts/agentic/app-navigate.sh --device web "/(tabs)/try"
scripts/agentic/screenshot.sh --device web baseline

# Reload all platforms at once
yarn reload

# Read native logs
scripts/agentic/native-logs.sh android 20
scripts/agentic/native-logs.sh ios 20
```
