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
